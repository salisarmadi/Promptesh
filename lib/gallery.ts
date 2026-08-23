import { cache } from "react";
import { query } from "@/lib/db";

/**
 * لایه دسترسی به داده گالری.
 *
 * تنها جایی است که SQL گالری زندگی می‌کند؛ صفحه‌ها فقط این توابع را صدا می‌زنند
 * و هیچ کوئری خامی داخل کامپوننت‌ها نیست. این‌طور وقتی اسکیما عوض شود (مثل همین
 * مهاجرت به رابطه چند‌به‌چند) فقط همین فایل تغییر می‌کند.
 *
 * ⚠️ فقط سمت سرور: از lib/db استفاده می‌کند که به pg (ماژول‌های Node) وابسته است.
 *
 * هر تابع با React.cache پیچیده شده — ولی به این حساب نکن که کوئری‌ها را
 * یکی می‌کند. کلیدِ cache برابریِ ارجاعیِ آرگومان‌هاست و همه‌ی صداکردن‌ها یک
 * آبجکتِ تازه می‌سازند، پس عملاً هیچ‌وقت اصابت نمی‌کند. اگر لازم شد یک کوئری دو
 * بار در یک درخواست اجرا نشود (مثلاً هم در صفحه و هم در متادیتا)، همان مقدار
 * باید دستی پاس داده شود، نه اینکه به این پوشش تکیه شود.
 */

/** دسته‌ای که همراه هر عکس برمی‌گردد (برای برچسب و لینک تب). */
export type GalleryCategory = {
  slug: string;
  name_fa: string;
};

/** دسته به‌همراه تعداد عکس‌هایش — برای تب‌های بالای گالری (مرحله بعد). */
export type CategoryWithCount = GalleryCategory & {
  /** تعداد عکس‌های عضو این دسته (چون چند‌به‌چند است، مجموعِ همه می‌تواند از کل عکس‌ها بیشتر شود). */
  image_count: number;
};

/**
 * یک ردیف گالری. توجه به نوع‌هایی که node-postgres برمی‌گرداند:
 *  • id  → string (چون BIGINT است و pg برای جلوگیری از دست‌رفتن دقت رشته می‌دهد)
 *  • likes_count → number (INTEGER)
 *  • created_at  → Date (TIMESTAMPTZ)
 *  • categories  → آرایه‌ی شیء؛ از json_agg می‌آید و pg خودش json را پارس می‌کند.
 */
export type GalleryImage = {
  id: string;
  url: string;
  title_fa: string | null;
  model_used: string | null;
  /** متن پرامپت قابل‌کپی (۱:۱ با تصویر؛ اگر هنوز ثبت نشده باشد → null). */
  prompt_text: string | null;
  likes_count: number;
  created_at: Date;
  /**
   * ابعاد ذاتی تصویر به پیکسل — برای width/height کامپوننت <Image> نکست، که
   * جلوی پرش چیدمان (CLS) را می‌گیرد و srcset درست می‌سازد.
   *
   * در زمان import از هدر فایل خوانده و در دیتابیس ذخیره می‌شود، نه در زمان
   * رندر از فایل‌سیستم: خواندن هنگام رندر یعنی به ازای هر بازدید به تعداد
   * عکس‌ها فایل باز شود، و بعد از انتقال به object storage فایل محلی وجود
   * ندارد. اگر ابعاد ثبت نشده باشد null است و صفحه به نسبت پیش‌فرض برمی‌گردد.
   */
  width: number | null;
  height: number | null;
  categories: GalleryCategory[];
};

export type GallerySort = "newest" | "popular";

