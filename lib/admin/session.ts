import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";

/**
 * هسته‌ی رمزنگاریِ ورود پنل مدیریت — بدون هیچ وابستگی به Next.
 *
 * چرا این فایل از app/ و از next/headers جداست؟
 *     proxy.ts (همان چیزی که قبلاً middleware نام داشت) باید بتواند توکن را
 *     بررسی کند. اگر منطق امضا داخل ماژولی بود که next/headers یا کامپوننت
 *     ایمپورت می‌کند، proxy مجبور می‌شد نصفِ درختِ اپ را با خودش بالا بیاورد.
 *     پس اینجا فقط node:crypto است: هم proxy می‌تواند ایمپورتش کند، هم
 *     Server Action، هم اسکریپتِ خط فرمان.
 *
 * ── مدلِ امنیتی، صریح ──
 * یک مدیر وجود دارد، نه جدولِ کاربران. رمز هیچ‌جا — نه در کد، نه در دیتابیس —
 * به‌صورت خام ذخیره نمی‌شود؛ تنها چیزی که وجود دارد یک هشِ scrypt در متغیر
 * محیطی است. نشست هم بی‌حالت (stateless) است: یک توکنِ امضاشده با HMAC که در
 * کوکیِ httpOnly می‌نشیند. یعنی دیتابیس در مسیرِ ورود هیچ نقشی ندارد و قطعیِ
 * دیتابیس، مدیر را بیرون نمی‌اندازد.
 *
 * ⚠️ آنچه این مدل *نمی‌دهد*: چند کاربر، نقش، فراموشی رمز، و باطل‌کردنِ یک
 *    نشستِ خاص از راه دور. برای همه‌ی این‌ها جدول لازم است. اگر روزی لازم شد،
 *    نقطه‌ی تغییر همین فایل است و بیرونش (requireAdmin) دست نمی‌خورد.
 */

/**
 * نسخه‌ی Promise-ای scrypt.
 *
 * چرا دستی و نه promisify؟
 *     scrypt در Node دو امضا دارد: با و بدون آبجکتِ options. تعریفِ تایپیِ
 *     promisify هنگام سربارگذاری (overload) فقط یکی را برمی‌دارد و نتیجه این
 *     می‌شود که TypeScript فراخوانیِ چهارآرگومانیِ درست را رد می‌کند
 *     («Expected 3 arguments, but got 4»). این ده خط، هم تایپ را دقیق می‌کند و
 *     هم خروجی را واقعاً Buffer می‌داند، پس دیگر جایی «as Buffer» لازم نیست.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** نام کوکیِ نشست. پیشوند دارد تا با کوکی‌های احتمالیِ دیگرِ دامنه قاطی نشود. */
export const SESSION_COOKIE = "promptesh_admin_session";

/**
 * عمرِ نشست: ۱۲ ساعت.
 *
 * سنجه‌ی انتخاب: این پنل روی یک لپ‌تاپِ شخصی باز می‌شود، نه روی دستگاهِ
 * مشترک. ۷ روزه یعنی یک لپ‌تاپِ گم‌شده هفت روز دسترسیِ نوشتن دارد؛ ۱ ساعته
 * یعنی وسطِ کارِ آپلودِ محتوا از سیستم بیرون بیفتی. ۱۲ ساعت یک روزِ کاری است.
 */
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

/** پارامترهای scrypt. اعدادِ توصیه‌شده‌ی خودِ Node برای استفاده‌ی تعاملی. */
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_SALT_BYTES = 16;

/** حداقل طولِ کلیدِ امضا. کوتاه‌تر از این، HMAC عملاً قابلِ حدس‌زدن می‌شود. */
const MIN_SECRET_LENGTH = 32;

/** نسخه‌ی قالبِ توکن. اگر ساختار عوض شد، این عدد بالا می‌رود و توکن‌های قدیمی رد می‌شوند. */
const TOKEN_VERSION = 1;

/**
 * خطای تنظیمات — دقیقاً به تقلید از DatabaseConfigError در lib/db.ts، تا صفحه
 * بتواند «هنوز راه‌اندازی نشده» را از «رمز غلط زدی» جدا نشان دهد. این دو پیامِ
 * کاملاً متفاوت‌اند و قاطی‌کردنشان کاربر را سرگردان می‌کند.
 */
export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

/** بررسی name هم می‌شود تا اگر خطا از مرزِ سریالایز رد شد و instanceof را از دست داد، باز تشخیص داده شود. */
export function isAdminConfigError(err: unknown): boolean {
  return (
    err instanceof AdminConfigError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { name?: string }).name === "AdminConfigError")
  );
}

