import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  getGalleryImages,
  getCategories,
  countGalleryImages,
  getHeroDecks,
  PAGE_SIZE,
  type GalleryImage,
  type CategoryWithCount,
  type HeroDeck,
} from "@/lib/gallery";
import { GalleryGrid, type GalleryGridItem } from "./_components/gallery-grid";
import { CategoryTabs } from "./_components/category-tabs";
import { PromptSearch } from "./_components/prompt-search";
import { Pagination } from "./_components/pagination";
import { Hero } from "./_components/hero";
import { Search } from "./_components/icons";
import { galleryHref, parsePage } from "@/lib/urls";
import {
  isDatabaseConfigError,
  isUndefinedTableError,
  isUndefinedColumnError,
} from "@/lib/db";

/**
 * صفحه‌ی اصلی گالری.
 *
 * وضعیتِ کامل در URL است: /?category=<slug>&q=<عبارت>&page=<شماره>. یعنی هر
 * نمایی از گالری یک آدرسِ قابل‌فرستادن دارد و دکمه‌ی بازگشتِ مرورگر کار می‌کند.
 * در Next 16 پراپ searchParams یک Promise است و باید await شود؛ خواندنش صفحه را
 * dynamic می‌کند.
 *
 * چرا await connection()؟ محتوای گالری در زمان درخواست از دیتابیس خوانده می‌شود
 * و نباید در build کش شود (آن موقع DATABASE_URL واقعی وجود ندارد). در Next 16
 * راه درستِ خارج‌کردن از prerender همین است، نه «export const dynamic».
 */

const numFa = new Intl.NumberFormat("fa-IR");

/**
 * تاریخِ شمسی. timeZone صریح است تا خروجی به منطقهٔ زمانیِ ماشینِ سرور وابسته
 * نباشد — سرورِ Liara احتمالاً UTC است و بدون این، تاریخِ عکس‌های نزدیکِ
 * نیمه‌شب یک روز عقب نشان داده می‌شد.
 */
const dateFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Tehran",
});

// اگر ابعاد یک عکس در دیتابیس ثبت نشده باشد، این مقدارِ پیش‌فرض نسبت ۴:۵
// می‌سازد. عدد بزرگ انتخاب شده تا optimizer نکست srcset معقول بسازد؛ مقدار
// خیلی کوچک باعث تصویر تار می‌شد.
const FALLBACK_SIZE = { width: 600, height: 750 };

type LoadState =
  | {
      status: "ok";
      images: GalleryImage[];
      categories: CategoryWithCount[];
      activeSlug: string | null;
      query: string;
      /** نه دسته و نه جستجو — یعنی نمای اصلیِ گالری، بی‌توجه به شماره‌ی صفحه. */
      isUnfiltered: boolean;
      /** بلوکِ هیرو فقط در صفحه‌ی یکمِ نمای اصلی می‌آید. */
      showHero: boolean;
      /** تعدادِ نتیجه با فیلترِ کامل (دسته + جستجو) — عددی که کنارِ گرید می‌آید. */
      resultCount: number;
      /** تعداد با جستجو ولی بدون دسته — شمارِ چیپِ «همه». */
      searchTotal: number;
      /** دسته‌ها با چند عکسِ نمونه، برای دستِ کارت‌های بالای صفحه. */
      decks: HeroDeck[];
      /** صفحه‌ی فعلی (از ۱) و تعدادِ کلِ صفحه‌ها با همین فیلتر. */
      page: number;
      totalPages: number;
    }
  | { status: "config" }
  | { status: "missing" }
  /** جدول‌ها هستند ولی ستونی که کد می‌خواهد نیست → یک migration اجرا نشده. */
  | { status: "migrate"; detail: string }
  | { status: "empty" }
  /** ?page= از تعدادِ صفحه‌های واقعی بیشتر است → باید ۴۰۴ شود. */
  | { status: "out-of-range" }
  /** ?category= معتبر نیست → باید به همان آدرس بی‌آن ریدایرکت شود. */
  | { status: "bad-filter"; to: string }
  | { status: "error"; detail: string };

