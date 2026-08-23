#!/usr/bin/env node
/**
 * ===========================================================================
 *  وارد کردن محتوای واقعی از CSV به دیتابیس گالری
 * ===========================================================================
 *
 *  چرا اسکریپت جدا و نه SQL؟ چون CSV نیاز به اعتبارسنجی ردیف‌به‌ردیف دارد و
 *  ردیف خراب باید رد شود، نه اینکه کل import را بخواباند.
 *
 *  عمداً هیچ پکیجی نصب نمی‌کند: پارسر CSV و خواندن .env.local اینجا نوشته
 *  شده‌اند و تنها وابستگی، `pg` است که از قبل در پروژه هست.
 *
 *  --------------------------------------------------------------------------
 *  اجرا (سه مرحله، به همین ترتیب)
 *  --------------------------------------------------------------------------
 *    ۱) پیش‌نمایش ۵ ردیف اول — به دیتابیس دست نمی‌زند و حتی به آن وصل نمی‌شود:
 *         node scripts/import-content.mjs --dry-run --limit=5
 *
 *    ۲) وارد کردن واقعی همان ۵ ردیف، با پاک‌کردن داده‌های placeholder قبلی:
 *         node scripts/import-content.mjs --reset --limit=5
 *
 *    ۳) وارد کردن کل فایل (باز هم با --reset تا ۵ ردیف مرحله ۲ دوباره نیاید):
 *         node scripts/import-content.mjs --reset
 *
 *  --------------------------------------------------------------------------
 *  گزینه‌ها
 *  --------------------------------------------------------------------------
 *    --file=PATH        مسیر CSV (پیش‌فرض: ./prompts_index_with_titles_2.csv)
 *    --limit=N          فقط N ردیف اول
 *    --dry-run          فقط اعتبارسنجی و گزارش؛ هیچ نوشتنی در دیتابیس
 *    --reset            پاک‌کردن categories/images/prompts/image_categories
 *                       پیش از وارد کردن (داده‌های تستی placeholder را می‌برد)
 *    --model="NAME"     مقدار images.model_used — این CSV ستون مدل ندارد، پس
 *                       بدون این گزینه NULL می‌ماند
 *    --url-prefix=P     پیشوند آدرس تصویر (پیش‌فرض: /gallery/)
 *    --skipped=PATH     مسیر لاگ ردیف‌های ردشده (پیش‌فرض: ./skipped-rows.csv)
 * ===========================================================================
 */

