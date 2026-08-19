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
 * هر تابع با React.cache پیچیده شده تا اگر در یک درخواست چند بار صدا زده شود
 * (مثلاً هم در صفحه هم در متادیتا) کوئری یک‌بار اجرا شود.
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
  /** حداکثر تعداد ردیف (برای صفحه‌بندی/اسکرول بی‌نهایت آینده). */
  limit?: number;
  /** پرش از ابتدای نتایج (صفحه‌بندی). */
  offset?: number;
};

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;

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

  const params: unknown[] = [];
  let filterSql = "";

  if (opts.categorySlug) {
    params.push(opts.categorySlug);
    filterSql = `
       WHERE EXISTS (
               SELECT 1
                 FROM image_categories f
                 JOIN categories fc ON fc.id = f.category_id
                WHERE f.image_id = i.id
                  AND fc.slug = $${params.length}
             )`;
  }

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
 * همه دسته‌ها با تعداد عکس هرکدام — منبع تب‌های بالای گالری.
 * LEFT JOIN تا دسته‌ی بدون عکس هم با شمارِ صفر بیاید. به ترتیب id (همان ترتیب
 * تعریف در seed: کاپل، پروفایل، هنری، فانتزی، طبیعت).
 */
export const getCategories = cache(async function getCategories(): Promise<
  CategoryWithCount[]
> {
  return query<CategoryWithCount>(
    `SELECT c.slug,
            c.name_fa,
            count(ic.image_id)::int AS image_count
       FROM categories c
       LEFT JOIN image_categories ic ON ic.category_id = c.id
      GROUP BY c.id, c.slug, c.name_fa
      ORDER BY c.id`
  );
});
