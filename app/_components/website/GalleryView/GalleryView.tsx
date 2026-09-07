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
import { GalleryGrid, type GalleryGridItem } from "@/app/_components/website/GalleryGrid";
import { CategoryTabs } from "@/app/_components/website/CategoryTabs";
import { PromptSearch } from "@/app/_components/website/PromptSearch";
import { Pagination } from "@/app/_components/ui/Pagination";
import { Hero } from "@/app/_components/website/Hero";
import { Search } from "@/app/_components/ui/Icons";
import { galleryHref } from "@/lib/urls";
import { DbNotice, classifyDbError, errorDetail, type DbNoticeKind } from "@/app/_components/website/DbNotice";

/**
 * بدنه‌ی گالری و خواندنِ داده‌اش — مشترکِ «/» و «/category/[slug]».
 *
 * ── چرا این فایل وجود دارد ──
 * دو مسیر یک گالری‌اند با یک تفاوتِ کوچک: یکی همه‌ی عکس‌ها را نشان می‌دهد و بلوکِ
 * هیرو دارد، آن یکی به یک دسته محدود است و ندارد. باقی‌اش — چیپ‌ها، جستجو،
 * شمارِ نتیجه، گرید، صفحه‌بندی، حالتِ خالی، شش حالتِ خرابیِ دیتابیس — کلمه‌به‌کلمه
 * یکی است. با کپی‌کردنِ آن‌ها در دو فایل، هر اصلاحی باید دو بار انجام می‌شد و
 * دیر یا زود یکی جا می‌ماند: همان اتفاقی که با دو نسخه‌ی «فیلترِ جستجو» می‌رفت
 * بیفتد و به همین دلیل buildFilter در lib/gallery.ts مشترک شد.
 *
 * ── مرزِ مسئولیت ──
 * این فایل داده می‌خواند و رندر می‌کند، ولی هیچ‌وقت notFound() یا redirect()
 * صدا نمی‌زند. آن دو با انداختنِ یک خطای خاصِ نکست کار می‌کنند و اگر داخلِ
 * try/catchِ همین‌جا می‌افتادند، به «خطا در خواندنِ گالری» ترجمه می‌شدند. پس
 * loadGalleryView حالتِ لازم را *برمی‌گرداند* و تصمیمش با خودِ صفحه است — که
 * برای دو مسیر هم فرق می‌کند: slugِ ناشناس در «/» یک ریدایرکت است و در
 * «/category/x» یک ۴۰۴ی واقعی.
 *
 * ⚠️ سرور-فقط: از lib/gallery و در نتیجه از pg استفاده می‌کند. هیچ‌وقت
 * "use client" نگیرد و در کامپوننتِ کلاینتی ایمپورت نشود.
 */

const numFa = new Intl.NumberFormat("fa-IR");

// اگر ابعاد یک عکس در دیتابیس ثبت نشده باشد، این مقدارِ پیش‌فرض نسبت ۴:۵
// می‌سازد. عدد بزرگ انتخاب شده تا optimizer نکست srcset معقول بسازد؛ مقدار
// خیلی کوچک باعث تصویر تار می‌شد.
const FALLBACK_SIZE = { width: 600, height: 750 };

/** آنچه یک مسیر برای ساختنِ نمای گالری می‌دهد. */
export type GalleryViewRequest = {
  /** دسته‌ی فعال، یا null برای نمای کاملِ گالری. */
  slug: string | null;
  /** عبارتِ جستجو، از قبل trim شده. رشته‌ی خالی یعنی بی‌جستجو. */
  query: string;
  /** شماره‌ی صفحه از ۱ — خروجیِ parsePage. */
  page: number;
  /**
   * آیا این مسیر اجازه‌ی بلوکِ هیرو دارد؟
   *
   * فقط «/» می‌دهد. صفحه‌ی دسته نه: هیروْ دستِ کارت‌های *همه‌ی* دسته‌هاست و
   * گذاشتنش بالای «پرتره» یعنی اولین چیزی که کاربر می‌بیند ده دسته‌ی دیگر است،
   * نه چیزی که رویش کلیک کرده.
   */
  allowHero: boolean;
};