import { readFile, writeFile, open } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** گیومه‌های دور مقدار آرگومان را برمی‌دارد (ویندوز اغلب نگهشان می‌دارد). */
const stripQuotes = (s) => s.replace(/^["']|["']$/g, "");

// ---------------------------------------------------------------------------
// تاکسونومی — تنها منبع حقیقتِ نگاشت «نام فارسی → slug»
// ---------------------------------------------------------------------------
// ترتیب این آرایه = ترتیب id در جدول categories = ترتیب تب‌ها در سایت
// (getCategories با ORDER BY c.id می‌خواند). بر اساس حجم محتوا مرتب شده و
// «سایر» آخر است.
//
// slug باید با قید دیتابیس بخواند: ^[a-z0-9]+(-[a-z0-9]+)*$
//
// نام‌های فارسی را دست‌نخورده و با همان نگارشِ فایل CSV می‌نویسیم؛ تطبیق از
// طریق normalizeFa انجام می‌شود، پس نیم‌فاصله و ی/ک عربی مشکلی ایجاد نمی‌کند.
const TAXONOMY = [
  { slug: "portrait", name_fa: "پرتره / سلفی" },
  { slug: "fashion", name_fa: "مد و فشن (ادیتوریال)" },
  { slug: "product", name_fa: "محصول / لایف‌استایل" },
  { slug: "beach", name_fa: "دریا / ساحل" },
  { slug: "couple", name_fa: "زوج / عاشقانه" },
  { slug: "nature", name_fa: "منظره / طبیعت" },
  { slug: "architecture", name_fa: "معماری / فضای داخلی" },
  { slug: "neon", name_fa: "شب / نئون / سینمایی" },
  { slug: "animals", name_fa: "حیوانات" },
  { slug: "group", name_fa: "گروهی / دوستان" },
  { slug: "other", name_fa: "سایر" },
];

// نام ستون‌های موردانتظار. تطبیق با نام انجام می‌شود و اگر پیدا نشد، به همین
// شماره ستون برمی‌گردیم (پس تغییر نام هدر، اسکریپت را نمی‌شکند).
const COLUMNS = {
  row: { name: "ردیف", fallbackIndex: 0 },
  link: { name: "تصویر", fallbackIndex: 1 },
  date: { name: "تاریخ", fallbackIndex: 2 },
  cats: { name: "دسته‌بندی‌ها", fallbackIndex: 3 },
  prompt: { name: "متن پرامپت", fallbackIndex: 4 },
  file: { name: "نام فایل تصویر", fallbackIndex: 5 },
  title: { name: "عنوان تصویر", fallbackIndex: 6 },
};

// ---------------------------------------------------------------------------
// ابزارهای متن
// ---------------------------------------------------------------------------

/**
 * یکسان‌سازی متن فارسی برای «تطبیق» (نه برای ذخیره‌سازی).
 *
 * چرا لازم است: یک نام مثل «محصول / لایف‌استایل» ممکن است با نیم‌فاصله یا
 * بدون آن، با ی فارسی یا ي عربی، یا با فاصله‌های اضافه نوشته شود. بدون این
 * تابع، ردیف‌های سالم به‌اشتباه «دسته‌بندی نامعتبر» شناخته می‌شدند.
 */
function normalizeFa(value) {
  return String(value ?? "")
    // نویسه‌های نامرئی: ZWSP، نیم‌فاصله (U+200C)، ZWJ، علامت‌های جهت‌نما، BOM.
    // با \u نوشته شده‌اند نه خودِ نویسه، چون نویسه‌ی نامرئی در سورس عملاً
    // غیرقابل‌بازبینی است و با کپی‌پیست از بین می‌رود.
    .replace(/[​-‏‪-‮﻿]/g, "")
    .replace(/ي/g, "ی") // ي عربی → ی فارسی
    .replace(/ك/g, "ک") // ك عربی → ک فارسی
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // ٠١٢ → 012
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // ۰۱۲ → 012
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const isBlank = (v) => String(v ?? "").trim() === "";

/**
 * تاریخ ستون «تاریخ» را به Date تبدیل می‌کند.
 *
 * فرمت فایل: «05.07.2026 17:43:15» یعنی روز.ماه.سال — نه ماه.روز.سال.
 * چرا دستی پارس می‌کنیم و نه new Date(str)؟ چون موتور جاوااسکریپت این فرمت را
 * غیراستاندارد می‌داند و ممکن است روز و ماه را جابه‌جا تفسیر کند یا NaN بدهد.
 * تفسیر اشتباه، خطای بی‌صدا می‌سازد: تاریخ‌ها معتبر به‌نظر می‌رسند ولی ترتیب
 * گالری غلط می‌شود.
 *
 * ساعت به‌عنوان وقت محلی خوانده می‌شود (همان منطقه‌ای که محتوا تولید شده).
 * اگر رشته خالی یا نامعتبر بود null برمی‌گردد تا صداکننده fallback بزند.
 */
function parseRowDate(value) {
  const text = String(value ?? "").trim();
  if (text === "") return null;

  const m = text.match(
    /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!m) return null;

  const [, d, mo, y, hh = "0", mi = "0", ss = "0"] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const dt = new Date(Number(y), month - 1, day, Number(hh), Number(mi), Number(ss));
  // نگهبان سرریز: مثلاً ۳۱.۰۲ را جاوااسکریپت بی‌صدا به ۳ مارس می‌برد.
  if (dt.getFullYear() !== Number(y) || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return dt;
}

/**
 * پارسر CSV بر پایه RFC 4180 — بدون وابستگی.
 *
 * چرا پارسر دستی و نه split(",")؟ متن پرامپت‌ها هم کاما دارد، هم گیومه، و هم
 * خط جدید داخل فیلد نقل‌قول‌شده. split ساده داده را نابود می‌کرد.
 */
function parseCsv(input) {
  let text = String(input);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // گیومه‌ی escape شده
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      // خط جدید داخل فیلد حفظ می‌شود، ولی CRLF به LF یکسان می‌شود تا متنِ
      // ذخیره‌شده در دیتابیس به سیستم‌عاملِ سازنده‌ی فایل وابسته نباشد.
      if (ch === "\r") {
        if (text[i + 1] === "\n") {
          field += "\n";
          i += 2;
          continue;
        }
        field += "\n";
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1; // بخشی از CRLF بیرون از گیومه — نادیده
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // آخرین ردیف اگر فایل با خط جدید تمام نشده باشد
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ردیف‌های کاملاً خالی (خط خالی انتهای فایل) حذف می‌شوند
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// ---------------------------------------------------------------------------
// خواندن ابعاد تصویر از هدر فایل
// ---------------------------------------------------------------------------

/**
 * عرض و ارتفاع یک تصویر را از هدر فایل می‌خواند (JPEG و PNG).
 *
 * چرا اینجا و نه در زمان رندر صفحه؟ چون خواندن از فایل‌سیستم در هر رندر یعنی
 * به ازای هر بازدید، به تعداد عکس‌ها فایل باز شود؛ و وقتی تصاویر به object
 * storage منتقل شوند فایل محلی وجود ندارد. ابعاد یک‌بار همین‌جا خوانده و در
 * ستون‌های images.width/height ذخیره می‌شود.
 *
 * چرا فقط بخش اول فایل خوانده می‌شود؟ ابعاد در هدر است، نه در داده‌ی تصویر.
 * خواندن کل فایل برای گرفتن چند بایت، ۱۱۶ مگابایت I/O بی‌دلیل بود.
 *
 * برای هر خطا یا فرمت ناشناخته null برمی‌گردد — نبودِ ابعاد نباید import را
 * بخواباند، ستون‌ها nullable هستند.
 */
const HEADER_BYTES = 64 * 1024; // برای JPEG کافی است؛ SOF معمولاً در چند کیلوبایت اول است

/** PNG: امضای ۸ بایتی، سپس chunkِ IHDR با width در آفست ۱۶ و height در ۲۰. */
function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * JPEG: زنجیره‌ی segmentها را دنبال می‌کنیم تا به یکی از markerهای SOF برسیم
 * (Start Of Frame) که ابعاد را در خود دارد.
 *
 * نکته‌های ریز که راه را می‌بندند اگر رعایت نشوند:
 *  • بین segmentها ممکن است چند 0xFF پشت‌سرهم به‌عنوان padding باشد.
 *  • markerهای بدون طول (RSTn و SOI/EOI و TEM) طول ندارند و باید رد شوند.
 *  • SOF2 و بقیه‌ی حالت‌های progressive هم ابعاد دارند، پس همه را می‌پذیریم.
 *  • 0xC4/0xC8/0xCC در بازه‌ی 0xC0..0xCF هستند ولی SOF نیستند (DHT/JPG/DAC).
 */
function jpegSize(buf) {
  if (buf.length < 4) return null;
  if (buf.readUInt16BE(0) !== 0xffd8) return null;

  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1; // هم‌ترازی از دست رفته — جلو می‌رویم تا 0xFF بعدی
      continue;
    }
    let marker = buf[i + 1];
    let j = i + 1;
    while (marker === 0xff && j + 1 < buf.length) {
      j += 1;
      marker = buf[j]; // رد کردن paddingهای 0xFF
    }

    // markerهای بدون فیلد طول
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i = j + 1;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI یا شروع داده‌ی تصویر

    if (j + 3 >= buf.length) return null;
    const length = buf.readUInt16BE(j + 1);
    if (length < 2) return null;

    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      // ساختار SOF: [طول ۲ بایت][دقت ۱ بایت][ارتفاع ۲ بایت][عرض ۲ بایت]
      if (j + 8 >= buf.length) return null;
      return { height: buf.readUInt16BE(j + 4), width: buf.readUInt16BE(j + 6) };
    }
    i = j + 1 + length;
  }
  return null;
}

/**
 * ابعاد تصویرِ متناظر با یک url گالری را برمی‌گرداند.
 * url مثل «/gallery/0001.jpg» → فایل «<ریشه‌ی پروژه>/public/gallery/0001.jpg».
 */
async function readImageSize(publicUrl, projectRoot) {
  // آدرس‌های مطلق (http…) فایل محلی ندارند — ابعادشان اینجا خوانده نمی‌شود.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(publicUrl)) return null;

  const relative = publicUrl.replace(/^\/+/, "");
  const absolute = path.join(projectRoot, "public", relative);

  let handle;
  try {
    handle = await open(absolute, "r");
    const buf = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(buf, 0, HEADER_BYTES, 0);
    const head = buf.subarray(0, bytesRead);
    return pngSize(head) ?? jpegSize(head);
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

/**
 * ابعاد را روی همه‌ی رکوردها می‌نشاند (rec.width / rec.height).
 *
 * موازی با سقف مشخص: ۷۰۰ بار open() هم‌زمان سقف descriptorهای سیستم‌عامل را
 * می‌زند؛ اجرای کاملاً سری هم روی فایل‌سیستم ویندوز کند است. سقف ۳۲ بین این دو
 * تعادل معقولی است.
 */
async function attachImageSizes(records, projectRoot) {
  const CONCURRENCY = 32;
  let cursor = 0;

  async function worker() {
    while (cursor < records.length) {
      const rec = records[cursor++];
      const size = await readImageSize(rec.url, projectRoot);
      rec.width = size?.width ?? null;
      rec.height = size?.height ?? null;
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, records.length) }, worker));
}

/** یک مقدار را برای نوشتن در CSV امن می‌کند. */
function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
// آرگومان‌ها و محیط
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    file: "./prompts_index_with_titles_2.csv",
    limit: null,
    dryRun: false,
    reset: false,
    model: null,
    urlPrefix: "/gallery/",
    skipped: "./skipped-rows.csv",
  };
  for (const raw of argv) {
    const arg = raw.trim();
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--reset") opts.reset = true;
    else if (arg.startsWith("--file=")) opts.file = stripQuotes(arg.slice(7));
    else if (arg.startsWith("--limit=")) opts.limit = Number.parseInt(arg.slice(8), 10);
    else if (arg.startsWith("--model=")) opts.model = stripQuotes(arg.slice(8));
    else if (arg.startsWith("--url-prefix=")) opts.urlPrefix = stripQuotes(arg.slice(13));
    else if (arg.startsWith("--skipped=")) opts.skipped = stripQuotes(arg.slice(10));
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`گزینه‌ی ناشناخته: ${arg}`);
  }
  if (opts.limit !== null && (!Number.isFinite(opts.limit) || opts.limit < 1)) {
    throw new Error("--limit باید یک عدد صحیح مثبت باشد");
  }
  return opts;
}