// ---------------------------------------------------------------------------
// خواندنِ متغیرهای محیطی
// ---------------------------------------------------------------------------

function readPasswordHash(): string {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!raw) {
    throw new AdminConfigError(
      "متغیر ADMIN_PASSWORD_HASH تنظیم نشده است. با دستور «node scripts/hash-password.mjs» " +
        "یک هش بساز و در .env.local بگذار، سپس سرور را ری‌استارت کن."
    );
  }
  if (!raw.startsWith("scrypt$")) {
    throw new AdminConfigError(
      "مقدار ADMIN_PASSWORD_HASH قالبِ درستی ندارد؛ باید با «scrypt$» شروع شود. " +
        "احتمالاً رمزِ خام را آنجا گذاشته‌ای — با «node scripts/hash-password.mjs» هشِ درست را بساز."
    );
  }
  return raw;
}

function readSessionSecret(): string {
  const raw = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!raw) {
    throw new AdminConfigError(
      "متغیر ADMIN_SESSION_SECRET تنظیم نشده است. با دستور «node scripts/hash-password.mjs» " +
        "یک کلیدِ تصادفی بساز و در .env.local بگذار."
    );
  }
  if (raw.length < MIN_SECRET_LENGTH) {
    throw new AdminConfigError(
      `مقدار ADMIN_SESSION_SECRET کوتاه است (${raw.length} کاراکتر). حداقل ${MIN_SECRET_LENGTH} کاراکتر لازم است.`
    );
  }
  return raw;
}

/**
 * آیا ورود قابلِ استفاده است؟ (بدون پرتاب‌کردنِ خطا)
 *
 * صفحه‌ی ورود با این تصمیم می‌گیرد فرم را نشان دهد یا راهنمای راه‌اندازی را.
 * بدون این، اولین بازدید از /admin روی یک نصبِ تازه یک خطای ۵۰۰ خام می‌داد.
 */
export function isAdminConfigured(): boolean {
  try {
    readPasswordHash();
    readSessionSecret();
    return true;
  } catch {
    return false;
  }
}

/**
 * متنِ راهنمای قابل‌نمایش برای نصب. هیچ مقدار محرمانه‌ای برنمی‌گرداند؛ فقط
 * نبودن، قالبِ نادرست یا کوتاهیِ کلید را توضیح می‌دهد.
 */
export function adminConfigurationIssue(): string | null {
  try {
    readPasswordHash();
    readSessionSecret();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "تنظیمات پنل خوانده نشد.";
  }
}

/** همان بررسی، ولی با خطای توضیح‌دار. برای جایی که می‌خواهیم پیام را نشان دهیم. */
export function assertAdminConfigured(): void {
  readPasswordHash();
  readSessionSecret();
}

// ---------------------------------------------------------------------------
// رمز عبور
// ---------------------------------------------------------------------------

/** قالبِ ذخیره: scrypt$N$r$p$saltB64url$keyB64url */
function parseHash(stored: string): { n: number; r: number; p: number; salt: Buffer; key: Buffer } {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    throw new AdminConfigError(
      "قالبِ ADMIN_PASSWORD_HASH خراب است. هش را دوباره با «node scripts/hash-password.mjs» بساز."
    );
  }

  const n = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    throw new AdminConfigError("پارامترهای عددیِ ADMIN_PASSWORD_HASH خوانده نشدند. هش را دوباره بساز.");
  }

  return {
    n,
    r,
    p,
    salt: Buffer.from(parts[4], "base64url"),
    key: Buffer.from(parts[5], "base64url"),
  };
}

/**
 * ساختِ هشِ یک رمزِ خام. فقط اسکریپتِ خط فرمان از این استفاده می‌کند — اپ
 * هیچ‌وقت رمز نمی‌سازد، چون مسیرِ «ثبت‌نام» وجود ندارد.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const key = await scrypt(plain.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/**
 * بررسیِ رمزِ واردشده.
 *
 * دو نکته که عمداً این‌طورند:
 *
 *  • normalize("NFKC") — رمزِ فارسی می‌تواند به دو صورتِ یونیکدیِ متفاوت اما
 *    ظاهراً یکسان تایپ شود (مثلاً «ی» عربی و فارسی). بدون یکسان‌سازی، کاربر
 *    رمزِ درست را می‌زند و رد می‌شود، بدون هیچ سرنخی. همان نرمال‌سازی در
 *    hashPassword هم هست، پس دو طرف قطعاً یکی‌اند.
 *
 *  • timingSafeEqual — مقایسه‌ی معمولیِ === به‌محضِ رسیدن به اولین بایتِ
 *    نامساوی برمی‌گردد، و همان تفاوتِ زمانی به مهاجم می‌گوید چند بایتِ اولش
 *    درست بوده. مقایسه‌ی زمان‌ثابت این کانالِ نشتی را می‌بندد.
 */