export type GetGalleryImagesOptions = {
  /** ترتیب نمایش. پیش‌فرض «جدیدترین». */
  sort?: GallerySort;
  /** فیلتر بر اساس slug دسته (تب گالری). اگر ندهی، همه عکس‌ها می‌آیند. */
  categorySlug?: string;
  /** عبارت جستجوی آزاد. روی متن پرامپت، عنوان فارسی و نام دسته می‌گردد. */
  search?: string;
  /**
   * حداکثر تعداد ردیف. صفحه‌ی گالری همیشه PAGE_SIZE را پاس می‌دهد؛ پیش‌فرض
   * فقط برای صداکردن‌های موردیِ دیگر است. سقفِ سختش MAX_LIMIT است.
   */
  limit?: number;
  /** پرش از ابتدای نتایج. مقدارش (page - 1) × PAGE_SIZE است. */
  offset?: number;
};

/**
 * تعدادِ عکسِ هر صفحه.
 *
 * چرا export و چرا همان مقدارِ DEFAULT_LIMIT: صفحه‌بندی به این عدد در دو جا
 * احتیاج دارد — یکی برای offset (صفحه‌ی سوم یعنی از ۱۲۰ به بعد) و یکی برای
 * محاسبه‌ی تعدادِ کلِ صفحه‌ها. اگر صفحه عددِ خودش را داشت و لایه‌ی داده عددِ
 * دیگری، صفحه‌ی آخر بی‌صدا یا خالی می‌شد یا چند عکس را جا می‌انداخت. پس یک
 * عدد، همین‌جا.
 *
 * ۶۰ انتخاب شد نه ۲۴: کاربر در گالری «مرور» می‌کند نه «مطالعه»، و هر بار
 * رفتن به صفحه‌ی بعد یک وقفه است. با ۷۰۰ عکس این می‌شود ۱۲ صفحه که نوارِ
 * صفحه‌بندی‌اش هم بدون خلاصه‌سازیِ افراطی جا می‌شود.
 */
export const PAGE_SIZE = 60;

const DEFAULT_LIMIT = PAGE_SIZE;
const MAX_LIMIT = 200;

/**
 * ------------------------------ جستجو ------------------------------
 *
 * چرا ILIKE ساده و نه full-text یا pg_trgm؟
 *   ۷۰۰ ردیف × حدود ۱۲۰۰ کاراکتر پرامپت ≈ ۸۴۰ کیلوبایت متن. یک sequential
 *   scan روی این حجم زیر ۱۰ میلی‌ثانیه جواب می‌دهد، پس ایندکس و افزونه سود
 *   قابل‌اندازه‌گیری ندارند و در عوض دو هزینه دارند: وابستگی به فعال‌بودن
 *   افزونه روی Liara، و اینکه پستگرس استاندارد کانفیگ full-text فارسی ندارد
 *   (تحلیلگر «english» ریشه‌یابیِ فارسی نمی‌کند و «simple» هم چیزی جز
 *   توکن‌سازی روی فاصله نیست). اگر محتوا از چند هزار ردیف گذشت، اینجا همان
 *   نقطه‌ای است که باید بازبینی شود.
 *
 * چرا روی چند ستون؟
 *   پرامپت‌ها انگلیسی‌اند ولی کاربر فارسی تایپ می‌کند. اگر فقط روی
 *   prompt_text بگردیم، جستجوی «پرتره» صفر نتیجه می‌دهد در حالی که ۶۲۴ عکس
 *   در آن دسته است. پس هم عنوان فارسی و هم نام دسته هم جستجو می‌شوند.
 */

/**
 * یکسان‌سازی نویسه‌های فارسی برای مقایسه.
 *
 * لازم است چون همان واژه در داده و در تایپِ کاربر می‌تواند با نویسه‌های
 * مختلف نوشته شود: «ي» عربی در برابر «ی» فارسی، «ك» عربی در برابر «ک»، و
 * نیم‌فاصله (U+200C) که در «سیاه‌وسفید» هست و کاربر معمولاً نمی‌زند.
 * بدون این، جستجوی درست نتیجه‌ی خالی می‌دهد و کاربر فکر می‌کند چیزی نیست.
 *
 * هر دو طرفِ مقایسه از همین گذر می‌کنند: این تابع برای ستون SQL، و
 * normalizeQuery برای عبارتِ کاربر.
 */