/**
 * داده‌ی صفحه را می‌خواند.
 *
 * اعتبارسنجی slug: اگر ?category= مقداری داشته باشد که جزو دسته‌های واقعی نیست
 * (مثلاً تایپی یا لینکِ قدیمی)، صفحه به همان آدرس بدونِ آن پارامتر ریدایرکت
 * می‌شود. دو راهِ دیگر هر دو غلط بودند: نمایشِ صفحه‌ی خالی به کاربر می‌گوید
 * «چیزی نیست» که دروغ است، و نادیده‌گرفتنِ بی‌صدای فیلتر (رفتارِ قبلی) یعنی
 * «?category=هرچیزی» یک آدرسِ ۲۰۰ با محتوای کاملاً تکراریِ گالری می‌شد — ضربدرِ
 * ۱۲ صفحه، از فضای آدرسِ بی‌پایان. همان محتوای تکراری‌ای که کلِ این صفحه‌بندی
 * برای گریز از آن نوشته شد.
 *
 * چرا هیرو فقط در صفحه‌ی یکمِ نمای بدون فیلتر: کاربری که جستجو کرده یا دسته زده
 * یا رفته صفحه‌ی سوم، دنبالِ نتیجه‌ی خودش است؛ یک بلوکِ بزرگِ متحرکِ بی‌ربط بالای
 * صفحه نتایجش را پایین می‌راند. پس در آن حالت داده‌ی هیرو اصلاً کوئری هم نمی‌شود.
 *
 * ⚠️ ترتیبِ کوئری در ORDER BY باید قطعی باشد (created_at DESC, id DESC) وگرنه
 * صفحه‌بندی می‌لنگد: با ترتیبِ نامعین، یک عکس می‌تواند هم در صفحه‌ی ۲ بیاید و هم
 * در ۳، و عکسِ دیگری در هیچ‌کدام. آن tie-breaker در lib/gallery.ts گذاشته شده.
 */