export type GalleryViewState =
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
  /**
   * هر حالتی که به‌جای گرید یک پیام می‌گیرد: از «هنوز وصل نشده‌ای» تا «خطای
   * غیرمنتظره». شناختنِ نوع و متنش کارِ db-notice.tsx است، نه این فایل — همان
   * پیام‌ها را صفحه‌ی /image/[id] هم لازم داشت و دو نسخه‌ی جدا واگرا می‌شدند.
   */
  | { status: "notice"; kind: DbNoticeKind; detail?: string }
  /** ?page= از تعدادِ صفحه‌های واقعی بیشتر است → باید ۴۰۴ شود. */
  | { status: "out-of-range" }
  /**
   * slugِ خواسته‌شده جزو دسته‌های واقعی نیست.
   *
   * عمداً خودِ حالت برگردانده می‌شود و نه یک آدرسِ ریدایرکت: «/» آن را با حذفِ
   * فیلتر ریدایرکت می‌کند، ولی «/category/<جعلی>» باید ۴۰۴ی واقعی بدهد چون در
   * یک مسیرِ مسیری، آدرسی که وجود ندارد یعنی صفحه‌ای که وجود ندارد.
   */
  | { status: "unknown-category" };

/**
 * داده‌ی نمای گالری را می‌خواند.
 *
 * چرا هیرو فقط در صفحه‌ی یکمِ نمای بدون فیلتر: کاربری که جستجو کرده یا دسته زده
 * یا رفته صفحه‌ی سوم، دنبالِ نتیجه‌ی خودش است؛ یک بلوکِ بزرگِ متحرکِ بی‌ربط بالای
 * صفحه نتایجش را پایین می‌راند. پس در آن حالت داده‌ی هیرو اصلاً کوئری هم نمی‌شود.
 *
 * ⚠️ ترتیبِ کوئری در ORDER BY باید قطعی باشد (created_at DESC, id DESC) وگرنه
 * صفحه‌بندی می‌لنگد: با ترتیبِ نامعین، یک عکس می‌تواند هم در صفحه‌ی ۲ بیاید و هم
 * در ۳، و عکسِ دیگری در هیچ‌کدام. آن tie-breaker در lib/gallery.ts گذاشته شده.
 */
export async function loadGalleryView({
  slug,
  query,
  page,
  allowHero,
}: GalleryViewRequest): Promise<GalleryViewState> {
  try {
    const categories = await getCategories({ search: query || undefined });
    // دسته‌ای وجود ندارد → یعنی اسکیما ساخته شده ولی seed اجرا نشده.
    // ⚠️ این پیام حتی در مسیرِ دسته هم بر ۴۰۴ مقدم است: وقتی جدولِ دسته‌ها خالی
    // است، «این دسته پیدا نشد» جوابِ درستی نیست — مشکل یک مرحله عقب‌تر است.
    if (categories.length === 0) return { status: "notice", kind: "empty" };

    if (slug && !categories.some((c) => c.slug === slug)) {
      return { status: "unknown-category" };
    }
    const activeSlug = slug;

    const filters = {
      sort: "newest" as const,
      categorySlug: activeSlug ?? undefined,
      search: query || undefined,
    };

    const isUnfiltered = activeSlug === null && query.length === 0;
    const showHero = allowHero && isUnfiltered && page === 1;

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
    if (isUnfiltered && resultCount === 0) return { status: "notice", kind: "empty" };

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
    // تشخیصِ نوعِ خطا و متنش هر دو در db-notice.tsx است. اینجا فقط منتقلش
    // می‌کنیم تا این فایل درگیرِ predicateهای lib/db نباشد.
    return { status: "notice", kind: classifyDbError(err), detail: errorDetail(err) };
  }
}

/** پیامِ خرابیِ دیتابیس در ظرفِ استانداردِ صفحه‌های گالری. */
export function GalleryNotice({ kind, detail }: { kind: DbNoticeKind; detail?: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <DbNotice kind={kind} detail={detail} />
    </div>
  );
}

/**
 * نمای گالری در حالتِ موفق.
 *
 * ⚠️ فقط با state.status === "ok" صدا زده می‌شود؛ حالت‌های دیگر تصمیمِ خودِ
 * صفحه‌اند (بالا). امضای پراپ همین را تحمیل می‌کند تا فراموش‌شدنی نباشد.
 *
 * title: عنوانِ <h1> در نمای بی‌جستجو — «همه‌ی عکس‌ها» برای «/» و نامِ فارسیِ
 * دسته برای «/category/x». نمای جستجو عنوانش را *اینجا* می‌سازد و نه در صفحه:
 * آن جمله یک ریزه‌کاریِ دوجهته دارد (عبارتِ لاتین داخلِ جمله‌ی فارسی باید
 * dir="auto" بگیرد وگرنه گیومه‌ها جابه‌جا می‌شوند) و کپی‌شدنش در دو صفحه یعنی
 * یکی‌شان روزی بی‌آن نوشته شود.
 */
