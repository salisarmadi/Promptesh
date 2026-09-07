import Image from "next/image";
import Link from "next/link";
import type { GalleryImage } from "@/lib/gallery";
import { galleryHref } from "@/lib/urls";
import { CopyButton } from "@/app/_components/ui/CopyButton";

/**
 * بدنه‌ی جزئیاتِ یک عکس: تصویر + عنوان + دسته‌ها + تاریخ + پرامپتِ قابل‌کپی.
 *
 * ── چرا یک کامپوننتِ مشترک ──
 * همین محتوا از دو مسیر رندر می‌شود: صفحه‌ی واقعیِ /image/[id] و مودالی که آن
 * مسیر را از داخلِ گرید رهگیری می‌کند. اگر هرکدام نسخه‌ی خودش را داشت، دیر یا
 * زود از هم واگرا می‌شدند — و بدترین جای واگرایی دقیقاً همین‌جاست، چون کنشِ
 * اصلیِ کلِ محصول (کپیِ پرامپت) اینجاست. یک تعریف، دو ظرف.
 *
 * ── چرا کامپوننتِ سروری ──
 * هیچ state ندارد. تاریخ هم همین‌جا و سمتِ سرور قالب‌بندی می‌شود؛ قالب‌بندیِ
 * Date در مرزِ کلاینت، وقتی منطقه‌ی زمانیِ سرور و مرورگر فرق کند، hydration
 * mismatch می‌دهد. تنها بخشِ کلاینتیِ داخلش CopyButton است که خودش "use client"
 * دارد و بدونِ مشکل تو در تو می‌نشیند.
 *
 * ── تفاوتِ دو حالت ──
 * variant سه چیز را عوض می‌کند و بیشتر از این هم نباید بکند، وگرنه به دو
 * کامپوننتِ درهم‌تنیده تبدیل می‌شود:
 *   • سطحِ تیتر — در صفحه h1 است، در مودال h2 (صفحه‌ی زیرِ مودال h1 خودش را دارد).
 *   • priority تصویر — در صفحه، عکس همان LCP است؛ در مودال، صفحه‌ی زیرش LCP را برده.
 *   • سقفِ بلندیِ تصویر و مقدارِ sizes — مودال در ارتفاعِ محدودِ برگه می‌نشیند.
 */

const numFa = new Intl.NumberFormat("fa-IR");

/**
 * تاریخِ شمسی با منطقه‌ی زمانیِ صریح.
 *
 * بدون timeZone، خروجی به ماشینِ سرور وابسته می‌شد (Netlify روی UTC است) و
 * تاریخِ عکس‌های نزدیکِ نیمه‌شب یک روز عقب نشان داده می‌شد.
 */
const dateFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Tehran",
});

/** ابعادِ جانشین وقتی width/height در دیتابیس ثبت نشده — نسبتِ ۴:۵. */
const FALLBACK_SIZE = { width: 600, height: 750 };

/**
 * id عنصرِ تیتر. مودال با aria-labelledby به آن اشاره می‌کند.
 *
 * چرا مقدارِ ثابت و نه useId: هر لحظه فقط یک نمایِ جزئیات در صفحه است — در
 * ناوبریِ نرم مودال (چون مسیرِ رهگیری‌شده صفحه‌ی پشتش را عوض نمی‌کند) و در
 * بازکردنِ مستقیم خودِ صفحه. useId یعنی این کامپوننت باید کلاینتی شود، که برای
 * یک رشته‌ی ثابت هزینه‌ی گرانی است.
 */
export const IMAGE_TITLE_ID = "image-detail-title";

/**
 * عنوانِ نمایشی.
 *
 * ستونِ title_fa nullable است و پنل هم اجازه‌ی خالی‌گذاشتنش را می‌دهد، پس جانشین
 * لازم است. «بدون عنوان» به کاربر چیزی نمی‌گوید؛ شماره‌ی خودِ عکس حداقل قابلِ
 * ارجاع است. تیتر همیشه رندر می‌شود و نه فقط وقتی عنوان هست: بی آن، مودالِ یک
 * عکسِ بی‌عنوان هیچ نامِ قابلِ اعلام برای اسکرین‌ریدر نداشت.
 */
export function imageTitle(img: GalleryImage): string {
  return img.title_fa?.trim() || `تصویرِ شماره‌ی ${numFa.format(Number(img.id))}`;
}

