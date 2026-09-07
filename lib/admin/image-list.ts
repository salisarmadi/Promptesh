import { parsePage } from "@/lib/urls";

/**
 * واژگانِ آدرسِ فهرستِ تصاویرِ پنل: خواندنِ searchParams و ساختنِ لینک.
 *
 * ⚠️ این فایل باید خالص بماند — هیچ import از @/lib/db یا هر چیزی که به pg
 *    برسد. دلیلش فنی است و نه سلیقه‌ای: نوارِ فیلتر یک کامپوننتِ کلاینتی است و
 *    همین ثابت‌ها را در مرورگر لازم دارد. اگر این فایل به لایه‌ی دیتابیس وصل
 *    شود، باندلِ مرورگر به pg وصل می‌شود و بیلد می‌شکند (در بهترین حالت) یا
 *    رشته‌ی اتصال به کلاینت می‌رود (در بدترین حالت).
 *
 * چرا از galleryHref استفاده نشده: آن تابع عمداً برای آدرسِ «/» ساخته شده و
 * برای فیلترِ خالی «/» برمی‌گرداند. پنل مسیرِ خودش را دارد و محورهای فیلترِ
 * دیگری (missing، sort). پس این نسخه‌ی موازی نیست، مقصدِ دیگری است. تنها چیزی
 * که واقعاً مشترک است — پاک‌سازیِ ?page= — از همان‌جا import می‌شود.
 */

export const ADMIN_IMAGES_PATH = "/admin/images";

// ---------------------------------------------------------------------------
// محورهای فیلتر
// ---------------------------------------------------------------------------

/**
 * فیلترِ «این فیلد پر نشده».
 *
 * ⚠️ این چهار مقدار قرارداد بین سه جا هستند: کارتِ «کامل‌بودنِ داده» در داشبورد
 *    که به ?missing=… لینک می‌دهد، این صفحه که آن را می‌خواند، و
 *    MISSING_CONDITION در lib/admin/images.ts که SQLش را می‌سازد. عوض‌کردنِ
 *    یکی بی دیگری، لینکِ داشبورد را بی‌صدا بی‌اثر می‌کند.
 */
export type MissingField = "prompt" | "title" | "category" | "dimensions";

/**
 * گزینه‌ها همراهِ برچسبِ فارسی، یک‌جا.
 *
 * برچسب و مقدار عمداً کنارِ هم‌اند و نه در دو فایل: با جدا بودنشان، افزودنِ
 * محورِ پنجم یعنی یک مقدار بی‌برچسب که در <select> خالی دیده می‌شود و
 * TypeScript هم چیزی نمی‌گوید.
 */
export const MISSING_OPTIONS: readonly { value: MissingField; label: string }[] = [
  { value: "prompt", label: "بدونِ متنِ پرامپت" },
  { value: "title", label: "بدونِ عنوانِ فارسی" },
  { value: "category", label: "بدونِ دسته‌بندی" },
  { value: "dimensions", label: "بدونِ ابعاد" },
];

/** ترتیب‌های مجاز. رشته‌ی SQLشان در lib/admin/images.ts نگاشت می‌شود. */
export type ImageListSort = "newest" | "oldest" | "updated" | "title";

export const SORT_OPTIONS: readonly { value: ImageListSort; label: string }[] = [
  { value: "newest", label: "تازه‌ترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "updated", label: "آخرین ویرایش" },
  { value: "title", label: "عنوان (الفبایی)" },
];

export const DEFAULT_SORT: ImageListSort = "newest";

// ---------------------------------------------------------------------------
// خواندن از آدرس
// ---------------------------------------------------------------------------

/** وضعیتِ کاملِ فهرست، پاک‌سازی‌شده و قابل‌اعتماد. */
export type ImageListQuery = {
  /** عبارتِ جستجو، trim شده. رشته‌ی خالی یعنی بی‌جستجو. */
  q: string;
  /** slug دسته‌ی فعال، یا null. */
  category: string | null;
  /** محورِ «پر نشده»، یا null. */
  missing: MissingField | null;
  sort: ImageListSort;
  /** از ۱. */
  page: number;
};

export type RawSearchParams = { [key: string]: string | string[] | undefined };

/**
 * پارامترِ تکراری در آدرس («?q=a&q=b») آرایه می‌شود. اولی را می‌گیریم و نه
 * آرایه را، وگرنه در مقایسه‌ها بی‌صدا رد می‌شود و فیلتر بی‌اثر می‌ماند.
 */
function first(raw: string | string[] | undefined): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return null;
}