export function GalleryView({
  state,
  title,
  intro,
}: {
  state: Extract<GalleryViewState, { status: "ok" }>;
  title: string;
  /** خطِ توضیحیِ اختیاریِ زیرِ عنوان (صفحه‌ی دسته: توضیحِ خودِ دسته). */
  intro?: string | null;
}) {
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
             می‌کند) و هم برای گوگل، یک نقصِ واقعی بود. */
          <div className="flex flex-col gap-1 pt-8">
            {/* عبارتِ جستجو داخلِ گیومه و در جهتِ خودش می‌آید — عبارتِ انگلیسی
                داخلِ جمله‌ی فارسی بدون این، جای گیومه‌ها را جابه‌جا می‌کند. */}
            <h1 className="text-xl font-extrabold sm:text-2xl">
              {state.query ? (
                <>
                  نتیجه‌ی جستجوی «<span dir="auto">{state.query}</span>»
                </>
              ) : (
                title
              )}
            </h1>
            {/* زیرنویس فقط بافت می‌دهد و عدد نمی‌گوید.
                ⚠️ شمارِ نتیجه عمداً از اینجا برداشته شد: پیش‌تر در «دسته‌ی پرتره،
                صفحه‌ی ۳» صفحه هم «۶۲۴ عکس» را اینجا می‌نوشت و هم «۱۲۱ تا ۱۸۰ از
                ۶۲۴ عکس» را بالای گرید — دو عددِ ناهم‌خوان با فاصله‌ی پنج خط. حالا
                شمارش یک جا زندگی می‌کند: بالای گرید، جایی که کاربر کارت‌ها را
                می‌شمارد. */}
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
            {/* توضیحِ دسته فقط در صفحه‌ی یکمِ بی‌جستجو می‌آید: در صفحه‌ی ۵ یا در
                نتیجه‌ی جستجو، متنِ وصفیِ دسته دیگر بافت نمی‌دهد و فقط نتیجه‌ها را
                پایین می‌راند. */}
            {intro && !state.query && state.page === 1 ? (
              <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">{intro}</p>
            ) : null}
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
                // ⚠️ فیلترهای فعال باید در لینکِ هر صفحه بمانند، وگرنه صفحه‌ی ۲
                //    دسته و عبارتِ جستجو را می‌اندازد.
                href={(p) => galleryHref({ category: state.activeSlug, q: state.query, page: p })}
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
 * ردیفِ کاملِ دیتابیس را به آیتمِ باریکِ گرید تبدیل می‌کند.
 *
 * دو کارِ کوچک، ولی هر دو لازم:
 * ۱) ابعاد از دیتابیس می‌آید (ستون‌های images.width/height که اسکریپت import پر
 *    می‌کند) و nullها اینجا با مقدارِ جانشین پر می‌شوند، پس گریدْ ابعادِ قطعی
 *    می‌گیرد. نسخه‌ی قدیمی به ازای هر رندر فایلِ هر عکس را کامل می‌خواند تا چند
 *    بایتِ هدر را بگیرد (~۱۱۶ مگابایت I/O برای ۷۰۰ عکس) و پارسرش هم فقط PNG بود
 *    در حالی که محتوای واقعی jpg است.
 * ۲) فقط چهار فیلدِ لازم انتخاب می‌شود.
 *
 * ⚠️ عمداً {...img} نیست. با spread، متنِ کاملِ ۶۰ پرامپت و آرایه‌ی دسته‌ها هم
 * وارد payloadِ صفحه می‌شد (حدودِ ۷۰ کیلوبایت) که هیچ کارتی نمایشش نمی‌دهد.
 */
function Grid({ images }: { images: GalleryImage[] }) {
  const items: GalleryGridItem[] = images.map((img) => ({
    id: img.id,
    url: img.url,
    title_fa: img.title_fa,
    // اگر ابعاد در دیتابیس ثبت نشده باشد (مثلاً عکسی که دستی اضافه شده) به
    // نسبت ۴:۵ برمی‌گردیم؛ فقط همان یک کارت تقریبی می‌شود، نه کل گالری.
    width: img.width ?? FALLBACK_SIZE.width,
    height: img.height ?? FALLBACK_SIZE.height,
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
            // در عمل نرسیدنی است (شرطِ empty در loadGalleryView جلویش را
            // می‌گیرد)، ولی اگر بین کوئریِ شمارش و کوئریِ عکس‌ها ردیفی حذف شود،
            // بی این شاخه متنِ «در دسته‌ی «null»» روی صفحه می‌رفت.
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