function faNorm(sqlExpr: string): string {
  // translate نویسه‌به‌نویسه نگاشت می‌کند. فقط شکل‌های عربی به فارسی؛ «ئ» را
  // دست نمی‌زنیم چون حرفِ مستقل و معتبر فارسی است.
  const mapped = `translate(${sqlExpr}, 'يكةۀى', 'یکههی')`;
  // نیم‌فاصله (U+200C) و اتصال‌دهنده‌ی صفر-عرض (U+200D) حذف می‌شوند. از chr()
  // استفاده شده نه از رشته‌ی U&'\\200C'، چون chr ساده‌تر است و به تنظیمِ
  // standard_conforming_strings حساس نیست.
  return `replace(replace(${mapped}, chr(8204), ''), chr(8205), '')`;
}

/** همان یکسان‌سازی، سمت جاوااسکریپت، برای عبارتی که کاربر تایپ کرده. */
function normalizeQuery(raw: string): string {
  return raw
    .replace(/[‌‍﻿]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/ى/g, "ی")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * آماده‌سازی عبارت جستجو برای ILIKE.
 *
 * نکته‌ی امنیتی: عبارت هرگز داخل SQL درج نمی‌شود؛ به‌صورت پارامتر می‌رود. ولی
 * باید کاراکترهای الگوی خودِ LIKE را هم بی‌اثر کرد، وگرنه کاربری که «%»
 * تایپ کند همه‌چیز را می‌گیرد و «_» هر نویسه‌ای را. با ESCAPE '\' در کوئری
 * جفت می‌شود.
 */
function toLikePattern(raw: string): string | null {
  const norm = normalizeQuery(raw);
  if (norm.length === 0) return null;
  const escaped = norm.replace(/([\\%_])/g, "\\$1");
  return `%${escaped}%`;
}

/**
 * شرط‌های WHERE مشترکِ «فهرست» و «شمارش» را یک‌جا می‌سازد.
 *
 * چرا مشترک؟ چون اگر شمارش و فهرست دو منطق فیلتر جدا داشته باشند، دیر یا زود
 * از هم واگرا می‌شوند و صفحه عددی نشان می‌دهد که با کارت‌های روی صفحه نمی‌خواند.
 * پارامترها هم برمی‌گردند تا شماره‌گذاری $n در هر دو کوئری یکی باشد.
 */
function buildFilter(opts: GetGalleryImagesOptions): {
  conditions: string[];
  params: unknown[];
} {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (opts.categorySlug) {
    params.push(opts.categorySlug);
    // فیلتر با EXISTS روی خودِ عکس، نه روی JOINِ سازنده‌ی آرایه‌ی دسته‌ها —
    // وگرنه برای عکسِ چنددسته‌ای فقط همان دسته‌ی فیلترشده در آرایه می‌ماند.
    conditions.push(`EXISTS (
               SELECT 1
                 FROM image_categories f
                 JOIN categories fc ON fc.id = f.category_id
                WHERE f.image_id = i.id
                  AND fc.slug = $${params.length}
             )`);
  }

  const pattern = opts.search ? toLikePattern(opts.search) : null;
  if (pattern) {
    params.push(pattern);
    const p = `$${params.length}`;
    // سه شرط با OR: کافی است عبارت در یکی پیدا شود.
    // ESCAPE '\' با کاراکترهای بی‌اثرشده در toLikePattern جفت است.
    // prompt_text از faNorm نمی‌گذرد چون انگلیسی است و یکسان‌سازیِ فارسی
    // رویش بی‌اثر و فقط هزینه است.
    conditions.push(`(
               ${faNorm("coalesce(i.title_fa, '')")} ILIKE ${p} ESCAPE '\\'
            OR EXISTS (
                 SELECT 1 FROM prompts sp
                  WHERE sp.image_id = i.id
                    AND sp.prompt_text ILIKE ${p} ESCAPE '\\'
               )
            OR EXISTS (
                 SELECT 1
                   FROM image_categories sic
                   JOIN categories sc ON sc.id = sic.category_id
                  WHERE sic.image_id = i.id
                    AND ${faNorm("sc.name_fa")} ILIKE ${p} ESCAPE '\\'
               )
             )`);
  }

  return { conditions, params };
}

/**
 * conditions را به یک بندِ WHERE تبدیل می‌کند (یا رشته‌ی خالی اگر فیلتری نیست).
 *
 * چرا جدا از buildFilter؟ چون همین شرط‌ها در getCategories نه در WHERE بلکه در
 * ON یک LEFT JOIN می‌نشینند؛ اگر buildFilter خودش WHERE بچسباند، آنجا قابل
 * استفاده نیست.
 */
function whereClause(conditions: string[]): string {
  return conditions.length > 0 ? `\n     WHERE ${conditions.join("\n       AND ")}` : "";
}

/**
 * نگاشت ثابت ترتیب‌ها به عبارت ORDER BY.
 *
 * مهم (امنیت): ورودی کاربر هرگز مستقیم در SQL درج نمی‌شود. sort فقط می‌تواند
 * یکی از کلیدهای همین شیء باشد و مقدارِ نگاشته‌شده یک رشته ثابت و مطمئن است.
 * tie-breaker روی id گذاشته شده تا ترتیب قطعی باشد (برای صفحه‌بندی پایدار).
 */
const ORDER_BY: Record<GallerySort, string> = {
  newest: "i.created_at DESC, i.id DESC",
  popular: "i.likes_count DESC, i.created_at DESC, i.id DESC",
};

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT);
}