export async function verifyPassword(plain: string): Promise<boolean> {
  const stored = readPasswordHash();
  const { n, r, p, salt, key } = parseHash(stored);

  const candidate = await scrypt(plain.normalize("NFKC"), salt, key.length, {
    N: n,
    r,
    p,
  });

  // timingSafeEqual با طولِ نامساوی خطا پرتاب می‌کند، پس اول طول را می‌سنجیم.
  // خودِ طولِ هش راز نیست (در قالبِ ذخیره پیداست)، پس این مقایسه نشتی ندارد.
  if (candidate.length !== key.length) return false;
  return timingSafeEqual(candidate, key);
}

// ---------------------------------------------------------------------------
// توکنِ نشست
// ---------------------------------------------------------------------------

type SessionPayload = {
  /** نسخه‌ی قالب */
  v: number;
  /** زمانِ صدور، ثانیه‌ی یونیکس */
  iat: number;
  /** زمانِ انقضا، ثانیه‌ی یونیکس */
  exp: number;
  /**
   * اثرِانگشتِ رمزِ فعلی. با عوض‌شدنِ رمز، این عوض می‌شود و همه‌ی توکن‌های
   * صادرشده یک‌جا باطل می‌شوند. بدون این، عوض‌کردنِ رمزِ لو‌رفته هیچ اثری روی
   * مهاجمی که از قبل کوکیِ معتبر دارد نداشت — و «رمز را عوض کردم» یک آرامشِ
   * دروغین می‌شد.
   */
  pv: string;
};

function passwordFingerprint(): string {
  // هشِ هش. خودِ ADMIN_PASSWORD_HASH داخلِ توکن نمی‌رود؛ توکن سمتِ کلاینت است.
  return createHash("sha256").update(readPasswordHash()).digest("base64url").slice(0, 16);
}

function sign(data: string): string {
  return createHmac("sha256", readSessionSecret()).update(data).digest("base64url");
}

/** صدورِ توکنِ نشست. فقط بعد از verifyPassword موفق صدا زده می‌شود. */
export function createSessionToken(now: number = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    v: TOKEN_VERSION,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
    pv: passwordFingerprint(),
  };

  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/**
 * بررسیِ توکن و برگرداندنِ محتوایش. در هر حالتِ مشکوک null برمی‌گرداند — از جمله
 * وقتی تنظیمات ناقص است. یعنی نبودِ ADMIN_SESSION_SECRET درِ پنل را باز
 * نمی‌گذارد، می‌بندد. (fail closed؛ خلافش یک آسیب‌پذیریِ کلاسیک است.)
 *
 * ⚠️ این تنها جایی است که توکن تأیید می‌شود. اگر جای دیگری به محتوای توکن
 *    احتیاج شد، از همین تابع بگیر و منطقِ بررسی را دوباره پیاده نکن — دو
 *    پیاده‌سازیِ موازیِ بررسیِ امضا دقیقاً همان‌جایی است که این‌طور باگ‌ها
 *    زندگی می‌کنند.
 */
function readVerifiedPayload(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    // AdminConfigError — تنظیمات ناقص است. دسترسی داده نمی‌شود.
    return null;
  }

  // اول امضا، بعد پارس. ترتیبش مهم است: JSON.parse روی دادهٔ تأییدنشده یعنی
  // پارسر را در معرضِ ورودیِ دلخواهِ مهاجم گذاشتن.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  if (payload?.v !== TOKEN_VERSION) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;

  try {
    if (payload.pv !== passwordFingerprint()) return null;
  } catch {
    return null;
  }

  return payload;
}

/** آیا این توکن معتبر است؟ تنها سؤالی که مسیرِ دربانی می‌پرسد. */
export function verifySessionToken(token: string | undefined | null): boolean {
  return readVerifiedPayload(token) !== null;
}

/**
 * زمانِ انقضای نشست به میلی‌ثانیه، یا null اگر توکن نامعتبر باشد.
 *
 * فقط برای نمایش در «اطلاعات حساب مدیر» است. عمداً از همان تابعِ تأییدشده
 * می‌خواند تا نشود با یک توکنِ جعلی یک زمانِ دلخواه روی صفحه نشاند.
 */
export function readSessionExpiry(token: string | undefined | null): number | null {
  const payload = readVerifiedPayload(token);
  return payload ? payload.exp * 1000 : null;
}
