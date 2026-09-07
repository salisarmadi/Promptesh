import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getCategoryBySlug } from "@/lib/gallery";
import { galleryHref, parseCategorySlug, parsePage } from "@/lib/urls";
import {
  loadGalleryView,
  GalleryView,
  GalleryNotice,
} from "@/app/_components/website/GalleryView";

/**
 * صفحه‌ی یک دسته — «/category/portrait».
 *
 * ── چرا مسیر و نه پارامتر ──
 * تا امروز دسته فقط «/?category=portrait» بود. سه چیز را از دست می‌دادیم:
 * گوگل پارامترِ کوئری را محورِ دسته‌بندی نمی‌شناسد، آدرس برای آدم خوانا نبود، و
 * صفحه نمی‌توانست عنوان و توضیحِ خودش را داشته باشد. خودِ اسکیما هم از روزِ اول
 * همین را در نظر داشت: کامنتِ categories.slug می‌گوید «برای مسیر صفحه دسته و
 * سئو» و مثالش «/category/couple» است.
 *
 * ── چه چیزی مشترک است ──
 * تمامِ بدنه. این فایل فقط آدرس را می‌خواند، اعتبارش را می‌سنجد و عنوان می‌سازد؛
 * گرید و چیپ‌ها و صفحه‌بندی و شش حالتِ خرابیِ دیتابیس در
 * app/_components/website/GalleryView است، همان چیزی که «/» هم رندر می‌کند. اگر
 * کپی می‌شد، هر اصلاحی باید دو بار انجام می‌شد.
 *
 * ── سه حالتِ آدرسِ غلط، سه جوابِ متفاوت ──
 * ۱) بدشکل («/category/A B!») → ۴۰۴ بی هیچ کوئری‌ای.
 * ۲) خوش‌شکل ولی ناموجود («/category/ghost») → ۴۰۴ بعد از یک کوئری.
 * ۳) خوش‌شکل با شکلِ غیرکانونیک («/category/Portrait») → ریدایرکت به شکلِ درست.
 * برخلافِ «/» اینجا هیچ‌کدام «نادیده‌گرفتنِ فیلتر» نمی‌شود: در یک مسیرِ مسیری،
 * آدرسی که وجود ندارد یعنی صفحه‌ای که وجود ندارد.
 *
 * ⚠️ breadcrumb عمداً ندارد. چیپ‌های دسته دقیقاً زیرِ عنوان‌اند و چیپِ «همه» به
 * «/» می‌رود — یعنی هم کاربر و هم خزنده راهِ بازگشت دارند. یک مسیرِ سومِ تکراری
 * بالای صفحه فقط شلوغی است. (صفحه‌ی /image/[id] breadcrumb دارد چون آن‌جا هیچ
 * ناوبریِ دیگری نیست.)
 */

const numFa = new Intl.NumberFormat("fa-IR");

