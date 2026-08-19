import { connection } from "next/server";
import Link from "next/link";
import { getGalleryImages, getCategories, type GalleryImage, type CategoryWithCount } from "@/lib/gallery";
import { GalleryGrid, type GalleryGridItem } from "./_components/gallery-grid";
import { CategoryTabs } from "./_components/category-tabs";
import { isDatabaseConfigError, isUndefinedTableError } from "@/lib/db";

/**
 * صفحه اصلی گالری — گرید عکس‌ها، جدیدترین اول، با تب‌های فیلتر دسته‌بندی.
 *
 * فیلتر دسته از طریق searchParams است: /?category=<slug>. در Next 16 پراپ
 * searchParams یک Promise است و باید await شود؛ خواندنش صفحه را dynamic می‌کند.
 *
 * چرا await connection()؟ محتوای گالری در زمان درخواست از دیتابیس خوانده می‌شود
 * و نباید در build کش شود (آن موقع DATABASE_URL واقعی وجود ندارد). در Next 16
 * راه درستِ خارج‌کردن از prerender همین است، نه «export const dynamic».
 */

const numFa = new Intl.NumberFormat("fa-IR");

// اگر ابعاد یک عکس در دیتابیس ثبت نشده باشد، این مقدارِ پیش‌فرض نسبت ۴:۵
// می‌سازد. عدد بزرگ انتخاب شده تا optimizer نکست srcset معقول بسازد؛ مقدار
// خیلی کوچک باعث تصویر تار می‌شد.
const FALLBACK_SIZE = { width: 600, height: 750 };

type LoadState =
  | { status: "ok"; images: GalleryImage[]; categories: CategoryWithCount[]; activeSlug: string | null }
  | { status: "config" }
  | { status: "missing" }
  | { status: "empty" }
  | { status: "error"; detail: string };

/**
 * داده‌ی صفحه را می‌خواند: دسته‌ها (برای تب‌ها) و عکس‌ها (فیلترشده یا کامل).
 *
 * اعتبارسنجی slug: اگر ?category= مقداری داشته باشد که جزو دسته‌های واقعی نیست
 * (مثلاً تایپی)، به‌جای نمایش صفحه‌ی خالی، فیلتر نادیده گرفته می‌شود و همه می‌آید.
 */
async function loadGallery(requestedSlug?: string): Promise<LoadState> {
  try {
    const categories = await getCategories();
    // دسته‌ای وجود ندارد → یعنی seed هنوز اجرا نشده.
    if (categories.length === 0) return { status: "empty" };

    const activeSlug =
      requestedSlug && categories.some((c) => c.slug === requestedSlug) ? requestedSlug : null;

    const images = await getGalleryImages({ sort: "newest", categorySlug: activeSlug ?? undefined });

    // بدون فیلتر و بدون هیچ عکسی → واقعاً خالی. با فیلترِ معتبرِ خالی، حالت ok
    // برمی‌گردد تا تب‌ها بمانند و پیامِ «این دسته خالی است» نمایش داده شود.
    if (activeSlug === null && images.length === 0) return { status: "empty" };

    return { status: "ok", images, categories, activeSlug };
  } catch (err) {
    if (isDatabaseConfigError(err)) return { status: "config" };
    if (isUndefinedTableError(err)) return { status: "missing" };
    return { status: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // prerender را متوقف می‌کند؛ هرچه بعدش می‌آید در زمان درخواست اجرا می‌شود.
  await connection();

  const rawCategory = (await searchParams).category;
  const requestedSlug = typeof rawCategory === "string" ? rawCategory : undefined;
  const state = await loadGallery(requestedSlug);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden />
            پرامپتش
          </h1>
          <p className="text-sm text-gray-500">عکس + پرامپت دقیقش، آماده‌ی کپی</p>
        </div>
        {state.status === "ok" && state.images.length > 0 ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {numFa.format(state.images.length)} پرامپت
          </span>
        ) : null}
      </header>

      {state.status === "ok" ? (
        <>
          <CategoryTabs categories={state.categories} activeSlug={state.activeSlug} />
          {state.images.length > 0 ? (
            <Grid images={state.images} />
          ) : (
            <FilteredEmpty
              categoryName={state.categories.find((c) => c.slug === state.activeSlug)?.name_fa ?? ""}
            />
          )}
        </>
      ) : (
        <Notice state={state} />
      )}
    </div>
  );
}