/**
 * DATABASE_URL را از .env.local می‌خواند (یا از محیط، اگر آنجا ست شده باشد).
 * عمداً پکیج dotenv اضافه نمی‌کنیم؛ این فایل فرمت ساده‌ای دارد.
 */
async function readDatabaseUrl(projectRoot) {
  if (!isBlank(process.env.DATABASE_URL)) return process.env.DATABASE_URL.trim();

  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(`DATABASE_URL پیدا نشد و فایل .env.local هم وجود ندارد: ${envPath}`);
  }
  const content = await readFile(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== "DATABASE_URL") continue;
    const value = stripQuotes(trimmed.slice(eq + 1).trim());
    if (isBlank(value)) break;
    if (/@host:port\//i.test(value)) {
      throw new Error("DATABASE_URL هنوز مقدار نمونه (placeholder) است؛ رشته‌ی اتصال واقعی را بگذار.");
    }
    return value;
  }
  throw new Error("در .env.local مقدار معتبری برای DATABASE_URL نبود.");
}

/**
 * همان منطق SSL که lib/db.ts دارد: میزبان محلی بدون SSL، میزبان دور با SSL.
 * پارامتر sslmode از رشته حذف می‌شود تا pg آن را دوباره تفسیر نکند و رفتار
 * بین اسکریپت و اپ یکی بماند.
 */
function buildPgConfig(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL یک URL معتبر نیست.");
  }
  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // اتصال به دیتابیسِ دور از ایران عمر کوتاهی دارد؛ NAT و فایروالِ میانی
    // سوکتِ ساکت را می‌بندند. keepAlive بسته‌ی زنده‌نگه‌دار می‌فرستد تا سوکت
    // در فاصله‌ی بین دو کوئری قطع نشود.
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    connectionTimeoutMillis: 20_000,
  };
}

// ---------------------------------------------------------------------------
// اعتبارسنجی ردیف‌ها
// ---------------------------------------------------------------------------

const REASONS = {
  noFile: "نام فایل تصویر خالی است (آدرسی برای عکس ساخته نمی‌شود)",
  noPrompt: "متن پرامپت خالی است",
  noCategory: "هیچ دسته‌بندی معتبری ندارد",
  duplicate: "نام فایل تکراری است (ردیف قبلی همین فایل را داشته)",
};

/**
 * هدرها را به شماره ستون نگاشت می‌کند. تطبیقِ «دقیق» است نه زیررشته‌ای، چون
 * «تصویر» زیررشته‌ی «نام فایل تصویر» و «عنوان تصویر» هم هست.
 */
function mapHeader(headerRow) {
  const normalized = headerRow.map((h) => normalizeFa(h));
  const indices = {};
  const warnings = [];
  for (const [key, spec] of Object.entries(COLUMNS)) {
    const found = normalized.indexOf(normalizeFa(spec.name));
    if (found !== -1) {
      indices[key] = found;
    } else {
      indices[key] = spec.fallbackIndex;
      warnings.push(`ستون «${spec.name}» با نام پیدا نشد؛ از شماره ستون ${spec.fallbackIndex + 1} استفاده شد.`);
    }
  }
  return { indices, warnings };
}