/**
 * فهرست عکس‌های گالری، هرکدام با آرایه‌ی کامل دسته‌هایش.
 *
 * نکته کلیدیِ رابطه چند‌به‌چند: فیلتر دسته با EXISTS روی خودِ عکس انجام می‌شود،
 * نه روی JOINِ سازنده‌ی آرایه. اگر فیلتر را روی همان JOIN می‌گذاشتیم، برای یک
 * عکسِ چنددسته‌ای فقط همان دسته‌ی فیلترشده در آرایه می‌ماند و بقیه دسته‌هایش گم
 * می‌شدند. این‌طوری عکس‌های «دسته X» می‌آیند ولی هر عکس همه‌ی برچسب‌هایش را دارد.
 */
export const getGalleryImages = cache(async function getGalleryImages(
  opts: GetGalleryImagesOptions = {}
): Promise<GalleryImage[]> {
  const sort: GallerySort = opts.sort === "popular" ? "popular" : "newest";
  const limit = clampLimit(opts.limit);
  const offset = Math.max(0, Math.trunc(opts.offset ?? 0));

  const { conditions, params } = buildFilter(opts);
  const filterSql = whereClause(conditions);

  params.push(limit);
  const limitPos = params.length;
  params.push(offset);
  const offsetPos = params.length;

  // GROUP BY فقط روی i.id: چون کلید اصلی است، Postgres اجازه می‌دهد بقیه ستون‌های
  // i.* را بدون فهرست‌کردن انتخاب کنیم (وابستگی تابعی به کلید اصلی).
  const sql = `
    SELECT i.id,
           i.url,
           i.title_fa,
           i.model_used,
           i.likes_count,
           i.created_at,
           i.width,
           i.height,
           -- پرامپت ۱:۱ است؛ زیرکوئریِ اسکالر ساده‌تر از JOIN+GROUP BY است و
           -- چون فقط به i.id (کلید گروه‌بندی) وابسته است، با GROUP BY سازگار می‌ماند.
           (SELECT p.prompt_text FROM prompts p WHERE p.image_id = i.id) AS prompt_text,
           COALESCE(
             json_agg(
               json_build_object('slug', c.slug, 'name_fa', c.name_fa)
               ORDER BY c.name_fa
             ) FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) AS categories
      FROM images i
      LEFT JOIN image_categories ic ON ic.image_id = i.id
      LEFT JOIN categories c ON c.id = ic.category_id${filterSql}
     GROUP BY i.id
     ORDER BY ${ORDER_BY[sort]}
     LIMIT $${limitPos} OFFSET $${offsetPos}`;

  return query<GalleryImage>(sql, params);
});