/**
 * ابعاد از دیتابیس می‌آید (ستون‌های images.width/height که اسکریپت import پر
 * می‌کند)، پس این کامپوننت به فایل‌سیستم کاری ندارد و فقط داده را به گریدِ
 * کلاینتی می‌سپارد. کلیک‌پذیری و مودال به state سمت کلاینت نیاز دارند.
 *
 * چرا دیگر از فایل خوانده نمی‌شود: نسخه‌ی قبلی به ازای هر رندر، فایلِ هر عکس را
 * کامل می‌خواند تا چند بایت هدر را بگیرد (برای ۷۰۰ عکس ~۱۱۶ مگابایت I/O)، و
 * پارسرش فقط PNG بود در حالی که محتوای واقعی jpg است — یعنی برای همه‌ی عکس‌ها
 * به نسبتِ پیش‌فرض می‌افتاد و چیدمان masonry از بین می‌رفت.
 */
function Grid({ images }: { images: GalleryImage[] }) {
  const items: GalleryGridItem[] = images.map((img) => ({
    ...img,
    // اگر ابعاد در دیتابیس ثبت نشده باشد (مثلاً عکسی که دستی اضافه شده) به
    // نسبت ۴:۵ برمی‌گردیم؛ فقط همان یک کارت تقریبی می‌شود، نه کل گالری.
    width: img.width ?? FALLBACK_SIZE.width,
    height: img.height ?? FALLBACK_SIZE.height,
  }));

  return <GalleryGrid items={items} />;
}

/**
 * فیلترِ دسته فعال است ولی عکسی در آن دسته نیست. تب‌ها بالای صفحه می‌مانند تا
 * کاربر بتواند دستهٔ دیگری بزند؛ این پیام فقط جای گرید را می‌گیرد.
 */
function FilteredEmpty({ categoryName }: { categoryName: string }) {
  return (
    <section className="flex flex-1 items-center justify-center py-16">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-bold text-amber-900">
          {categoryName ? `در دسته‌ی «${categoryName}» هنوز عکسی نیست` : "عکسی یافت نشد"}
        </h2>
        <p className="text-sm leading-relaxed text-amber-800">به‌زودی پر می‌شود. فعلاً همه‌ی عکس‌ها را ببین.</p>
        <Link
          href="/"
          scroll={false}
          className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          دیدن همه
        </Link>
      </div>
    </section>
  );
}

/**
 * حالت‌های غیرعادی. طبق راهنمای نوشتار: خطا عذرخواهی نمی‌کند و مبهم نیست —
 * می‌گوید چه شده و قدم بعدی چیست. حالت‌های راه‌اندازی (config/missing/empty)
 * کهربایی‌اند چون مورد انتظارند؛ فقط خطای غیرمنتظره قرمز است.
 */
function Notice({ state }: { state: Exclude<LoadState, { status: "ok" }> }) {
  const content = {
    config: {
      red: false,
      title: "هنوز به دیتابیس وصل نشده‌ای",
      body: "این حالت تا پیش از راه‌اندازی طبیعی است. رشته اتصال Postgres را در فایل .env.local بگذار و سرور را ری‌استارت کن.",
    },
    missing: {
      red: false,
      title: "جدول‌ها هنوز ساخته نشده‌اند",
      body: "اتصال برقرار است اما اسکیمای دیتابیس خالی است. در کنسول SQL فایل db/schema.sql را اجرا کن.",
    },
    empty: {
      red: false,
      title: "هنوز عکسی اضافه نشده",
      body: "اسکیما ساخته شده ولی داده‌ای نیست. برای وارد کردن محتوا این را اجرا کن: node scripts/import-content.mjs --reset",
    },
    error: {
      red: true,
      title: "خطا در خواندن گالری",
      body: "کوئری یا اتصال با خطا مواجه شد. متن خطا برای دیباگ پایین آمده.",
    },
  }[state.status];

  return (
    <section className="flex flex-1 items-center justify-center py-16">
      <div
        className={`flex max-w-md flex-col gap-3 rounded-2xl border p-6 text-center ${
          content.red ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
        }`}
      >
        <h2 className={`text-lg font-bold ${content.red ? "text-red-800" : "text-amber-900"}`}>
          {content.title}
        </h2>
        <p className={`text-sm leading-relaxed ${content.red ? "text-red-700" : "text-amber-800"}`}>
          {content.body}
        </p>
        {state.status === "error" ? (
          <pre
            dir="ltr"
            className="mt-1 overflow-x-auto rounded-lg bg-red-100/70 p-3 text-left font-mono text-xs text-red-900"
          >
            {state.detail}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