function buildRecords(rows, opts, lookup) {
  const headerRow = rows[0] ?? [];
  const { indices, warnings } = mapHeader(headerRow);

  let dataRows = rows.slice(1);
  if (opts.limit !== null) dataRows = dataRows.slice(0, opts.limit);

  const cell = (row, key) => (row[indices[key]] ?? "").trim();

  const records = [];
  const skipped = [];
  const seenFiles = new Map();
  const unknownCategories = new Map();

  dataRows.forEach((row, idx) => {
    const rowLabel = cell(row, "row") || String(idx + 1);
    const csvLine = idx + 2; // +1 برای هدر، +1 چون از ۱ می‌شماریم
    const fileName = cell(row, "file");
    const link = cell(row, "link");
    const promptText = (row[indices.prompt] ?? "").trim();
    const titleFa = cell(row, "title");
    const rawCats = cell(row, "cats");

    const fail = (reason) =>
      skipped.push({ rowLabel, csvLine, reason, fileName, rawCats, titleFa, promptLength: promptText.length });

    // آدرس تصویر: اگر ستون «تصویر» پر بود همان را می‌گیریم (برای آینده که لینک
    // واقعی داشته باشیم)، وگرنه از نام فایل می‌سازیم.
    let url = "";
    if (!isBlank(link)) url = link;
    else if (!isBlank(fileName)) url = opts.urlPrefix + fileName.replace(/^\/+/, "");

    if (isBlank(url)) return fail(REASONS.noFile);
    if (isBlank(promptText)) return fail(REASONS.noPrompt);

    const catNames = rawCats
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const slugs = [];
    for (const name of catNames) {
      const slug = lookup.get(normalizeFa(name));
      if (slug) {
        if (!slugs.includes(slug)) slugs.push(slug);
      } else {
        unknownCategories.set(name, (unknownCategories.get(name) ?? 0) + 1);
      }
    }
    if (slugs.length === 0) return fail(REASONS.noCategory);

    const dupKey = url.toLowerCase();
    if (seenFiles.has(dupKey)) {
      return fail(`${REASONS.duplicate} — ردیف ${seenFiles.get(dupKey)}`);
    }
    seenFiles.set(dupKey, rowLabel);

    records.push({
      rowLabel,
      csvLine,
      url,
      titleFa: isBlank(titleFa) ? null : titleFa,
      promptText,
      slugs,
      // تاریخ واقعیِ ستون «تاریخ» (اگر خوانده شد) مبنای created_at است، تا
      // ترتیب گالری همان ترتیب واقعیِ تولید محتوا باشد.
      createdAt: parseRowDate(cell(row, "date")),
      // fallback وقتی تاریخ نبود یا خراب بود: پله‌پله از الان عقب می‌رویم، ولی
      // برعکسِ نسخه‌ی قبلی — ردیفِ آخرِ فایل جدیدترین می‌شود، نه ردیف اول. در
      // این فایل تاریخ‌ها با شماره ردیف صعودی‌اند (ردیف ۱ قدیمی‌ترین)، پس
      // منطق قبلی گالری را کاملاً برعکس می‌چید.
      offsetMinutes: dataRows.length - 1 - idx,
    });
  });

  return { records, skipped, warnings, unknownCategories, headerRow };
}

// ---------------------------------------------------------------------------
// گزارش
// ---------------------------------------------------------------------------

/** تاریخ را برای نمایش در گزارش قالب‌بندی می‌کند (وقت محلی، بدون وابستگی). */
function fmtDate(dt) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

function printPreview(records, limit = 5) {
  const shown = records.slice(0, limit);
  for (const rec of shown) {
    const oneLine = rec.promptText.replace(/\s+/g, " ");
    const snippet = oneLine.length > 100 ? `${oneLine.slice(0, 100)}…` : oneLine;
    console.log(`\n── ردیف ${rec.rowLabel} ${"─".repeat(46)}`);
    console.log(`   url        : ${rec.url}`);
    console.log(`   title_fa   : ${rec.titleFa ?? "(خالی → NULL)"}`);
    console.log(`   categories : ${rec.slugs.join(", ")}`);
    console.log(
      `   ابعاد      : ${rec.width && rec.height ? `${rec.width}×${rec.height} (نسبت ${(rec.width / rec.height).toFixed(3)})` : "(خوانده نشد → NULL)"}`,
    );
    console.log(
      `   created_at : ${rec.createdAt ? fmtDate(rec.createdAt) : "(تاریخ خوانده نشد → از ترتیب ردیف ساخته می‌شود)"}`,
    );
    console.log(`   prompt     : ${rec.promptText.length} کاراکتر — «${snippet}»`);
  }
}

function printSummary({ records, skipped, unknownCategories, dryRun, inserted }) {
  console.log(`\n${"═".repeat(64)}`);
  console.log("خلاصه");
  console.log("═".repeat(64));
  if (dryRun) {
    console.log(`آماده‌ی ورود (تمرین خشک، چیزی نوشته نشد): ${records.length}`);
  } else {
    console.log(`وارد شد   : ${inserted}`);
  }
  console.log(`رد شد     : ${skipped.length}`);

  // وضعیت تاریخ‌ها — چون created_at ترتیب «جدیدترین» گالری را می‌سازد، اگر
  // بی‌صدا به fallback بیفتد باید در گزارش دیده شود.
  const withDate = records.filter((r) => r.createdAt);
  const withoutDate = records.length - withDate.length;
  if (records.length > 0) {
    if (withDate.length > 0) {
      const times = withDate.map((r) => r.createdAt.getTime());
      const oldest = new Date(Math.min(...times));
      const newest = new Date(Math.max(...times));
      console.log(`\ncreated_at از ستون «تاریخ»: ${withDate.length} ردیف`);
      console.log(`   قدیمی‌ترین : ${fmtDate(oldest)}`);
      console.log(`   جدیدترین  : ${fmtDate(newest)}`);
    }
    if (withoutDate > 0) {
      console.log(
        `⚠ ${withoutDate} ردیف تاریخ معتبر نداشت؛ created_at آن‌ها از ترتیب ردیف ساخته می‌شود.`,
      );
    }

    // وضعیت ابعاد — اگر خوانده نشوند، گالری به نسبت‌تصویر پیش‌فرض می‌افتد و
    // چیدمان masonry بی‌معنا می‌شود، پس این عدد باید دیده شود.
    const sized = records.filter((r) => r.width && r.height);
    console.log(`\nابعاد خوانده‌شده از فایل تصویر: ${sized.length} از ${records.length}`);
    if (sized.length < records.length) {
      const missing = records.filter((r) => !(r.width && r.height));
      console.log(`⚠ ${missing.length} تصویر ابعاد ندارد (width/height = NULL):`);
      for (const r of missing.slice(0, 10)) console.log(`   ردیف ${r.rowLabel} — ${r.url}`);
      if (missing.length > 10) console.log(`   … و ${missing.length - 10} مورد دیگر`);
    }
    if (sized.length > 0) {
      const ratios = sized.map((r) => r.width / r.height);
      const portrait = ratios.filter((x) => x < 0.98).length;
      const square = ratios.filter((x) => x >= 0.98 && x <= 1.03).length;
      const landscape = ratios.filter((x) => x > 1.03).length;
      console.log(`   عمودی ${portrait} | مربع ${square} | افقی ${landscape}`);
    }
  }

  if (skipped.length > 0) {
    const byReason = new Map();
    for (const s of skipped) {
      const key = s.reason.split(" — ")[0];
      byReason.set(key, (byReason.get(key) ?? 0) + 1);
    }
    console.log("\nتفکیک دلایل رد شدن:");
    for (const [reason, count] of [...byReason].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${count}×  ${reason}`);
    }
  }

  if (unknownCategories.size > 0) {
    console.log("\n⚠ دسته‌بندی‌های ناشناخته که نادیده گرفته شدند:");
    for (const [name, count] of [...unknownCategories].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${count}×  «${name}»`);
    }
    console.log("   (اگر باید بمانند، به TAXONOMY در همین فایل اضافه‌شان کن.)");
  }

  const perCat = new Map();
  for (const rec of records) {
    for (const slug of rec.slugs) perCat.set(slug, (perCat.get(slug) ?? 0) + 1);
  }
  if (perCat.size > 0) {
    console.log("\nتعداد عکس در هر دسته:");
    for (const { slug, name_fa } of TAXONOMY) {
      const n = perCat.get(slug) ?? 0;
      if (n > 0) console.log(`   ${String(n).padStart(4)}  ${slug.padEnd(13)} ${name_fa}`);
    }
  }
}