/**
 * تعداد کلِ عکس‌هایی که با فیلترِ فعلی می‌خوانند — بدون limit.
 *
 * چرا لازم است: getGalleryImages سقفِ limit دارد (پیش‌فرض ۶۰). اگر صفحه
 * «تعداد نتیجه» را از طول آن آرایه بسازد، با ۷۰۰ عکس عددِ «۶۰» نشان می‌دهد
 * که غلط است. این کوئری همان شرط‌ها را دارد ولی فقط می‌شمارد.
 *
 * بدون GROUP BY و بدون JOINِ دسته‌ها: چون شرط‌ها با EXISTS نوشته شده‌اند،
 * هیچ ردیفِ تکراری تولید نمی‌شود و count(*) درست است.
 */
export const countGalleryImages = cache(async function countGalleryImages(
  opts: GetGalleryImagesOptions = {}
): Promise<number> {
  const { conditions, params } = buildFilter(opts);
  const rows = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM images i${whereClause(conditions)}`,
    params
  );
  return rows[0]?.total ?? 0;
});

/**
 * همه دسته‌ها با تعداد عکس هرکدام — منبع چیپ‌های فیلتر.
 *
 * ترتیب بر اساس تعداد نزولی، نه id. با محتوای واقعی، «پرتره» ۶۲۴ عکس دارد و
 * «گروهی» ۴ عکس؛ ترتیبِ تعریف هیچ معنایی برای کاربر ندارد ولی ترتیبِ فراوانی
 * یعنی پرکاربردترین فیلترها اول دستِ کاربرند. name_fa به‌عنوان tie-breaker تا
 * ترتیب قطعی باشد.
 *
 * چرا search اینجا هم لازم است: بدون آن، شمارِ چیپ‌ها با نتیجه‌ی روی صفحه
 * نمی‌خواند. با جستجوی «bokeh»، چیپ می‌گفت «پرتره ۶۲۴» در حالی که نتیجه‌ی
 * واقعی ۹۰ بود — عددی که به کاربر دروغ می‌گوید بدتر از نبودنِ عدد است.
 *
 * شرطِ جستجو در ON همان LEFT JOIN می‌نشیند و نه در WHERE. تفاوتش مهم است: در
 * WHERE، دسته‌ای که هیچ تطبیقی ندارد کاملاً از فهرست حذف می‌شد و چیپ‌ها با هر
 * تایپِ کاربر می‌پریدند و جابه‌جا می‌شدند. در ON، دسته با شمارِ صفر می‌ماند و
 * کاربر می‌بیند که خالی است.
 */
export const getCategories = cache(async function getCategories(
  opts: { search?: string } = {}
): Promise<CategoryWithCount[]> {
  const { conditions, params } = buildFilter({ search: opts.search });
  const joinFilter = conditions.length > 0 ? `\n                          AND ${conditions.join("\n                          AND ")}` : "";

  return query<CategoryWithCount>(
    `SELECT c.slug,
            c.name_fa,
            count(i.id)::int AS image_count
       FROM categories c
       LEFT JOIN image_categories ic ON ic.category_id = c.id
       LEFT JOIN images i ON i.id = ic.image_id${joinFilter}
      GROUP BY c.id, c.slug, c.name_fa
      ORDER BY count(i.id) DESC, c.name_fa`,
    params
  );
});

/**
 * ------------------------ دستِ کارت‌های بالای صفحه ------------------------
 *
 * هر دسته با چند عکسِ تازه‌اش — منبعِ ریلِ دسته‌بندی و «دستِ کارت»های هیرو.
 *
 * چرا یک کوئری و نه یکی به‌ازای هر دسته: با ۱۱ دسته می‌شد ۱۱ رفت‌وبرگشت به
 * دیتابیس در مسیرِ بحرانیِ صفحه‌ی اول. row_number با PARTITION همه را در یک
 * رفت‌وبرگشت می‌دهد.
 *
 * چرا JOINِ معمولی و نه EXISTS (برخلافِ فیلترِ گالری): اینجا عمداً می‌خواهیم
 * یک عکسِ چنددسته‌ای در دستِ هر دسته‌اش دیده شود، پس تکرارِ ردیف مطلوب است.
 *
 * دسته‌ی بی‌عکس اصلاً برنمی‌گردد (JOIN و نه LEFT JOIN): دستِ خالی چیزی برای
 * نشان‌دادن ندارد و ریل را با دکمه‌ی مرده پر می‌کند.
 *
 * ترتیبِ خروجی همان ترتیبِ getCategories است (تعداد نزولی) تا ریلِ بالای صفحه
 * و چیپ‌های پایینِ صفحه یک ترتیب داشته باشند و کاربر دو نظمِ متفاوت نبیند.
 */

/** چند کارت در هر دست. چهار، چون دست دقیقاً چهار جایگاهِ بصری دارد. */
const HERO_CARDS_PER_DECK = 4;

/**
 * سقفِ متنِ پرامپت روی کارت.
 *
 * روی کارت فقط دو خط دیده می‌شود. فرستادنِ پرامپتِ کاملِ ~۱۲۰۰ کاراکتری برای
 * ۴۴ کارت یعنی ~۵۳ کیلوبایت متنِ HTML که ۹۵ درصدش هیچ‌وقت دیده نمی‌شود. متنِ
 * کامل جای خودش را در گرید و مودال دارد، همان‌جا که دکمه‌ی کپی هم هست.
 */
const HERO_PROMPT_EXCERPT = 190;

/** یک کارت در دستِ هیرو — عمداً سبک‌تر از GalleryImage. */
export type HeroCard = {
  id: string;
  url: string;
  title_fa: string | null;
  model_used: string | null;
  /** ابتدای پرامپت (بریده در HERO_PROMPT_EXCERPT) — فقط برای دیده‌شدن، نه کپی. */
  prompt_excerpt: string | null;
  width: number | null;
  height: number | null;
};

export type HeroDeck = {
  slug: string;
  name_fa: string;
  /** کلِ عکس‌های این دسته، نه تعدادِ کارت‌های همراه. */
  image_count: number;
  cards: HeroCard[];
};

export const getHeroDecks = cache(async function getHeroDecks(): Promise<HeroDeck[]> {
  return query<HeroDeck>(
    `WITH ranked AS (
       SELECT c.slug,
              c.name_fa,
              -- id در جاوااسکریپت رشته است (BIGINT)؛ داخل json_build_object
              -- بدون این cast عدد می‌شد و با بقیه‌ی کد نمی‌خواند.
              i.id::text AS id,
              i.url,
              i.title_fa,
              i.model_used,
              i.width,
              i.height,
              left(p.prompt_text, $2::int) AS prompt_excerpt,
              row_number() OVER (PARTITION BY c.id ORDER BY i.created_at DESC, i.id DESC) AS rn,
              count(*)     OVER (PARTITION BY c.id) AS total
         FROM categories c
         JOIN image_categories ic ON ic.category_id = c.id
         JOIN images i            ON i.id = ic.image_id
         -- LEFT: عکسی که هنوز پرامپتش ثبت نشده هم باید در دست دیده شود.
         LEFT JOIN prompts p      ON p.image_id = i.id
     )
     SELECT slug,
            name_fa,
            max(total)::int AS image_count,
            json_agg(
              json_build_object(
                'id',             id,
                'url',            url,
                'title_fa',       title_fa,
                'model_used',     model_used,
                'prompt_excerpt', prompt_excerpt,
                'width',          width,
                'height',         height
              ) ORDER BY rn
            ) AS cards
       FROM ranked
      WHERE rn <= $1::int
      GROUP BY slug, name_fa
      ORDER BY max(total) DESC, name_fa`,
    [HERO_CARDS_PER_DECK, HERO_PROMPT_EXCERPT]
  );
});