type RouteParams = Promise<{ slug: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** عنوانِ صفحه از نامِ فارسیِ دسته. یک جا نوشته می‌شود تا متا و <h1> یکی بمانند. */
function categoryTitle(nameFa: string): string {
  return `پرامپت‌های ${nameFa}`;
}

/**
 * متادیتای صفحه.
 *
 * ── چرا اینجا کوئری هست، برخلافِ «/» ──
 * عنوانِ این صفحه *همان* نامِ فارسیِ دسته است؛ بی کوئری، عنوان یا slugِ لاتین
 * می‌شد یا یک متنِ عمومیِ تکراری برای هر یازده دسته. پس کوئری اجتناب‌ناپذیر
 * است و در عوض دو محافظ دارد: آرگومانش رشته است پس React.cache واقعاً اصابت
 * می‌کند و همین کوئری در بدنه‌ی صفحه دوباره اجرا نمی‌شود، و کلش در try/catch
 * است تا قطعیِ دیتابیس این تابع را throw نکند (که کلِ صفحه را ۵۰۰ می‌کرد،
 * درحالی‌که خودِ صفحه در آن حالت پیامِ راهنما نشان می‌دهد).
 *
 * description از ستونِ categories.description می‌آید اگر پر باشد. اسکیما همین
 * را برایش نوشته: «در صورت نیاز برای سئوی صفحه دسته». اگر خالی باشد، جمله‌ای
 * از نام و تعداد ساخته می‌شود — که دست‌کم برای هر دسته متفاوت است، و توضیحِ
 * یکسان برای یازده صفحه بدترین حالت است.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = parseCategorySlug(rawSlug);
  if (!slug) return { title: "دسته پیدا نشد", robots: { index: false, follow: false } };

  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const page = parsePage(search.page);
  const canonical = galleryHref({ category: slug, q, page });

  let category;
  try {
    category = await getCategoryBySlug(slug);
  } catch {
    // قطعیِ موقتِ دیتابیس. آدرس هنوز معتبر است، پس canonical را می‌دهیم و
    // noindex نمی‌گذاریم — یک قطعیِ چنددقیقه‌ای نباید صفحه را از فهرست بیندازد.
    return { alternates: { canonical } };
  }
  if (!category) return { title: "دسته پیدا نشد", robots: { index: false, follow: false } };

  const base = categoryTitle(category.name_fa);
  const description =
    category.description?.trim() ||
    `${numFa.format(category.image_count)} عکسِ ساخته‌شده با هوش مصنوعی در دسته‌ی ${category.name_fa}، هر کدام با پرامپتِ کاملِ خودش. آماده‌ی کپی.`;

  return {
    // ⚠️ عنوانِ صفحه‌ی ۲ به بعد باید متفاوت باشد، وگرنه ۱۱ صفحه‌ی یک دسته یک
    //    <title> یکسان می‌گیرند و گوگل تکراری حسابشان می‌کند.
    title: page > 1 ? `${base} — صفحه‌ی ${numFa.format(page)}` : base,
    description,
    // ⚠️ صفحه‌ی ۲ کانونیکش را به صفحه‌ی ۱ نمی‌دهد؛ همان اشتباهی که کلِ
    //    صفحه‌بندی برای گریز از آن نوشته شد.
    alternates: { canonical },
    // نمای جستجو داخلِ دسته بی‌نهایت آدرس می‌سازد. follow روشن می‌ماند.
    robots: q ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: base, description },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  // prerender را متوقف می‌کند؛ هرچه بعدش می‌آید در زمان درخواست اجرا می‌شود.
  await connection();

  const { slug: rawSlug } = await params;
  const search = await searchParams;
  const query = typeof search.q === "string" ? search.q.trim() : "";
  const page = parsePage(search.page);

  const slug = parseCategorySlug(rawSlug);
  // slugِ بدشکل پیش از هر کوئری‌ای ۴۰۴ می‌شود. الگو آینه‌ی قیدِ CHECK در
  // db/schema.sql است، پس چیزی که این‌جا رد شود قطعاً در دیتابیس هم نیست.
  if (!slug) notFound();

  // «/category/Portrait» و «/category/portrait» یک محتوا با دو آدرس‌اند.
  // ⚠️ بیرونِ try/catch: کارِ redirect انداختنِ یک خطای خاصِ نکست است.
  if (slug !== rawSlug) redirect(galleryHref({ category: slug, q: query, page }));

  const state = await loadGalleryView({ slug, query, page, allowHero: false });

  // ⚠️ هر دو باید اینجا صدا زده شوند و نه داخلِ loadGalleryView: آن تابع
  // try/catch دارد و خطای خاصِ نکست را به «خطا در خواندنِ گالری» ترجمه می‌کرد.
  if (state.status === "unknown-category") notFound();
  if (state.status === "out-of-range") notFound();

  if (state.status !== "ok") {
    return <GalleryNotice kind={state.kind} detail={state.detail} />;
  }

  // نامِ فارسی از همان فهرستی می‌آید که چیپ‌ها را می‌سازد و نه از کوئریِ دوم:
  // حالتِ unknown-category بالا رد شده، پس این ردیف قطعاً هست.
  const nameFa =
    state.categories.find((c) => c.slug === slug)?.name_fa ?? slug;

  // توضیحِ دسته اختیاری است، پس نبودنش نباید صفحه را بشکاند. این همان کوئریِ
  // generateMetadata است و با React.cache دوباره اجرا نمی‌شود؛ try/catch برای
  // حالتِ نادری است که آن صداکردن رد شده باشد.
  let intro: string | null = null;
  try {
    intro = (await getCategoryBySlug(slug))?.description?.trim() || null;
  } catch {
    intro = null;
  }

  return <GalleryView state={state} title={categoryTitle(nameFa)} intro={intro} />;
}