async function writeSkippedLog(skipped, targetPath) {
  const header = ["ردیف", "خط CSV", "دلیل رد شدن", "نام فایل تصویر", "دسته‌بندی‌ها", "عنوان تصویر", "طول پرامپت"];
  const lines = [header.map(csvCell).join(",")];
  for (const s of skipped) {
    lines.push(
      [s.rowLabel, s.csvLine, s.reason, s.fileName, s.rawCats, s.titleFa, s.promptLength].map(csvCell).join(","),
    );
  }
  // BOM تا اکسل، فارسی را درست باز کند (وگرنه متن به‌هم‌ریخته نشان می‌دهد)
  await writeFile(targetPath, `﻿${lines.join("\r\n")}\r\n`, "utf8");
}

// ---------------------------------------------------------------------------
// نوشتن در دیتابیس
// ---------------------------------------------------------------------------

/** ستون‌هایی از images که این اسکریپت می‌نویسد؛ اگر یکی نباشد INSERT می‌شکند. */
const REQUIRED_IMAGE_COLUMNS = ["url", "title_fa", "model_used", "created_at", "width", "height"];

/**
 * بررسیِ پیش‌پرواز: قبل از هر نوشتنی مطمئن شو اسکیما همان چیزی است که کد
 * انتظارش را دارد.
 *
 * چرا لازم است و چرا نمی‌شود به خطای خودِ INSERT تکیه کرد: مسیرِ جبرانیِ درج
 * هر ردیف را داخل SAVEPOINT خودش می‌گذارد، پس یک ستونِ غایب به یک خطای روشن
 * ترجمه نمی‌شد بلکه به ۷۰۰ «خطای ردیف» ترجمه می‌شد که در فایلِ ردشده‌ها دفن
 * می‌شوند، درحالی‌که خروجیِ ترمینال هنوز خطوطِ «۷۰۰ ردیف خوانده شد» و «تراکنش
 * COMMIT شد» را نشان می‌دهد. یعنی یک شکستِ کامل، شبیهِ یک اجرای موفق به‌نظر
 * می‌رسید. این تابع همان حالت را به یک پیامِ صریح با نامِ فایلِ migration
 * تبدیل می‌کند.
 */
async function assertSchemaReady(client) {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'images'`,
  );
  const present = new Set(res.rows.map((r) => r.column_name));

  if (present.size === 0) {
    throw new Error(
      "جدول images در این دیتابیس وجود ندارد.\n" +
        "  اول محتوای db/schema.sql را در کنسول SQL اجرا کن، بعد این دستور را بزن.",
    );
  }

  const missing = REQUIRED_IMAGE_COLUMNS.filter((c) => !present.has(c));
  if (missing.length > 0) {
    throw new Error(
      `جدول images این ستون‌ها را ندارد: ${missing.join("، ")}\n` +
        "  یعنی اسکیمای دیتابیس از کد عقب‌تر است. علتش این است که schema.sql با\n" +
        "  CREATE TABLE IF NOT EXISTS نوشته شده و روی جدولِ موجود بی‌صدا هیچ کاری نمی‌کند.\n" +
        "  این فایل را در کنسول SQL اجرا کن و بعد همین دستور را دوباره بزن:\n" +
        "      db/migrations/001-add-image-dimensions.sql\n" +
        "  (فایل idempotent است؛ اجرای چندباره‌اش بی‌خطر است.)",
    );
  }
}

/**
 * تعداد ردیف در هر دسته. عمداً کوچک: هدف کمینه‌کردنِ رفت‌وبرگشت نیست، بلکه
 * کوتاه‌نگه‌داشتنِ عمرِ هر تراکنش است. روی مسیرِ شبکه‌ای که هر چند ده ثانیه
 * سوکت را می‌کشد، دسته‌ی بزرگ یعنی کارِ بیشتری که با هر قطعی از دست می‌رود.
 * با ۲۵ ردیف، بزرگ‌ترین دستور ۱۵۰ پارامتر و چند ده کیلوبایت است.
 */
const CHUNK_SIZE = 25;

/** چند بار یک واحدِ کار در برابر خطای گذرا تکرار شود. */
const MAX_ATTEMPTS = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** سوکت مرده است — کلاینت دیگر قابل استفاده نیست و باید از نو ساخته شود. */
function isConnectionError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return /terminated|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|Connection ended|connection error|server closed/i.test(
    msg,
  );
}

/**
 * خطای گذرا: با تکرار ممکن است جواب بدهد.
 *
 * «statement timeout» هم اینجاست و دلیلش تجربی است: اجرای قبلی که وسطِ کار
 * قطع شد، یک نشستِ زامبی با قفلِ باز جا گذاشت، و TRUNCATE بعدی منتظرِ همان
 * قفل ماند تا مهلتش تمام شد. آن قفل خودش چند ثانیه بعد آزاد می‌شود.
 */
function isRetryable(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return isConnectionError(err) || /statement timeout|deadlock detected|obtain lock/i.test(msg);
}

/**
 * یک واحدِ کار را در تراکنشِ خودش اجرا می‌کند و در برابر خطای گذرا تکرار می‌کند
 * — با ساختنِ اتصالِ تازه، چون کلاینتِ pg بعد از مرگِ سوکت دیگر قابل احیا نیست.
 *
 * چرا هر واحد تراکنشِ جدا دارد و نه یک تراکنشِ بزرگ برای همه‌ی ۷۰۰ ردیف:
 * تراکنشِ بزرگ یعنی «همه یا هیچ»، که روی یک اتصالِ ناپایدار در عمل همیشه
 * «هیچ» است — سه بار همین اتفاق افتاد. با COMMIT به ازای هر دسته، پیشرفت
 * ماندگار می‌شود و اجرای بعدی از همان‌جا ادامه می‌دهد. بهایش این است که یک
 * شکستِ میانی، دیتابیس را نیمه‌پر می‌گذارد؛ جبرانش این است که هر دسته پیش از
 * نوشتن می‌پرسد کدام ردیف‌ها از قبل هستند، پس اجرای دوباره تکراری نمی‌سازد.
 */
async function runStep(ctx, label, fn) {
  for (let attempt = 1; ; attempt += 1) {
    const client = await ctx.connect();
    try {
      await client.query("BEGIN");
      const out = await fn(client);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      if (isConnectionError(err)) {
        // ROLLBACK روی سوکتِ مرده بی‌معنی است؛ کلاینت را دور می‌ریزیم.
        await ctx.drop();
      } else {
        await client.query("ROLLBACK").catch(() => {});
      }

      if (!isRetryable(err) || attempt >= MAX_ATTEMPTS) throw err;

      const wait = attempt * 3000;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ⟳ ${label} — تلاش ${attempt} نشد (${msg})؛ ${wait / 1000} ثانیه دیگر دوباره.`);
      await sleep(wait);
    }
  }
}