/**
 * searchParams خام → وضعیتِ معتبر.
 *
 * هر مقدارِ ناشناخته بی‌صدا به پیش‌فرض برمی‌گردد و ۴۰۴ نمی‌دهد: آدرسِ پنل را
 * مدیر دستی هم عوض می‌کند و «?sort=xyz» نباید صفحه را بیندازد. مهم‌تر اینکه
 * مقدارِ ناشناخته هرگز به SQL نمی‌رسد — ORDER_BY یک نگاشتِ ثابت است.
 */
export function parseImageListQuery(params: RawSearchParams): ImageListQuery {
  const rawMissing = first(params.missing);
  const rawSort = first(params.sort);
  const rawCategory = first(params.category);

  const missing = MISSING_OPTIONS.some((o) => o.value === rawMissing)
    ? (rawMissing as MissingField)
    : null;

  const sort = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? (rawSort as ImageListSort)
    : DEFAULT_SORT;

  return {
    q: (first(params.q) ?? "").trim(),
    category: rawCategory && rawCategory.length > 0 ? rawCategory : null,
    missing,
    sort,
    page: parsePage(first(params.page) ?? undefined),
  };
}

// ---------------------------------------------------------------------------
// ساختنِ آدرس
// ---------------------------------------------------------------------------

/**
 * ورودیِ imageListHref.
 *
 * ⚠️ چرا Partial<ImageListQuery> نیست: در ImageListQuery فیلدِ page عددِ خالص
 *    است (همیشه معتبر، از ۱). ولی *هنگامِ ساختنِ لینک* لازم است بشود گفت «صفحه
 *    را بردار» — مثلاً وقتی فیلتر عوض می‌شود، ماندن روی صفحه‌ی ۵ بی‌معناست.
 *    با Partial تنها راهِ این کار حذفِ کلید بود، که با spread کردنِ فیلترهای
 *    فعلی («{ ...filters, page: … }») ناسازگار است. پس همه‌ی محورها اینجا null
 *    می‌پذیرند و null یعنی «این محور در آدرس نیاید».
 */
export type ImageListHrefPatch = {
  q?: string | null;
  category?: string | null;
  missing?: MissingField | null;
  sort?: ImageListSort | null;
  page?: number | null;
};

/**
 * لینکِ فهرست با فیلترهای داده‌شده.
 *
 * مقدارهای پیش‌فرض (sortِ پیش‌فرض، صفحه‌ی ۱، فیلترِ خالی) در آدرس نوشته
 * نمی‌شوند. برای پنل مسئله‌ی سئو نیست (کلِ /admin نو‌ایندکس است)، مسئله این
 * است که مدیر آدرس را کپی و پیست می‌کند و
 * «/admin/images?q=&category=&missing=&sort=newest&page=1» یعنی هیچ‌کس نمی‌فهمد
 * چه فیلتری فعال است.
 *
 * ترتیبِ پارامترها ثابت است تا دو فیلترِ یکسان همیشه یک رشته بدهند — که
 * مقایسه‌ی «آیا این لینک همین صفحه است» را ممکن می‌کند.
 *
 * ⚠️ نبودِ کلید و بودنِ کلید با مقدارِ null یکی نیستند:
 *      imageListHref({ ...q })                → همان فیلترها
 *      imageListHref({ ...q, missing: null }) → همان فیلترها منهای missing
 *    پس برای «پاک‌کردنِ یک محور» باید صریحاً null داد، نه حذفِ کلید.
 */
export function imageListHref(filters: ImageListHrefPatch = {}): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.missing) params.set("missing", filters.missing);
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(Math.trunc(filters.page)));

  const qs = params.toString();
  return qs.length > 0 ? `${ADMIN_IMAGES_PATH}?${qs}` : ADMIN_IMAGES_PATH;
}

/**
 * آیا فیلتری فعال است؟
 *
 * لازم است چون «نتیجه‌ای نیست» دو معنای کاملاً متفاوت دارد: گالریِ خالی (کارِ
 * بعدی: تصویر اضافه کن) در برابر فیلترِ بی‌نتیجه (کارِ بعدی: فیلتر را بردار).
 * sort و page عمداً حساب نمی‌شوند — هیچ‌کدام نتیجه‌ای را حذف نمی‌کنند.
 */
export function hasActiveFilter(q: ImageListQuery): boolean {
  return q.q.length > 0 || q.category !== null || q.missing !== null;
}
