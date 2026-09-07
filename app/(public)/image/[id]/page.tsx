import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getGalleryImage, type GalleryImage } from "@/lib/gallery";
import { galleryHref, imageHref, parseImageId } from "@/lib/urls";
import { ImageDetail, imageTitle } from "@/app/_components/website/ImageDetail";
import { DbNotice, classifyDbError, errorDetail } from "@/app/_components/website/DbNotice";
import { ChevronRight } from "@/app/_components/ui/Icons";

/**
 * صفحه‌ی یک عکس — آدرسِ قابل‌اشتراکِ هر پرامپت.
 *
 * این همان تعهدی است که موقعِ پذیرشِ مودالِ کلاینتی (۲۰۲۶-۰۸-۱۶) شرطِ لانچ شد.
 * سه چیزی که پیش از این نبود: لینکی که بشود برای کسی فرستاد، صفحه‌ای که گوگل
 * بتواند فهرست کند، و مقصدی برای برچسب‌های دسته.
 *
 * ── همین آدرس دو ظاهر دارد ──
 * از داخلِ گالری، app/(public)/@modal/(.)image/[id] این مسیر را رهگیری می‌کند و
 * محتوایش را در مودال می‌گذارد (بدون ترکِ گرید). با بازکردنِ مستقیمِ آدرس یا
 * رفرش، رهگیری اتفاق نمی‌افتد و همین فایل رندر می‌شود. بدنه‌ی مشترکِ هر دو
 * ImageDetail است تا از هم واگرا نشوند.
 *
 * ⚠️ چرا id و نه slugِ عنوان: ۲۹۰ از ۷۰۰ ردیف عنوانِ فارسیِ تکراری دارند.
 */

/** سقفِ بریدنِ پرامپت در description متا. گوگل عملاً بیش از ~۱۶۰ نویسه نشان نمی‌دهد. */
const META_EXCERPT = 90;