/**
 * درجِ یک دسته ردیف با سه دستور، به‌جای ~۵.۶ دستور به ازای هر ردیف.
 *
 * چرا این‌قدر مهم است: هر دستور یک رفت‌وبرگشتِ شبکه است. با یک ردیف در هر
 * دستور، ۷۰۰ عکس می‌شود ~۴۰۰۰ رفت‌وبرگشت روی اتصالی که از ایران به سرورِ دور
 * می‌رود — هم کند است هم هر تک‌لحظه اختلالِ شبکه کلِ تراکنش را می‌کشد. با
 * درجِ دسته‌ای، تراکنش چند ثانیه باز است نه چند ده دقیقه.
 *
 * بهایش این است که یک ردیفِ خراب کلِ دسته را می‌اندازد. جبرانش در فراخوان
 * است: دسته‌ی شکست‌خورده ردیف‌به‌ردیف تکرار می‌شود تا فقط خودِ ردیفِ خرابکار
 * رد شود.
 */
async function insertBatch(client, chunk, opts, catId, baseTime) {
  const imgParams = [];
  const imgTuples = chunk.map((rec) => {
    const createdAt = rec.createdAt ?? new Date(baseTime - rec.offsetMinutes * 60_000);
    const b = imgParams.length;
    imgParams.push(
      rec.url,
      rec.titleFa,
      opts.model,
      createdAt,
      rec.width ?? null,
      rec.height ?? null,
    );
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
  });

  const imgRes = await client.query(
    `INSERT INTO images (url, title_fa, model_used, created_at, width, height)
     VALUES ${imgTuples.join(", ")}
     RETURNING id, url`,
    imgParams,
  );

  // نگاشت با url و نه با ترتیبِ سطرها: ترتیبِ RETURNING در یک INSERT چندسطری
  // در عمل همان ترتیبِ VALUES است، ولی هیچ‌جا تضمین نشده. url در این مجموعه
  // یکتاست (۷۰۰ نامِ فایلِ متمایز و کنترل‌شده)، پس نگاشتِ صریح هم درست است هم
  // به جزئیاتِ پیاده‌سازیِ Postgres وابسته نیست.
  const idByUrl = new Map(imgRes.rows.map((r) => [r.url, r.id]));
  if (idByUrl.size !== chunk.length) {
    throw new Error(
      `تعداد id بازگشتی (${idByUrl.size}) با تعداد ردیف‌های دسته (${chunk.length}) نمی‌خواند.`,
    );
  }

  const prParams = [];
  const prTuples = chunk.map((rec) => {
    const b = prParams.length;
    prParams.push(idByUrl.get(rec.url), rec.promptText);
    return `($${b + 1}, $${b + 2})`;
  });
  await client.query(
    `INSERT INTO prompts (image_id, prompt_text) VALUES ${prTuples.join(", ")}`,
    prParams,
  );

  const icParams = [];
  const icTuples = [];
  for (const rec of chunk) {
    for (const slug of rec.slugs) {
      const b = icParams.length;
      icParams.push(idByUrl.get(rec.url), catId.get(slug));
      icTuples.push(`($${b + 1}, $${b + 2})`);
    }
  }
  if (icTuples.length > 0) {
    await client.query(
      `INSERT INTO image_categories (image_id, category_id)
       VALUES ${icTuples.join(", ")}
       ON CONFLICT DO NOTHING`,
      icParams,
    );
  }
}

/**
 * مسیرِ گران اما دقیق: هر ردیف داخل SAVEPOINT خودش. فقط وقتی صدا زده می‌شود
 * که درجِ دسته‌ای شکست خورده باشد، تا معلوم شود کدام ردیف مقصر است و بقیه‌ی
 * همان دسته از دست نروند.
 */