export type ImageDetailVariant = "page" | "modal";

export function ImageDetail({
  img,
  variant,
}: {
  img: GalleryImage;
  variant: ImageDetailVariant;
}) {
  const width = img.width ?? FALLBACK_SIZE.width;
  const height = img.height ?? FALLBACK_SIZE.height;
  const isPage = variant === "page";
  const Title = isPage ? "h1" : "h2";
  const title = imageTitle(img);
  const alt = img.title_fa ?? "تصویرِ ساخته‌شده با هوش مصنوعی";

  return (
    <div className="md:grid md:grid-cols-2">
      {/* سمتِ عکس. object-contain و نه cover: کاربر برای دیدنِ خودِ تصویر آمده،
          پس در این یک جا بریدنش خطاست. */}
      <div className="px-4 md:py-4">
        <div className="flex items-center justify-center overflow-hidden rounded-[20px] bg-surface">
          <Image
            src={img.url}
            alt={alt}
            width={width}
            height={height}
            sizes={isPage ? "(max-width: 768px) 100vw, 620px" : "(max-width: 768px) 100vw, 50vw"}
            priority={isPage}
            className={`w-full object-contain ${
              isPage ? "max-h-[58vh] md:max-h-[78vh]" : "max-h-[42vh] md:max-h-[70vh]"
            }`}
          />
        </div>
      </div>

      {/* سمتِ جزئیات */}
      <div className="flex min-w-0 flex-col gap-3.5 p-4">
        <Title id={IMAGE_TITLE_ID} className="text-[15px] font-bold leading-snug sm:text-base">
          {title}
        </Title>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* برچسبِ دسته اینجا لینک است و نه یک span: کاربری که یک پرامپتِ
              «پرتره» را پسندیده، محتمل‌ترین کارِ بعدی‌اش دیدنِ بقیه‌ی همان دسته
              است. برای خزنده هم این تنها لینکِ داخلی از صفحه‌ی عکس به بالای
              درختِ سایت است — بی آن، ۷۰۰ صفحه‌ی عکس بن‌بست‌اند. */}
          {img.categories.map((c) => (
            <Link
              key={c.slug}
              href={galleryHref({ category: c.slug })}
              className="rounded-full bg-accent-soft px-2.5 py-[5px] text-[11px] font-bold text-accent transition-opacity hover:opacity-80"
            >
              {c.name_fa}
            </Link>
          ))}
          {/* جای نشانِ مدل در ماک. model_used در کلِ محتوا NULL است؛ تاریخ
              داده‌ی واقعی است، پس همان اینجا می‌نشیند. */}
          <span className="rounded-full bg-surface px-2.5 py-[5px] text-[10.5px] font-medium text-muted">
            {dateFa.format(img.created_at)}
          </span>
        </div>

        {img.prompt_text ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-faint">متنِ پرامپت</p>
              {/* طولِ پرامپت از ۳۹ تا ۴۰۶۱ کاراکتر است. این عدد می‌گوید کاربر با
                  چه چیزی طرف است، پیش از آنکه اسکرول کند. */}
              <p className="text-[10px] text-faint">
                {numFa.format(img.prompt_text.length)} کاراکتر
              </p>
            </div>

            {/* dir="ltr" اجباری است: متنِ انگلیسی داخلِ صفحه‌ی RTL بدون این،
                نقطه و کاماهایش سرِ خط می‌پرند.
                نوارِ اسکرول عمداً پنهان نشد: با پرامپت‌های تا ۴۰۰۰ کاراکتری،
                همان نوار تنها نشانه‌ی «ادامه دارد» است. */}
            <div
              dir="ltr"
              className={`overflow-y-auto rounded-field border border-line bg-surface text-left ${
                isPage ? "max-h-[46vh]" : "max-h-40"
              }`}
            >
              <p className="whitespace-pre-wrap break-words p-3.5 font-mono text-[11px] leading-[1.75] text-ink-code">
                {img.prompt_text}
              </p>
            </div>

            <CopyButton text={img.prompt_text} size="block" />
          </>
        ) : (
          <p className="text-sm text-faint">پرامپتی برای این تصویر ثبت نشده.</p>
        )}
      </div>
    </div>
  );
}
