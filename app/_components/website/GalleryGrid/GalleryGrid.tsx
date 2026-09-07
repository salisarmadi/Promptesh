import Image from "next/image";
import Link from "next/link";
import { imageHref } from "@/lib/urls";

/**
 * گریدِ گالری.
 *
 * چیدمان: columns-* یعنی masonry واقعیِ CSS. ماک از grid با aspectRatio ثابت
 * (۳/۴ یا ۴/۳) و object-cover استفاده کرده؛ آن را برنداشتیم، چون محتوای واقعی
 * ۲۰۲ نسبتِ متفاوت دارد (۳۹۳ عکس نزدیکِ ۹:۱۶ و ۱۴ عکس افقی) و بریدنشان به دو
 * نسبتِ ثابت یعنی سرِ آدم‌ها از کادر بیرون بزند. نسبتِ واقعی می‌ماند.
 *
 * ── سه چیزی که از کارتِ ماک عمداً برداشته شد ──
 * ۱) شمارِ لایک: در تمام ۷۰۰ ردیف صفر است (سیستمِ لایک وجود ندارد). «♥ ۰» روی
 *    هر کارت نه اطلاعاتی می‌دهد و نه بی‌ضرر است — سایت را خراب نشان می‌دهد.
 * ۲) نشانِ نامِ مدل: در تمام ۷۰۰ ردیف NULL است (ستونی برایش در منبع نبود).
 * ۳) برچسبِ دسته: ۶۲۴ از ۷۰۰ عکس «پرتره» است، یعنی برچسبی که روی ۸۹٪ کارت‌ها
 *    یک کلمه‌ی تکراری است و چیزی را از چیزی جدا نمی‌کند.
 *
 * قاعده‌ی مشترکِ هر سه: نشانی که روی همه‌ی کارت‌ها یکسان است، تزئین است نه
 * اطلاع. جایشان چیزی آمد که واقعاً به ازای هر کارت فرق می‌کند: عنوانِ فارسیِ
 * خودِ عکس، روی همان گرادیانی که ماک برای متنِ روی کارت گذاشته بود.
 *
 * ── چرا این فایل دیگر کامپوننتِ کلاینتی نیست ──
 * مودالِ جزئیات از اینجا بیرون رفت و مسیرِ خودش را گرفت (/image/[id] به‌همراه
 * رهگیرش در app/(public)/@modal). با رفتنِ آن، این کامپوننت هیچ state و هیچ
 * افکتی ندارد، پس "use client" و باندلِ motion از مسیرِ گالری حذف شد.
 * دستاوردِ مهم‌ترش این است که کارتْ لینکِ واقعی است: کلیکِ وسط، «بازکردن در تبِ
 * جدید»، و کپیِ آدرس هر سه کار می‌کنند — که با یک <button> هیچ‌کدام نمی‌شد.
 */

/**
 * گرادیانِ زیرِ متنِ روی کارت — عیناً از ماک.
 *
 * ⚠️ اگر روی عکس‌های خیلی روشن عنوان سخت خوانده شد، اهرمش همین عدد ۰٫۶۲ است
 * (تیره‌ترش کن)، نه اضافه‌کردنِ text-shadow؛ سایه‌ی متن روی عکس همیشه کثیف
 * به نظر می‌رسد.
 */
const CARD_SCRIM = "linear-gradient(to top, rgba(10,9,26,0.62) 0%, rgba(10,9,26,0) 100%)";

/**
 * آیتمِ گرید — عمداً باریک‌تر از GalleryImage.
 *
 * ⚠️ prompt_text و categories و created_at اینجا نیستند و نباید اضافه شوند.
 * کارت هیچ‌کدام را نشان نمی‌دهد و صفحه فقط همین فیلدها را پاس می‌دهد؛ اگر کلِ
 * ردیف پاس داده شود، متنِ کاملِ ۶۰ پرامپت (تا حدودِ ۷۰ کیلوبایت) در payload
 * صفحه می‌رود که هیچ‌کس نمی‌بیندش. جای متنِ کامل صفحه‌ی /image/[id] است.
 */
export type GalleryGridItem = {
  id: string;
  url: string;
  title_fa: string | null;
  /** ابعادِ قطعی — صفحه پیش از پاس‌دادن، nullها را با مقدارِ جانشین پر می‌کند. */
  width: number;
  height: number;
};

export function GalleryGrid({ items }: { items: GalleryGridItem[] }) {
  return (
    <section className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {items.map((img) => (
        <article
          key={img.id}
          /* کارت حاشیه ندارد: در ماک تنها چیزی که آن را از زمینه‌ی سفید جدا
             می‌کند یک سایه‌ی تیره‌ی پخش‌منفی است. bg-surface-image زمینه‌ی
             جای‌خالیِ عکس تا لحظه‌ی بارگذاری است. */
          className="relative mb-3 break-inside-avoid overflow-hidden rounded-card bg-surface-image shadow-card"
        >
          {/* لینکِ شفافِ روی کلِ کارت: کلیک‌پذیری + دسترسی با کیبورد، بدون
              گذاشتنِ عناصرِ بلوکی داخلِ لینک (که HTML نامعتبر می‌شد).
              حلقه‌ی فوکوس از قاعده‌ی سراسریِ globals.css می‌آید.

              ⚠️ scroll={false} حتماً لازم است. ناوبریِ نکست به‌طور پیش‌فرض صفحه
              را به بالا می‌برد؛ چون گالری زیرِ مودال mount می‌ماند، بی این پراپ
              کاربر مودال را می‌بست و خودش را سرِ صفحه پیدا می‌کرد، نه کنارِ
              کارتی که رویش کلیک کرده بود. */}
          <Link
            href={imageHref(img.id)}
            scroll={false}
            aria-label={`دیدنِ پرامپت${img.title_fa ? `: ${img.title_fa}` : ""}`}
            className="absolute inset-0 z-10 rounded-card"
          />

          <Image
            src={img.url}
            alt={img.title_fa ?? "تصویرِ ساخته‌شده با هوش مصنوعی"}
            width={img.width}
            height={img.height}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            /* priority ندارد: گرید زیرِ هیرو است و LCP همان کارت‌های هیروست.
               priority دادن به چند کارتِ پایینِ صفحه فقط پهنای باند را از
               LCP می‌دزدد. */
            className="block h-auto w-full"
          />

          {img.title_fa ? (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
                style={{ background: CARD_SCRIM }}
              />
              {/* عنوان روی خودِ عکس می‌نشیند، مثلِ ماک. دو خط سقفش است: خطِ
                  سوم روی موبایل نیمی از عکس را می‌پوشاند. */}
              <h2 className="pointer-events-none absolute inset-x-2.5 bottom-2 line-clamp-2 text-[11.5px] font-bold leading-[1.55] text-white">
                {img.title_fa}
              </h2>
            </>
          ) : null}
        </article>
      ))}
    </section>
  );
}