async function loadGallery(
  requestedSlug: string | undefined,
  query: string,
  page: number,
): Promise<LoadState> {
  try {
    const categories = await getCategories({ search: query || undefined });
    // دسته‌ای وجود ندارد → یعنی اسکیما ساخته شده ولی seed اجرا نشده.
    if (categories.length === 0) return { status: "empty" };

    if (requestedSlug && !categories.some((c) => c.slug === requestedSlug)) {
      // صفحه حفظ می‌شود: کاربری که «?category=غلط&page=5» را باز کرده، احتمالاً
      // لینکِ قدیمی‌ای داشته و صفحه‌ی ۵ همان چیزی است که می‌خواسته.
      return { status: "bad-filter", to: galleryHref({ q: query, page }) };
    }
    const activeSlug = requestedSlug ?? null;

    const filters = {
      sort: "newest" as const,
      categorySlug: activeSlug ?? undefined,
      search: query || undefined,
    };

    const isUnfiltered = activeSlug === null && query.length === 0;
    const showHero = isUnfiltered && page === 1;

    const [images, resultCount, searchTotalRaw, decks] = await Promise.all([
      getGalleryImages({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      countGalleryImages(filters),
      // بی‌فیلترِ دسته، این کوئری کلمه‌به‌کلمه همان کوئریِ بالاست و دو بار اجرا
      // می‌شد. React.cache هم نجاتش نمی‌داد: کلیدش برابریِ ارجاعیِ آرگومان‌هاست و
      // هر صدا زدن یک آبجکتِ تازه می‌فرستد، پس هیچ‌وقت اصابت نمی‌کند.
      activeSlug ? countGalleryImages({ search: query || undefined }) : Promise.resolve(null),
      showHero ? getHeroDecks() : Promise.resolve([]),
    ]);
    const searchTotal = searchTotalRaw ?? resultCount;

    // بدون هیچ فیلتری و بدون هیچ عکسی → دیتابیس واقعاً خالی است.
    // ⚠️ شرط روی resultCount است و نه images.length: با images.length، آدرسِ
    // «/?page=99» هم آرایه‌ی خالی می‌داد و صفحه پیامِ «هنوز عکسی اضافه نشده» را
    // نشان می‌داد — یعنی به کاربر می‌گفت گالری خالی است در حالی که ۷۰۰ عکس دارد.
    if (isUnfiltered && resultCount === 0) return { status: "empty" };

    // ۰ نتیجه هم یک صفحه است (همان صفحه‌ای که «چیزی پیدا نشد» را نشان می‌دهد).
    const totalPages = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));
    if (page > totalPages) return { status: "out-of-range" };

    return {
      status: "ok",
      images,
      categories,
      activeSlug,
      query,
      isUnfiltered,
      showHero,
      resultCount,
      searchTotal,
      decks,
      page,
      totalPages,
    };
  } catch (err) {
    if (isDatabaseConfigError(err)) return { status: "config" };
    if (isUndefinedTableError(err)) return { status: "missing" };
    // ستونِ غایب یعنی اسکیما از کد عقب‌تر است. این را از خطای عمومی جدا می‌کنیم
    // تا صفحه بگوید کدام فایل را اجرا کند، نه اینکه فقط متنِ خامِ Postgres را
    // نشان بدهد و کاربر حدس بزند.
    if (isUndefinedColumnError(err)) {
      return { status: "migrate", detail: err instanceof Error ? err.message : String(err) };
    }
    return { status: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * متادیتای صفحه.
 *
 * سه کارِ سئویی اینجا انجام می‌شود:
 *
 * ۱) کانونیکِ خودِ همان صفحه. مهم‌ترین نکته: صفحه‌ی ۲ به بعد کانونیکش را به
 *    صفحه‌ی ۱ نمی‌دهد. آن اشتباهِ رایج، همان مشکلی را که این صفحه‌بندی حل کرده
 *    از نو می‌سازد — گوگل صفحه‌های ۲ تا ۱۲ را «تکراری» می‌گیرد و ۶۴۰ عکس دوباره
 *    از فهرست بیرون می‌افتند.
 *
 * ۲) عنوانِ متفاوت برای هر صفحه. بدونش هر ۱۲ صفحه یک <title> یکسان دارند که
 *    هم برای گوگل نشانه‌ی محتوای تکراری است و هم در تبِ مرورگر بی‌فایده.
 *
 * ۳) noindex برای نمای جستجو. هر عبارتِ تایپ‌شده یک آدرس می‌سازد، پس بی این،
 *    خزنده در بی‌نهایت آدرسِ ?q= گم می‌شود. follow روشن می‌ماند تا لینک‌های
 *    داخلیِ همان صفحه دنبال شوند.
 *
 * ⚠️ عمداً هیچ کوئریِ دیتابیسی اینجا نیست. اگر برای ساختنِ عنوانِ دسته
 * getCategories را صدا می‌زدیم، در حالتِ قطعیِ دیتابیس این تابع throw می‌کرد و
 * کلِ صفحه ۵۰۰ می‌شد — درحالی‌که خودِ صفحه در همان حالت پیامِ راهنمای «به
 * دیتابیس وصل نشده‌ای» را نشان می‌دهد. نامِ فارسیِ دسته وقتی به عنوان اضافه
 * می‌شود که مسیرِ /category/[slug] ساخته شود و متادیتای خودش را داشته باشد.
 *
 * ⚠️ قبل از لانچ: NEXT_PUBLIC_SITE_URL باید در .env.local ست شود. بدونِ آن
 * metadataBase تعریف نمی‌شود و نکست کانونیک را نسبی می‌نویسد («/?page=2»).
 * برای dev بی‌مشکل است، ولی گوگل کانونیکِ مطلق می‌خواهد و کانونیکِ نسبی را
 * می‌تواند نادیده بگیرد — یعنی همان تلاشی که اینجا شده هدر می‌رود.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : null;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = parsePage(params.page);

  return {
    // صفحه‌ی ۱ عنوانِ پیش‌فرضِ layout را نگه می‌دارد.
    ...(page > 1 ? { title: `صفحه‌ی ${numFa.format(page)}` } : {}),
    // slugِ نامعتبر اینجا مسئله نیست: خودِ صفحه آن حالت را با ریدایرکت به
    // آدرسِ بی‌فیلتر می‌بندد، پس هیچ آدرسِ ۲۰۰ی با دسته‌ی جعلی وجود ندارد که
    // کانونیکِ خودش را بگیرد.
    alternates: { canonical: galleryHref({ category, q, page }) },
    robots: q ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // prerender را متوقف می‌کند؛ هرچه بعدش می‌آید در زمان درخواست اجرا می‌شود.
  await connection();

  const params = await searchParams;
  const rawCategory = params.category;
  const rawQuery = params.q;
  const requestedSlug = typeof rawCategory === "string" ? rawCategory : undefined;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const page = parsePage(params.page);

  const state = await loadGallery(requestedSlug, query, page);

  // ۴۰۴ واقعی برای صفحه‌ای که وجود ندارد، و نه یک صفحه‌ی خالی با کدِ ۲۰۰.
  // ⚠️ notFound() و redirect() باید اینجا صدا زده شوند و نه داخلِ loadGallery:
  // کارِ هر دو انداختنِ یک خطای خاصِ نکست است و آن try/catch بی‌خبر می‌گرفتشان و
  // به «خطا در خواندنِ گالری» تبدیلشان می‌کرد.
  if (state.status === "out-of-range") notFound();
  // ۳۰۷ و نه ۳۰۸: دسته‌ای که امروز وجود ندارد می‌تواند فردا اضافه شود، پس این
  // ریدایرکت را دائمی اعلام نمی‌کنیم که در کشِ مرورگرها ماندگار شود.
  if (state.status === "bad-filter") redirect(state.to);

  if (state.status !== "ok") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Notice state={state} />
      </div>
    );
  }

  const activeCategory = state.categories.find((c) => c.slug === state.activeSlug) ?? null;
  // شماره‌ی اولین و آخرین عکسِ همین صفحه در کلِ نتیجه — «۶۱ تا ۱۲۰ از ۷۰۰».
  const firstOnPage = (state.page - 1) * PAGE_SIZE + 1;
  const lastOnPage = firstOnPage + state.images.length - 1;

  // زیرنویسِ سرِ صفحه: بافتِ فیلتر و بعد جای کاربر در صفحه‌ها. هرکدام که نبود،
  // خط کوتاه‌تر می‌شود؛ اگر هیچ‌کدام نبود، زیرنویس اصلاً رندر نمی‌شود.
  const subtitle = [
    state.query && activeCategory ? `در دسته‌ی ${activeCategory.name_fa}` : null,
    state.totalPages > 1
      ? `صفحه‌ی ${numFa.format(state.page)} از ${numFa.format(state.totalPages)}`
      : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <>
      {/* هیرو ستونِ باریکِ خودش را دارد، پس بیرونِ ظرفِ گالری می‌نشیند. */}
      {state.showHero ? <Hero decks={state.decks} /> : null}

      {/* لنگرِ «مشاهده گالری» و «مشاهده این دسته‌بندی». فاصله‌ی زیرِ هدرِ چسبان
          را scroll-padding-top در globals.css می‌دهد، نه scroll-mt اینجا. */}
      <div id="gallery" className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6">
        {state.showHero ? null : (
          /* سرِ صفحه برای هر نمایی که هیرو ندارد: نمای فیلترشده، و صفحه‌ی ۲ به
             بعدِ نمای اصلی.
             ⚠️ شرط عمداً showHero است و نه isUnfiltered. با isUnfiltered،
             آدرس‌های «/?page=2» تا «/?page=12» هیچ <h1> نداشتند — یعنی ۱۱ تا از
             ۱۲ صفحه‌ی قابل‌فهرست‌شدنِ سایت، سندی بودند که تیترِ اولشان یک <h2>ی
             رویِ کارتِ عکس بود. هم برای کاربرِ اسکرین‌ریدر (که با تیترها ناوبری
             می‌کند) و هم برای گوگل، یک نقصِ واقعی بود.

             عبارتِ جستجو داخلِ گیومه و در جهتِ خودش می‌آید — عبارتِ انگلیسی
             داخلِ جمله‌ی فارسی بدون این، جای گیومه‌ها را جابه‌جا می‌کند. */
          <div className="flex flex-col gap-1 pt-8">
            <h1 className="text-xl font-extrabold sm:text-2xl">
              {state.query ? (
                <>
                  نتیجه‌ی جستجوی «<span dir="auto">{state.query}</span>»
                </>
              ) : (
                (activeCategory?.name_fa ?? "همه‌ی عکس‌ها")
              )}
            </h1>
            {/* زیرنویس فقط بافت می‌دهد و عدد نمی‌گوید.
                ⚠️ شمارِ نتیجه عمداً از اینجا برداشته شد: پیش‌تر در «دسته‌ی پرتره،
                صفحه‌ی ۳» صفحه هم «۶۲۴ عکس» را اینجا می‌نوشت و هم «۱۲۱ تا ۱۸۰ از
                ۶۲۴ عکس» را بالای گرید — دو عددِ ناهم‌خوان با فاصله‌ی پنج خط. حالا
                شمارش یک جا زندگی می‌کند: بالای گرید، جایی که کاربر کارت‌ها را
                می‌شمارد. */}
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
        )}

        {/* ابزارِ مرورِ گالری. نوارِ جستجو هرجا که هیرو نیست اینجاست — یعنی هم در
            نمای فیلترشده و هم در صفحه‌ی ۲ به بعدِ نمای اصلی. شرط روی showHero
            است و نه isUnfiltered، وگرنه در «/?page=2» صفحه هیچ فیلدِ جستجویی
            نداشت (چون میدانِ اصلی داخلِ هیرو زندگی می‌کند). */}
        <div
          className={`flex flex-col gap-4 border-t border-line pt-6 ${
            state.showHero ? "" : "mt-8"
          }`}
        >
          {state.showHero ? null : (
            <PromptSearch query={state.query} category={state.activeSlug} />
          )}
          <CategoryTabs
            categories={state.categories}
            activeSlug={state.activeSlug}
            query={state.query}
            totalCount={state.searchTotal}
          />
        </div>

        <div className="mt-6">
          {state.images.length > 0 ? (
            <>
              {/* با صفحه‌بندی، عددِ روی صفحه باید بازه بدهد نه فقط جمع؛ وگرنه
                  کاربر در صفحه‌ی ۳ می‌بیند «۷۰۰ عکس» و ۶۰ کارت می‌شمارد. */}
              <p className="mb-4 text-xs text-faint">
                {state.totalPages > 1
                  ? `${numFa.format(firstOnPage)} تا ${numFa.format(lastOnPage)} از ${numFa.format(state.resultCount)} عکس`
                  : `${numFa.format(state.resultCount)} عکس`}
              </p>
              <Grid images={state.images} />
              <Pagination
                page={state.page}
                totalPages={state.totalPages}
                filters={{ category: state.activeSlug, q: state.query }}
              />
            </>
          ) : (
            <NoResults query={state.query} categoryName={activeCategory?.name_fa ?? null} />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * ابعاد و تاریخ سمتِ سرور آماده می‌شوند و گریدِ کلاینتی فقط نمایش می‌دهد.
 *
 * ابعاد از دیتابیس می‌آید (ستون‌های images.width/height که اسکریپت import پر
 * می‌کند)، نه از فایل‌سیستم. نسخه‌ی قبلی به ازای هر رندر فایلِ هر عکس را کامل
 * می‌خواند تا چند بایتِ هدر را بگیرد (~۱۱۶ مگابایت I/O برای ۷۰۰ عکس)، و
 * پارسرش فقط PNG بود در حالی که محتوای واقعی jpg است.
 */
function Grid({ images }: { images: GalleryImage[] }) {
  const items: GalleryGridItem[] = images.map((img) => ({
    ...img,
    // اگر ابعاد در دیتابیس ثبت نشده باشد (مثلاً عکسی که دستی اضافه شده) به
    // نسبت ۴:۵ برمی‌گردیم؛ فقط همان یک کارت تقریبی می‌شود، نه کل گالری.
    width: img.width ?? FALLBACK_SIZE.width,
    height: img.height ?? FALLBACK_SIZE.height,
    dateFa: dateFa.format(img.created_at),
  }));

  return <GalleryGrid items={items} />;
}

/**
 * فیلتر فعال است ولی نتیجه‌ای ندارد.
 *
 * طبق راهنمای نوشتار، صفحه‌ی خالی یک دعوت به کنش است، نه اعلامِ شکست: می‌گوید
 * چه چیزی جواب نداد و بعد راهِ بیرون‌آمدن را می‌دهد. اگر هم جستجو و هم دسته
 * فعال باشند، «برداشتنِ دسته» احتمالاً چیزی که کاربر می‌خواهد را پیدا می‌کند،
 * پس همان اول پیشنهاد می‌شود.
 */
function NoResults({ query, categoryName }: { query: string; categoryName: string | null }) {
  return (
    <section className="flex items-center justify-center py-14">
      <div className="flex max-w-md flex-col items-center gap-1 text-center">
        {/* آیکن در ظرفِ آبیِ کم‌رنگ — همان الگوی حالتِ خالیِ ماک. */}
        <span
          className="mb-4 flex size-14 items-center justify-center rounded-mark bg-accent-soft text-accent"
          aria-hidden
        >
          <Search size={20} />
        </span>
        <h2 className="text-[13px] font-bold text-ink">
          {query ? (
            <>
              برای «<span dir="auto">{query}</span>» چیزی پیدا نشد
            </>
          ) : categoryName ? (
            `در دسته‌ی «${categoryName}» هنوز عکسی نیست`
          ) : (
            // در عمل نرسیدنی است (شرطِ empty در loadGallery جلویش را می‌گیرد)،
            // ولی اگر بین کوئریِ شمارش و کوئریِ عکس‌ها ردیفی حذف شود، بی این
            // شاخه متنِ «در دسته‌ی «null»» روی صفحه می‌رفت.
            "هنوز عکسی اینجا نیست"
          )}
        </h2>
        <p className="mb-4 text-[11.5px] leading-relaxed text-faint">
          {query && categoryName
            ? "شاید با برداشتنِ فیلترِ دسته نتیجه بدهد. جستجو در متنِ پرامپت، عنوان و نامِ دسته انجام می‌شود."
            : query
              ? "جستجو در متنِ پرامپت، عنوان و نامِ دسته انجام می‌شود. یکی از واژه‌های بالا را امتحان کن."
              : "به‌زودی پر می‌شود."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {query && categoryName ? (
            <Link
              href={galleryHref({ q: query })}
              scroll={false}
              className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-white shadow-chip"
            >
              جستجو در همه‌ی دسته‌ها
            </Link>
          ) : null}
          <Link
            href="/"
            scroll={false}
            className="rounded-full bg-accent-soft px-4 py-2 text-xs font-bold text-accent"
          >
            دیدنِ همه‌ی عکس‌ها
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * حالت‌های غیرعادی. طبق راهنمای نوشتار: خطا عذرخواهی نمی‌کند و مبهم نیست —
 * می‌گوید چه شده و قدمِ بعدی چیست.
 *
 * حالت‌های راه‌اندازی (config/missing/migrate/empty) خطا نیستند و رنگِ هشدار
 * نمی‌گیرند؛ فقط خطای غیرمنتظره رنگِ alert دارد.
 *
 * دستور و مسیرِ فایل داخلِ کادرِ مونواسپیس با dir="ltr" می‌نشینند — قاعده‌ی
 * ثابتِ سایت: هرچه ماشین می‌خوانَدش، LTR و مونواسپیس. کلاسِ کمکیِ .plate که
 * قبلاً این کار را می‌کرد حذف شد و کلاس‌ها اینجا صریح نوشته شده‌اند، چون تنها
 * دو جا لازم بودند و یک کلاسِ سراسری برای دو مورد، سیستمِ رنگ را دوتکه نگه
 * می‌داشت.
 */
const CODE_BOX = "rounded-plate border border-line bg-surface font-mono text-ink-code";

/**
 * out-of-range و bad-filter هم از نوعِ ورودی بیرون‌اند: آن دو حالت پیش از
 * رسیدن به اینجا با notFound() و redirect() صفحه را ترک می‌کنند. اگر بیرونشان
 * نمی‌گذاشتیم، TypeScript درست اعتراض می‌کرد که برای آن کلیدها هیچ متنی در
 * جدولِ پایین نیست.
 */
function Notice({
  state,
}: {
  state: Exclude<LoadState, { status: "ok" } | { status: "out-of-range" } | { status: "bad-filter" }>;
}) {
  const content: { alert: boolean; title: string; body: string; command?: string } = {
    config: {
      alert: false,
      title: "هنوز به دیتابیس وصل نشده‌ای",
      body: "این حالت تا پیش از راه‌اندازی طبیعی است. رشته‌ی اتصالِ Postgres را در فایلِ .env.local بگذار و سرور را ری‌استارت کن.",
      command: "DATABASE_URL=postgres://…",
    },
    missing: {
      alert: false,
      title: "جدول‌ها هنوز ساخته نشده‌اند",
      body: "اتصال برقرار است اما اسکیمای دیتابیس خالی است. این فایل را در کنسولِ SQL اجرا کن:",
      command: "db/schema.sql",
    },
    migrate: {
      alert: false,
      title: "اسکیمای دیتابیس از کد عقب‌تر است",
      body: "جدول‌ها هستند، ولی ستونی که کد می‌خواند در آن‌ها نیست. علتش این است که schema.sql با CREATE TABLE IF NOT EXISTS نوشته شده و روی دیتابیسی که جدولش از قبل ساخته شده، ستونِ تازه را بی‌صدا اضافه نمی‌کند. این دو قدم حلش می‌کند:",
      command:
        "-- 1) run in the SQL console:\ndb/migrations/001-add-image-dimensions.sql\n\n# 2) then in the terminal:\nnode scripts/import-content.mjs --reset",
    },
    empty: {
      alert: false,
      title: "هنوز عکسی اضافه نشده",
      body: "اسکیما ساخته شده ولی داده‌ای نیست. برای وارد کردنِ محتوا این را اجرا کن:",
      command: "node scripts/import-content.mjs --reset",
    },
    error: {
      alert: true,
      title: "خطا در خواندنِ گالری",
      body: "کوئری یا اتصال با خطا مواجه شد. متنِ خطا برای دیباگ پایین آمده.",
    },
  }[state.status];

  return (
    <section className="flex items-center justify-center py-20">
      <div
        className={`flex w-full max-w-lg flex-col gap-3 rounded-card border p-6 ${
          content.alert ? "border-alert/25 bg-alert-wash" : "border-line bg-canvas shadow-card"
        }`}
      >
        <h1 className={`text-lg font-bold ${content.alert ? "text-alert" : "text-ink"}`}>
          {content.title}
        </h1>
        <p className={`text-sm leading-relaxed ${content.alert ? "text-alert" : "text-muted"}`}>
          {content.body}
        </p>
        {content.command ? (
          <p dir="ltr" className={`${CODE_BOX} overflow-x-auto whitespace-pre px-3 py-2 text-[13px]`}>
            {content.command}
          </p>
        ) : null}
        {/* متنِ خودِ Postgres. در حالتِ migrate همین است که می‌گوید کدام ستون
            غایب است، پس اطلاعِ لازم است نه صرفاً دیباگ — ولی رنگِ هشدار نمی‌گیرد. */}
        {state.status === "error" || state.status === "migrate" ? (
          <pre dir="ltr" className={`${CODE_BOX} overflow-x-auto p-3 text-xs leading-relaxed`}>
            {state.detail}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