async function insertRowByRow(client, chunk, opts, catId, baseTime) {
  const failures = [];
  let inserted = 0;

  for (const rec of chunk) {
    await client.query("SAVEPOINT row_sp");
    try {
      const createdAt = rec.createdAt ?? new Date(baseTime - rec.offsetMinutes * 60_000);
      const img = await client.query(
        `INSERT INTO images (url, title_fa, model_used, created_at, width, height)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [rec.url, rec.titleFa, opts.model, createdAt, rec.width ?? null, rec.height ?? null],
      );
      const imageId = img.rows[0].id;

      await client.query(`INSERT INTO prompts (image_id, prompt_text) VALUES ($1, $2)`, [
        imageId,
        rec.promptText,
      ]);

      for (const slug of rec.slugs) {
        await client.query(
          `INSERT INTO image_categories (image_id, category_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [imageId, catId.get(slug)],
        );
      }

      await client.query("RELEASE SAVEPOINT row_sp");
      inserted += 1;
    } catch (err) {
      await client.query("ROLLBACK TO SAVEPOINT row_sp");
      failures.push({
        rowLabel: rec.rowLabel,
        csvLine: rec.csvLine,
        reason: `خطای دیتابیس: ${err instanceof Error ? err.message : String(err)}`,
        fileName: rec.url,
        rawCats: rec.slugs.join("، "),
        titleFa: rec.titleFa ?? "",
        promptLength: rec.promptText.length,
      });
    }
  }

  return { inserted, failures };
}

