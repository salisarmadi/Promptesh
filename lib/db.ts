import { Pool, type PoolConfig, type QueryResultRow } from "pg";

/**
 * لایه اتصال دیتابیس — Postgres روی Liara.
 *
 * قواعد طراحی این فایل:
 *
 *  ۱. تنها منبع تنظیمات، متغیر محیطی DATABASE_URL است. برای وصل‌شدن به
 *     دیتابیس واقعی فقط .env.local عوض می‌شود و سرور ری‌استارت — هیچ خطی
 *     از کد لازم نیست تغییر کند.
 *
 *  ۲. ساخت pool «تنبل» (lazy) است و در زمان ایمپورت اتفاق نمی‌افتد. اگر
 *     DATABASE_URL غایب یا placeholder باشد، فقط همان صفحه‌ای که واقعاً
 *     کوئری می‌زند خطا می‌دهد، نه کل بیلد و نه صفحاتی که به دیتابیس کاری
 *     ندارند.
 *
 *  ۳. در حالت توسعه، pool روی globalThis کش می‌شود. بدون این کار هر بار که
 *     Next ماژول را hot-reload کند یک pool تازه ساخته می‌شود و کانکشن‌های
 *     قبلی باز می‌مانند تا سقف کانکشن دیتابیس پر شود.
 *
 * ⚠️ این ماژول فقط سمت سرور استفاده شود (Server Component، Route Handler،
 *    Server Action یا اسکریپت Node). ایمپورت آن در یک Client Component
 *    باعث خطای بیلد می‌شود، چون pg به ماژول‌های داخلی Node نیاز دارد.
 */

/** مقدار placeholder داخل .env.local — نباید به‌عنوان مقدار واقعی پذیرفته شود. */
const PLACEHOLDER_PATTERN = /@host:port\//i;
const PLACEHOLDER_HOSTNAMES = new Set(["host", "hostname", "your-host", "example.com"]);

/** خطای تنظیمات — جدا از خطاهای شبکه/SQL تا پیام مناسب به کاربر نشان دهیم. */
export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

/**
 * آیا این خطا به‌خاطر تنظیم‌نشدن یا placeholder بودن DATABASE_URL است؟
 * (بررسی name هم هست تا اگر خطا از مرز سریالایز رد شده و instanceof را از دست
 * داده باز هم درست تشخیص داده شود.)
 */
export function isDatabaseConfigError(err: unknown): boolean {
  return (
    err instanceof DatabaseConfigError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "DatabaseConfigError")
  );
}

/** کد خطای «جدول وجود ندارد» در Postgres (۴۲P۰۱)؛ یعنی هنوز schema.sql اجرا نشده. */
export function isUndefinedTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "42P01"
  );
}

/**
 * تعیین تنظیمات SSL.
 *
 * دیتابیس‌های مدیریت‌شده (از جمله Liara) معمولاً گواهی امضاشده توسط CA
 * داخلی خودشان دارند، که اعتبارسنجی سخت‌گیرانه را رد می‌کند. پس:
 *   - sslmode=disable            → کلاً بدون SSL
 *   - sslmode=verify-ca|verify-full → اعتبارسنجی کامل گواهی (سخت‌گیرانه)
 *   - هر sslmode دیگر            → SSL روشن، بدون اعتبارسنجی گواهی
 *   - بدون sslmode و هاست محلی   → بدون SSL
 *   - بدون sslmode و هاست ریموت  → SSL روشن، بدون اعتبارسنجی گواهی
 *
 * نکته امنیتی: حالت «بدون اعتبارسنجی» ترافیک را رمز می‌کند ولی جلوی حمله
 * MITM را نمی‌گیرد. اگر Liara گواهی CA در اختیارت گذاشت، بهترین کار این است
 * که sslmode=verify-full بگذاری و ca را اینجا پاس بدهی.
 */
function resolveSsl(url: URL): PoolConfig["ssl"] {
  const sslmode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
  const host = url.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (sslmode === "disable") return false;
  if (sslmode === "verify-ca" || sslmode === "verify-full") return { rejectUnauthorized: true };
  if (sslmode !== "") return { rejectUnauthorized: false };

  return isLocal ? false : { rejectUnauthorized: false };
}

function buildPoolConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL?.trim();

  if (!raw) {
    throw new DatabaseConfigError(
      "متغیر DATABASE_URL تنظیم نشده است. یک فایل .env.local بساز (از .env.example کپی کن)، " +
        "رشته اتصال Postgres را داخلش بگذار و سرور را ری‌استارت کن."
    );
  }

  // این چک باید قبل از new URL() باشد: مقدار placeholder به‌خاطر «port» که عدد
  // نیست حتی قابل پارس نیست، و پیام خطای خام آن گمراه‌کننده است.
  if (PLACEHOLDER_PATTERN.test(raw)) {
    throw new DatabaseConfigError(
      "مقدار DATABASE_URL هنوز همان placeholder اولیه است. رشته اتصال واقعی را از پنل Liara " +
        "(دیتابیس Postgres → بخش اتصال) کپی کن، در .env.local جایگزین کن و سرور را ری‌استارت کن."
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DatabaseConfigError(
      "مقدار DATABASE_URL یک URL معتبر نیست. فرمت درست: " +
        "postgres://USER:PASSWORD@HOST:PORT/DATABASE — اگر رمز عبور کاراکتر خاص دارد " +
        "(مثل @ یا #) باید URL-encode شود."
    );
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new DatabaseConfigError(
      `پروتکل «${url.protocol}» برای DATABASE_URL پشتیبانی نمی‌شود؛ باید postgres:// یا postgresql:// باشد.`
    );
  }

  if (PLACEHOLDER_HOSTNAMES.has(url.hostname)) {
    throw new DatabaseConfigError(
      `هاست «${url.hostname}» یک مقدار نمونه است، نه یک هاست واقعی. رشته اتصال Liara را در .env.local بگذار.`
    );
  }

  const ssl = resolveSsl(url);

  // sslmode را از رشته اتصال حذف می‌کنیم تا pg خودش دوباره تفسیرش نکند؛
  // این‌طور تنها مرجع تصمیم‌گیری برای SSL همان resolveSsl بالا است.
  url.searchParams.delete("sslmode");

  const maxRaw = process.env.DATABASE_POOL_MAX?.trim();
  const maxParsed = maxRaw ? Number.parseInt(maxRaw, 10) : Number.NaN;
  const max = Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : 10;

  return {
    connectionString: url.toString(),
    ssl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // نام برنامه در لاگ‌های Postgres — برای دیباگ روی Liara کمک می‌کند.
    application_name: "prompt-gallery",
  };
}

function createPool(): Pool {
  const pool = new Pool(buildPoolConfig());

  // کلاینت‌های بیکار ممکن است به‌خاطر ری‌استارت دیتابیس یا قطعی شبکه خطا بدهند.
  // این رویداد اگر شنونده نداشته باشد پراسس Node را از پا می‌اندازد.
  pool.on("error", (err) => {
    console.error("[db] خطای غیرمنتظره روی کلاینت بیکار در pool:", err.message);
  });

  return pool;
}

/**
 * در dev، Next ماژول‌ها را با هر تغییر فایل دوباره ارزیابی می‌کند. کش‌کردن روی
 * globalThis باعث می‌شود همان pool قبلی دوباره استفاده شود.
 */
const globalForDb = globalThis as unknown as { __promptGalleryPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.__promptGalleryPool) {
    globalForDb.__promptGalleryPool = createPool();
  }
  return globalForDb.__promptGalleryPool;
}

/**
 * اجرای یک کوئری و گرفتن ردیف‌ها.
 *
 * همیشه از پارامتر ($1، $2، ...) استفاده کن و هرگز مقادیر را داخل رشته SQL
 * الحاق نکن — این تنها راه جلوگیری از SQL injection است.
 *
 * @example
 * const rows = await query<{ id: number; title_fa: string }>(
 *   "SELECT id, title_fa FROM images WHERE category_id = $1",
 *   [categoryId]
 * );
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<T[]> {
  const result = await getPool().query<T>(text, params ? Array.from(params) : undefined);
  return result.rows;
}

/**
 * اجرای چند کوئری داخل یک تراکنش. اگر callback خطا بدهد rollback می‌شود.
 * برای seed و عملیات چندمرحله‌ای (مثل تایید یک pending_prompt) لازم است.
 */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // برگرداندن کلاینت به pool — نه بستن آن.
    client.release();
  }
}

/**
 * بستن pool. فقط در اسکریپت‌های یک‌بار‌مصرف (مثل seed) لازم است تا پراسس
 * Node تمام شود؛ در خود اپ Next هیچ‌وقت صدا زده نمی‌شود.
 */
export async function closePool(): Promise<void> {
  const pool = globalForDb.__promptGalleryPool;
  if (pool) {
    globalForDb.__promptGalleryPool = undefined;
    await pool.end();
  }
}
