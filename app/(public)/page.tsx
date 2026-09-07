import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { galleryHref, parseCategorySlug, parsePage } from "@/lib/urls";
import {
  loadGalleryView,
  GalleryView,
  GalleryNotice,
} from "@/app/_components/website/GalleryView";

/**
 * صفحه‌ی اصلی گالری — نمای کاملِ همه‌ی عکس‌ها.
 *
 * وضعیتِ نما در URL است: /?q=<عبارت>&page=<شماره>. یعنی هر نمایی از گالری یک
 * آدرسِ قابل‌فرستادن دارد و دکمه‌ی بازگشتِ مرورگر کار می‌کند. در Next 16 پراپ
 * searchParams یک Promise است و باید await شود؛ خواندنش صفحه را dynamic می‌کند.
 *
 * ⚠️ دسته دیگر پارامتر نیست. «/?category=x» فقط یک ریدایرکت به «/category/x»
 * است (پایین). خودِ بدنه‌ی گالری در app/_components/website/GalleryView است و بین
 * این صفحه و صفحه‌ی دسته مشترک؛ این فایل فقط آدرس را می‌خواند و تصمیم می‌گیرد.
 *
 * چرا await connection()؟ محتوای گالری در زمان درخواست از دیتابیس خوانده می‌شود
 * و نباید در build کش شود (آن موقع DATABASE_URL واقعی وجود ندارد). در Next 16
 * راه درستِ خارج‌کردن از prerender همین است، نه «export const dynamic».
 */

const numFa = new Intl.NumberFormat("fa-IR");

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

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
 * ⚠️ عمداً هیچ کوئریِ دیتابیسی اینجا نیست. اگر برای ساختنِ عنوان چیزی از
 * دیتابیس می‌خواندیم، در حالتِ قطعیِ دیتابیس این تابع throw می‌کرد و کلِ صفحه
 * ۵۰۰ می‌شد — درحالی‌که خودِ صفحه در همان حالت پیامِ راهنمای «به دیتابیس وصل
 * نشده‌ای» را نشان می‌دهد. (صفحه‌ی دسته ناچار است یک کوئری بزند و همان‌جا در
 * try/catch گذاشته شده.)
 *
 * ⚠️ category در کانونیک نمی‌آید و این فراموشی نیست: هیچ آدرسِ ۲۰۰ی با آن
 * پارامتر وجود ندارد، چون خودِ صفحه ریدایرکتش می‌کند.
 *
 * ⚠️ قبل از لانچ: NEXT_PUBLIC_SITE_URL باید در .env.local ست شود. بدونِ آن
 * metadataBase تعریف نمی‌شود و نکست کانونیک را نسبی می‌نویسد («/?page=2»).
 * برای dev بی‌مشکل است، ولی گوگل کانونیکِ مطلق می‌خواهد و کانونیکِ نسبی را
 * می‌تواند نادیده بگیرد — یعنی همان تلاشی که اینجا شده هدر می‌رود.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = parsePage(params.page);

  return {
    // صفحه‌ی ۱ عنوانِ پیش‌فرضِ layout را نگه می‌دارد.
    ...(page > 1 ? { title: `صفحه‌ی ${numFa.format(page)}` } : {}),
    alternates: { canonical: galleryHref({ q, page }) },
    robots: q ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  // prerender را متوقف می‌کند؛ هرچه بعدش می‌آید در زمان درخواست اجرا می‌شود.
  await connection();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const page = parsePage(params.page);

  /**
   * شکلِ قدیمیِ فیلترِ دسته → مسیرِ تازه.
   *
   * ⚠️ باید بیرونِ هر try/catch بماند: کارِ redirect انداختنِ یک خطای خاصِ نکست
   * است و گرفتنش یعنی به‌جای ریدایرکت، کارتِ «خطای ناشناخته» روی صفحه بیاید.
   *
   * ۳۰۷ و نه ۳۰۸: هنوز هیچ آدرسی فهرست نشده که ریدایرکتِ دائمی سود داشته باشد،
   * و ۳۰۸ در کشِ مرورگر ماندگار می‌شود — یعنی اگر شکلِ آدرس فردا عوض شود،
   * مرورگرِ توسعه‌دهنده هنوز به مقصدِ دیروز می‌رود. آن تله را نمی‌خریم.
   *
   * عمداً بی هیچ کوئری‌ای ریدایرکت می‌کند: اعتبارِ slug کارِ مقصد است، و مقصد
   * برای slugِ جعلی ۴۰۴ی درست می‌دهد. اگر اینجا اول دیتابیس را می‌خواندیم، هر
   * لینکِ قدیمی یک کوئریِ اضافه پیش از ریدایرکت می‌شد.
   *
   * تنها استثنا slugِ بدشکل است (مثلاً «?category=A B!»): آن را به مسیر
   * نمی‌فرستیم که ۴۰۴ بگیرد، فیلتر را می‌اندازیم. چنین آدرسی از تایپ یا لینکِ
   * شکسته می‌آید، نه از دسته‌ای که روزی وجود داشته.
   */
  const rawCategory = params.category;
  if (typeof rawCategory === "string" && rawCategory.trim().length > 0) {
    const slug = parseCategorySlug(rawCategory);
    redirect(galleryHref({ category: slug, q: query, page }));
  }

  const state = await loadGalleryView({ slug: null, query, page, allowHero: true });

  // ۴۰۴ واقعی برای صفحه‌ای که وجود ندارد، و نه یک صفحه‌ی خالی با کدِ ۲۰۰.
  // ⚠️ notFound() باید اینجا صدا زده شود و نه داخلِ loadGalleryView — به همان
  // دلیلِ redirect بالا.
  if (state.status === "out-of-range") notFound();

  // با slug: null این حالت ساختاراً نرسیدنی است و فقط برای کامل‌بودنِ union
  // هست. notFound() و نه ریدایرکت: ریدایرکتِ «/» به «/» یک حلقه می‌شد.
  if (state.status === "unknown-category") notFound();

  if (state.status !== "ok") {
    return <GalleryNotice kind={state.kind} detail={state.detail} />;
  }

  return <GalleryView state={state} title="همه‌ی عکس‌ها" />;
}