/**
 * متادیتای صفحه.
 *
 * ── چرا کوئری اینجا بی‌هزینه است ──
 * برخلافِ صفحه‌ی گالری (که عمداً هیچ کوئریِ متایی ندارد)، اینجا getGalleryImage
 * با آرگومانِ رشته‌ای صدا زده می‌شود و React.cache واقعاً اصابت می‌کند — پس این
 * تابع و خودِ صفحه با هم یک کوئری می‌زنند، نه دو.
 *
 * ── چرا try/catch ──
 * اگر دیتابیس قطع باشد، throw کردنِ اینجا کلِ صفحه را ۵۰۰ می‌کند، درحالی‌که خودِ
 * صفحه در همان حالت پیامِ راهنما را نشان می‌دهد. پس متا بی‌صدا به حالتِ کمینه
 * برمی‌گردد و تصمیمِ نمایش دستِ خودِ صفحه می‌ماند.
 *
 * ── noindex برای عکسِ بی‌پرامپت ──
 * ارزشِ این صفحه پرامپتش است. صفحه‌ای که فقط یک عکس و یک عنوان دارد محتوای نازک
 * است و فهرست‌شدنش کیفیتِ کلِ دامنه را پایین می‌آورد. چند ردیفِ بی‌پرامپت داریم؛
 * با ثبتِ پرامپت، همین شرط خودش برمی‌گردد به index. follow روشن می‌ماند تا
 * لینکِ دسته‌ی همان صفحه دنبال شود.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseImageId(rawId);
  if (!id) return { title: "تصویر پیدا نشد", robots: { index: false, follow: false } };

  let img: GalleryImage | null = null;
  try {
    img = await getGalleryImage(id);
  } catch {
    // حالتِ قطعیِ دیتابیس. آدرس هنوز معتبر است، پس canonical را می‌دهیم و
    // بقیه را رها می‌کنیم؛ noindex نمی‌دهیم چون یک قطعیِ موقت نباید صفحه را از
    // فهرست بیرون کند.
    return { alternates: { canonical: imageHref(id) } };
  }
  if (!img) return { title: "تصویر پیدا نشد", robots: { index: false, follow: false } };

  const title = imageTitle(img);
  const categoryNames = img.categories.map((c) => c.name_fa).join("، ");
  const excerpt = img.prompt_text
    ? img.prompt_text.replace(/\s+/g, " ").trim().slice(0, META_EXCERPT)
    : null;

  // توضیح فارسی است و عبارتِ انگلیسیِ پرامپت فقط تهِ آن می‌آید. علتش دو چیز است:
  // جمله باید برای خواننده‌ی فارسی معنا بدهد، و ۲۹۰ عنوانِ تکراری داریم — نامِ
  // دسته و بریده‌ی پرامپت همان چیزی است که توضیح‌ها را از هم متمایز می‌کند.
  const description = [
    `پرامپتِ کاملِ «${title}»`,
    categoryNames ? `در دسته‌ی ${categoryNames}` : null,
    "آماده‌ی کپی.",
    excerpt ? `«${excerpt}…»` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    title,
    description,
    alternates: { canonical: imageHref(id) },
    robots: img.prompt_text
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      // ابعاد را هم می‌دهیم: بی آن‌ها، توییتر و تلگرام پیش از دانلودِ کاملِ عکس
      // نمی‌دانند کارت را چقدر بزرگ بکشند و اولین رندر می‌پرد.
      // ⚠️ اگر url نسبی باشد، نکست آن را با metadataBase مطلق می‌کند — که تا
      // ست‌شدنِ NEXT_PUBLIC_SITE_URL تعریف نشده است.
      images: img.width && img.height
        ? [{ url: img.url, width: img.width, height: img.height, alt: title }]
        : [{ url: img.url, alt: title }],
    },
  };
}

export default async function ImagePage({ params }: { params: Promise<{ id: string }> }) {
  // prerender را متوقف می‌کند؛ هرچه بعدش می‌آید در زمان درخواست اجرا می‌شود.
  await connection();

  const { id: rawId } = await params;
  const id = parseImageId(rawId);

  // شناسه‌ی نامعتبر (مثلاً «/image/abc») ۴۰۴ است و نه ۵۰۰. اعتبارسنجی پیش از
  // SQL انجام می‌شود چون 'abc'::bigint خطای 22P02 می‌دهد.
  if (!id) notFound();

  // «/image/007» و «/image/7» یک محتوا با دو آدرس‌اند. ریدایرکت به شکلِ
  // کانونیک جلوی محتوای تکراری را می‌گیرد. ⚠️ باید بیرونِ try/catch بماند:
  // کارِ redirect انداختنِ یک خطای خاصِ نکست است.
  if (id !== rawId) redirect(imageHref(id));

  let img: GalleryImage | null;
  try {
    img = await getGalleryImage(id);
  } catch (err) {
    // ⚠️ خطای دیتابیس هرگز ۴۰۴ نمی‌شود. یک قطعیِ چنددقیقه‌ای که به گوگل ۴۰۴
    // بدهد، هفتصد صفحه را از فهرست بیرون می‌اندازد.
    return (
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <DbNotice kind={classifyDbError(err)} detail={errorDetail(err)} />
      </div>
    );
  }

  // ردیفِ واقعاً غایب — این همان و تنها حالتی است که ۴۰۴ درست است.
  if (!img) notFound();

  const title = imageTitle(img);
  const firstCategory = img.categories[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-6 sm:px-6">
      {/* مسیرِ بازگشت. لینکِ واقعی و نه router.back(): کاربری که این آدرس را از
          تلگرام باز کرده تاریخِ مرورگری ندارد که به آن برگردد، و «بازگشت» برایش
          یعنی بیرون رفتن از سایت. */}
      <nav aria-label="مسیر" className="flex items-center gap-1 text-[11.5px] text-faint">
        <Link href="/" className="font-medium text-muted transition-colors hover:text-accent">
          گالری
        </Link>
        {firstCategory ? (
          <>
            {/* آیکن در RTL باید به چپ اشاره کند؛ rotate-180 همان کارِ چرخاندنِ
                جهت را می‌کند بدونِ آیکنِ دوم. (aria-hidden داخلِ خودِ آیکن است.) */}
            <ChevronRight size={13} className="rotate-180 opacity-50" />
            <Link
              href={galleryHref({ category: firstCategory.slug })}
              className="font-medium text-muted transition-colors hover:text-accent"
            >
              {firstCategory.name_fa}
            </Link>
          </>
        ) : null}
        <ChevronRight size={13} className="rotate-180 opacity-50" />
        <span className="line-clamp-1">{title}</span>
      </nav>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-canvas shadow-card">
        <ImageDetail img={img} variant="page" />
      </div>

      {/* راهِ ادامه‌دادن. بی این، صفحه‌ی عکس برای کاربر و برای خزنده بن‌بست است. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {firstCategory ? (
          <Link
            href={galleryHref({ category: firstCategory.slug })}
            className="rounded-full bg-accent-soft px-4 py-2 text-xs font-bold text-accent"
          >
            بقیه‌ی «{firstCategory.name_fa}»
          </Link>
        ) : null}
        <Link
          href="/"
          className="rounded-full bg-surface px-4 py-2 text-xs font-bold text-muted"
        >
          دیدنِ همه‌ی عکس‌ها
        </Link>
      </div>
    </div>
  );
}