async function importToDatabase(records, opts, projectRoot) {
  const connectionString = await readDatabaseUrl(projectRoot);
  const { default: pg } = await import("pg");
  const config = buildPgConfig(connectionString);

  // مدیریتِ اتصال: تنبل ساخته می‌شود و بعد از مرگِ سوکت دور ریخته و از نو
  // ساخته می‌شود. شنونده‌ی 'error' اجباری است — بدونش مرگِ ناگهانیِ سوکت یک
  // رویدادِ بی‌صاحب است و Node پراسس را با stack trace می‌کشد، بیرون از هر
  // try/catch، پس هیچ پیامِ قابل‌فهمی چاپ نمی‌شود.
  let live = null;
  const ctx = {
    async connect() {
      if (live) return live;
      const c = new pg.Client(config);
      c.on("error", (err) => console.error(`  ⚠ سوکتِ دیتابیس: ${err.message}`));
      await c.connect();
      live = c;
      return c;
    },
    async drop() {
      const c = live;
      live = null;
      if (c) await c.end().catch(() => {});
    },
  };

  const failures = [];
  let inserted = 0;
  let alreadyPresent = 0;

  try {
    // ── فاز ۱: اسکیما، خالی‌سازی و دسته‌ها ──────────────────────────────────
    const catId = await runStep(ctx, "آماده‌سازی", async (client) => {
      // قبل از TRUNCATE: اگر اسکیما ناقص است، نباید داده‌ی موجود را خالی کنیم
      // و بعد بفهمیم نمی‌توانیم چیزی بنویسیم.
      await assertSchemaReady(client);

      if (opts.reset) {
        // تعداد را قبل از پاک‌کردن می‌شماریم: اگر اجرای قبلی نیمه‌کاره مانده
        // باشد، --reset همان پیشرفت را دور می‌ریزد و کاربر باید بداند چقدر رفت.
        const before = await client.query("SELECT count(*)::int AS n FROM images");
        await client.query(
          "TRUNCATE image_categories, prompts, images, categories RESTART IDENTITY CASCADE",
        );
        console.log(
          `جدول‌ها خالی شدند (${before.rows[0].n} عکس پاک شد). pending_prompts دست‌نخورده ماند.`,
        );
      }

      const map = new Map();
      for (const { slug, name_fa } of TAXONOMY) {
        const res = await client.query(
          `INSERT INTO categories (name_fa, slug) VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET name_fa = EXCLUDED.name_fa
           RETURNING id`,
          [name_fa, slug],
        );
        map.set(slug, res.rows[0].id);
      }
      console.log(`${TAXONOMY.length} دسته‌بندی آماده شد.`);
      return map;
    });

    // ── فاز ۲: چه چیزی از قبل هست؟ ─────────────────────────────────────────
    // این همان چیزی است که اجرای دوباره را بی‌خطر می‌کند: بعد از یک قطعیِ
    // میانی، اجرای بعدی (بدون --reset) از همان‌جا ادامه می‌دهد.
    const existing = await runStep(ctx, "بازبینی وضعیت", async (client) => {
      const res = await client.query("SELECT url FROM images");
      return new Set(res.rows.map((r) => r.url));
    });

    const todo = records.filter((rec) => !existing.has(rec.url));
    alreadyPresent = records.length - todo.length;

    if (alreadyPresent > 0) {
      console.log(
        `${alreadyPresent} عکس از قبل در دیتابیس بود؛ ${todo.length} ردیف باقی مانده.`,
      );
    }
    if (todo.length === 0) {
      console.log("چیزی برای اضافه‌کردن نیست — همه‌ی ردیف‌ها از قبل وارد شده‌اند.");
      return { inserted, alreadyPresent, failures };
    }

    // ── فاز ۳: درج، دسته‌به‌دسته با COMMIT جداگانه ───────────────────────────
    const baseTime = Date.now();

    for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
      const chunk = todo.slice(i, i + CHUNK_SIZE);
      const label = `دسته‌ی ${i + 1}–${i + chunk.length}`;

      try {
        inserted += await runStep(ctx, label, async (client) => {
          // اگر تلاشِ قبلی درست پیش از رسیدنِ تأییدِ COMMIT قطع شده باشد، ممکن
          // است سرور آن را ثبت کرده باشد. چون images.url قید UNIQUE ندارد،
          // تکرارِ کورکورانه ردیفِ تکراری می‌ساخت. پس هر دسته اول می‌پرسد.
          const have = await client.query(
            `SELECT url FROM images WHERE url = ANY($1::text[])`,
            [chunk.map((rec) => rec.url)],
          );
          const haveSet = new Set(have.rows.map((r) => r.url));
          const pending = chunk.filter((rec) => !haveSet.has(rec.url));
          if (pending.length === 0) return 0;

          await insertBatch(client, pending, opts, catId, baseTime);
          return pending.length;
        });
      } catch (err) {
        // قطعِ اتصال با تکرار حل نشد → ادامه بی‌فایده است. پیشرفتِ تا اینجا
        // COMMIT شده، پس اجرای بعدی از همین نقطه سوار می‌شود.
        if (isConnectionError(err)) throw err;

        // خطای داده‌ای: همان دسته را ردیف‌به‌ردیف می‌زنیم تا فقط ردیفِ خرابکار
        // رد شود و ۲۴ ردیفِ سالمِ دیگر از دست نروند.
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ⚠ ${label} گروهی نشد (${msg}) — ردیف‌به‌ردیف امتحان می‌شود.`);
        const r = await runStep(ctx, `${label} ردیف‌به‌ردیف`, (client) =>
          insertRowByRow(client, chunk, opts, catId, baseTime),
        );
        inserted += r.inserted;
        failures.push(...r.failures);
      }

      // نشانگرِ پیشرفت. فازِ درج طولانی‌ترین بخشِ کار است و سکوتش باعث می‌شد
      // اجرای درست هم شبیهِ گیرکردن به‌نظر برسد.
      console.log(`  ${inserted}/${todo.length}`);
    }
  } finally {
    await ctx.drop();
  }

  return { inserted, alreadyPresent, failures };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log("راهنما در توضیحات بالای همین فایل است: scripts/import-content.mjs");
    return;
  }

  // ریشه‌ی پروژه = یک پوشه بالاتر از scripts/
  // چرا fileURLToPath و نه new URL(...).pathname؟ چون pathname مسیر را
  // percent-encoded برمی‌گرداند: پوشه‌ی «promptesh project» می‌شود
  // «promptesh%20project» و فایل هیچ‌وقت پیدا نمی‌شود. fileURLToPath هم
  // decode می‌کند و هم حرفِ درایوِ ویندوز را درست درمی‌آورد.
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const csvPath = path.resolve(projectRoot, opts.file);

  if (!existsSync(csvPath)) {
    throw new Error(
      `فایل CSV پیدا نشد: ${csvPath}\n` +
        "فایل را در ریشه‌ی پروژه بگذار یا با --file=«مسیر کامل» آدرسش را بده.",
    );
  }

  console.log(`فایل: ${csvPath}`);
  if (opts.dryRun) console.log("حالت: تمرین خشک (--dry-run) — به دیتابیس وصل نمی‌شود و چیزی نمی‌نویسد.");
  if (opts.limit !== null) console.log(`محدودیت: فقط ${opts.limit} ردیف اول`);

  const raw = await readFile(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length < 2) throw new Error("فایل CSV هدر یا داده ندارد.");
  // عمداً صریح می‌گوید «از CSV»: خطِ قبلیِ این پیام فقط «خوانده شد: ۷۰۰ ردیف»
  // بود و به‌راحتی با «۷۰۰ ردیف در دیتابیس نوشته شد» اشتباه می‌شد.
  console.log(`از CSV خوانده شد: ${rows.length - 1} ردیف (هنوز چیزی در دیتابیس نوشته نشده)`);

  const lookup = new Map(TAXONOMY.map((c) => [normalizeFa(c.name_fa), c.slug]));
  const { records, skipped, warnings, unknownCategories, headerRow } = buildRecords(rows, opts, lookup);

  console.log(`هدرها: ${headerRow.join(" | ")}`);
  for (const w of warnings) console.log(`⚠ ${w}`);

  // ابعاد تصاویر پیش از هر خروجی خوانده می‌شود، تا در --dry-run هم قابل بازبینی
  // باشد و نه فقط موقع نوشتن در دیتابیس.
  await attachImageSizes(records, projectRoot);

  let inserted = 0;
  let alreadyPresent = 0;
  const allSkipped = [...skipped];

  if (opts.dryRun) {
    printPreview(records, opts.limit ?? 5);
  } else {
    const result = await importToDatabase(records, opts, projectRoot);
    inserted = result.inserted;
    alreadyPresent = result.alreadyPresent;
    allSkipped.push(...result.failures);
  }

  if (allSkipped.length > 0) {
    const skippedPath = path.resolve(projectRoot, opts.skipped);
    await writeSkippedLog(allSkipped, skippedPath);
    console.log(`\nلاگ ردیف‌های ردشده نوشته شد: ${skippedPath}`);
  }

  printSummary({ records, skipped: allSkipped, unknownCategories, dryRun: opts.dryRun, inserted });

  if (opts.dryRun) {
    console.log("\nهیچ چیزی در دیتابیس نوشته نشده. برای ورود واقعی --dry-run را بردار.");
    return;
  }

  // «present» یعنی چند ردیف الان واقعاً در دیتابیس است، نه چند ردیف در همین
  // اجرا نوشته شد — چون اجرای دوم روی یک import نیمه‌کاره فقط بقیه را می‌نویسد.
  const present = inserted + alreadyPresent;

  if (present === 0 && records.length > 0) {
    console.error(
      `\n✗ هیچ‌کدام از ${records.length} ردیف وارد دیتابیس نشد. این یک اجرای موفق نیست.\n` +
        `  دلیلِ هر ردیف در ${opts.skipped} نوشته شده — ستونِ «دلیل رد شدن» را ببین.`,
    );
    process.exitCode = 1;
  } else if (present < records.length) {
    console.error(
      `\n⚠ ${present} ردیف از ${records.length} در دیتابیس است؛ ${records.length - present} تا مانده.\n` +
        "  برای ادامه از همین نقطه، همین دستور را بدون --reset اجرا کن:\n" +
        "      node scripts/import-content.mjs",
    );
    process.exitCode = 1;
  } else {
    console.log(`\n✓ همه‌ی ${records.length} ردیف در دیتابیس است.`);
  }
}

main().catch((err) => {
  console.error(`\n✗ اسکریپت متوقف شد: ${err instanceof Error ? err.message : String(err)}`);
  if (isConnectionError(err)) {
    console.error(
      "\n  اتصال به دیتابیس قطع شد و با تکرار هم برنگشت.\n" +
        "  هرچه تا این لحظه نوشته شده COMMIT شده و سرِ جایش است. برای ادامه از\n" +
        "  همان نقطه، همین دستور را بدون --reset اجرا کن (وگرنه پیشرفت پاک می‌شود):\n" +
        "      node scripts/import-content.mjs\n" +
        "  اگر چند بار پشتِ هم اینجا گیر کرد، مشکل مسیرِ شبکه تا این دیتابیس است،\n" +
        "  نه داده — بهتر است دیتابیسِ نزدیک‌تر (Liara) را هدف بگیری.",
    );
  }
  process.exitCode = 1;
});
