"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GalleryImage } from "@/lib/gallery";
import { CopyButton } from "./copy-button";
import { X } from "./icons";

/**
 * گریدِ گالری + مودالِ جزئیات. (کامپوننت کلاینتی — برای باز/بستهٔ مودال)
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
 * ⚠️ TODO — قبل از لانچِ عمومی: مسیرِ اختصاصی /image/[id]. الان مودال کاملاً
 * کلاینتی است (MVP): URL عوض نمی‌شود، پس لینکِ یک پرامپت قابل‌اشتراک نیست،
 * صفحه‌ی سئوی مستقل ندارد، و متنِ پرامپت همراهِ کلِ لیست eager لود می‌شود.
 * مسیرِ درست: intercepting/parallel routes — هم مودال از داخلِ گرید، هم
 * صفحه‌ی واقعیِ قابل‌اشتراک. (طبق تصمیمِ ۲۰۲۶-۰۸-۱۶ عمداً برای MVP ساده ماند.)
 * توجه: آدرس باید /image/[id] باشد نه slugِ عنوان — ۲۹۰ ردیف عنوانِ تکراری
 * دارند و slug به هم برمی‌خورد.
 */

const numFa = new Intl.NumberFormat("fa-IR");

/**
 * گرادیانِ زیرِ متنِ روی کارت — عیناً از ماک.
 *
 * ⚠️ اگر روی عکس‌های خیلی روشن عنوان سخت خوانده شد، اهرمش همین عدد ۰٫۶۲ است
 * (تیره‌ترش کن)، نه اضافه‌کردنِ text-shadow؛ سایه‌ی متن روی عکس همیشه کثیف
 * به نظر می‌رسد.
 */
const CARD_SCRIM = "linear-gradient(to top, rgba(10,9,26,0.62) 0%, rgba(10,9,26,0) 100%)";

/** آیتمِ گرید: GalleryImage به‌همراه ابعادِ قطعی و تاریخِ آماده‌ی نمایش. */
export type GalleryGridItem = GalleryImage & {
  width: number;
  height: number;
  /**
   * تاریخِ شمسیِ از پیش قالب‌بندی‌شده. سمتِ سرور ساخته می‌شود و نه اینجا: اگر
   * Date را در کامپوننتِ کلاینتی قالب‌بندی کنیم، منطقهٔ زمانیِ سرور و مرورگر
   * می‌توانند فرق کنند و hydration mismatch می‌دهد.
   */
  dateFa: string;
};

export function GalleryGrid({ items }: { items: GalleryGridItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((it) => it.id === openId) ?? null;

  return (
    <>
      <section className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {items.map((img) => (
          <article
            key={img.id}
            /* کارت حاشیه ندارد: در ماک تنها چیزی که آن را از زمینه‌ی سفید جدا
               می‌کند یک سایه‌ی تیره‌ی پخش‌منفی است. bg-surface-image زمینه‌ی
               جای‌خالیِ عکس تا لحظه‌ی بارگذاری است. */
            className="relative mb-3 break-inside-avoid overflow-hidden rounded-card bg-surface-image shadow-card"
          >
            {/* دکمه‌ی شفافِ روی کلِ کارت: کلیک‌پذیری + دسترسی با کیبورد، بدون
                گذاشتنِ عناصرِ بلوکی داخلِ <button> (که HTML نامعتبر می‌شد).
                حلقه‌ی فوکوس از قاعده‌ی سراسریِ globals.css می‌آید. */}
            <button
              type="button"
              onClick={() => setOpenId(img.id)}
              aria-label={`دیدنِ پرامپت${img.title_fa ? `: ${img.title_fa}` : ""}`}
              className="absolute inset-0 z-10 cursor-pointer rounded-card"
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

      {/* AnimatePresence بیرونِ شرط است تا انیمیشنِ بسته‌شدن فرصتِ اجرا داشته
          باشد؛ اگر مودال بی‌واسطه از درخت حذف شود، exit هیچ‌وقت دیده نمی‌شود. */}
      <AnimatePresence>
        {active ? (
          <ImageModal key={active.id} img={active} onClose={() => setOpenId(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * مودالِ جزئیات: عکسِ کامل + عنوان + دسته‌ها + تاریخ + پرامپتِ قابل‌کپی.
 *
 * فرمِ ماک: روی موبایل یک «برگه‌ی پایینی» که از لبه‌ی زیر بالا می‌آید و با
 * کشیدن به پایین بسته می‌شود؛ روی دسکتاپ همان کارتِ وسط‌چین. این فرم مهم است
 * چون کنشِ اصلیِ کلِ محصول (کپیِ پرامپت) همین‌جاست و روی موبایل باید نزدیکِ
 * شستِ کاربر باشد، نه در وسطِ صفحه.
 *
 * Esc، کلیک روی پس‌زمینه و کشیدن به پایین می‌بندند؛ اسکرولِ صفحه قفل می‌شود.
 */
function ImageModal({ img, onClose }: { img: GalleryGridItem; onClose: () => void }) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // قفلِ اسکرولِ پس‌زمینه تا صفحه پشتِ مودال جابه‌جا نشود.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // فوکوس باید داخلِ مودال برود و در بستن به همان کارتی برگردد که بازش کرد،
    // وگرنه کاربرِ کیبورد بعد از بستن سرِ صفحه پرت می‌شود و باید از اول تا
    // کارتِ بعدی Tab بزند.
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [onClose]);

  const spring = reduced
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness: 320, damping: 34 } as const);

  return (
    <>
      {/* پرده. رنگش عیناً از ماک است و کمی از --color-ink تیره‌تر؛ عمداً توکن
          نشد چون تنها کاربردش همین یک جاست. */}
      <motion.div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[rgba(14,13,32,0.55)] backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.18 }}
      />

      {/* ظرفِ جای‌گیری. pointer-events-none تا کلیکِ کنارِ مودال به پرده‌ی
          زیرش برسد و ببندد؛ خودِ برگه دوباره auto می‌شود. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center md:items-center">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={img.title_fa ? titleId : undefined}
          aria-label={img.title_fa ? undefined : "جزئیاتِ تصویر"}
          className="pointer-events-auto mb-3 max-h-[86vh] w-[calc(100%-24px)] max-w-[400px] overflow-hidden rounded-[28px] bg-canvas shadow-modal md:mb-0 md:max-w-[620px]"
          initial={{ y: 130, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 130, opacity: 0 }}
          transition={spring}
          /* کشیدن به پایین برای بستن — روی موبایل طبیعی‌ترین راهِ بستن است.
             dragConstraints.top = 0 یعنی به بالا کشیده نمی‌شود. */
          drag={reduced ? false : "y"}
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.22 }}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 90) onClose();
          }}
        >
          {/* دستگیره‌ی کشیدن + دکمه‌ی بستن */}
          <div className="relative flex items-center justify-center pb-2 pt-3">
            <div className="h-[5px] w-9 rounded-full bg-line" aria-hidden />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="absolute end-3 top-2 flex size-[30px] items-center justify-center rounded-full bg-surface text-muted transition-transform active:scale-95"
            >
              <X size={15} />
            </button>
          </div>

          <div className="max-h-[calc(86vh-46px)] overflow-y-auto md:grid md:grid-cols-2">
            {/* سمتِ عکس. object-contain و نه cover: کاربر برای دیدنِ خودِ تصویر
                کلیک کرده، پس در این یک جا بریدنش خطاست — حتی اگر ماک ببُرد. */}
            <div className="px-4 md:py-4">
              <div className="flex items-center justify-center overflow-hidden rounded-[20px] bg-surface">
                <Image
                  src={img.url}
                  alt={img.title_fa ?? "تصویرِ ساخته‌شده با هوش مصنوعی"}
                  width={img.width}
                  height={img.height}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="max-h-[42vh] w-full object-contain md:max-h-[70vh]"
                />
              </div>
            </div>

            {/* سمتِ جزئیات */}
            <div className="flex min-w-0 flex-col gap-3.5 p-4">
              {img.title_fa ? (
                <h2 id={titleId} className="text-[15px] font-bold leading-snug">
                  {img.title_fa}
                </h2>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5">
                {img.categories.map((c) => (
                  <span
                    key={c.slug}
                    className="rounded-full bg-accent-soft px-2.5 py-[5px] text-[11px] font-bold text-accent"
                  >
                    {c.name_fa}
                  </span>
                ))}
                {/* جای نشانِ مدل در ماک. مدل در کلِ محتوا NULL است؛ تاریخ
                    داده‌ی واقعی است و از xlsx آمده، پس همان اینجا می‌نشیند. */}
                <span className="rounded-full bg-surface px-2.5 py-[5px] text-[10.5px] font-medium text-muted">
                  {img.dateFa}
                </span>
              </div>

              {img.prompt_text ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-faint">متنِ پرامپت</p>
                    {/* طولِ پرامپت از ۳۹ تا ۴۰۶۱ کاراکتر است. این عدد می‌گوید
                        کاربر با چه چیزی طرف است، پیش از آنکه اسکرول کند. */}
                    <p className="text-[10px] text-faint">
                      {numFa.format(img.prompt_text.length)} کاراکتر
                    </p>
                  </div>

                  {/* dir="ltr" اجباری است: متنِ انگلیسی داخلِ صفحه‌ی RTL بدون
                      این، نقطه و کاماهایش سرِ خط می‌پرند.
                      نوارِ اسکرول عمداً پنهان نشد (برخلافِ ماک): با پرامپت‌های
                      تا ۴۰۰۰ کاراکتری، همان نوار تنها نشانه‌ی «ادامه دارد» است. */}
                  <div
                    dir="ltr"
                    className="max-h-40 overflow-y-auto rounded-field border border-line bg-surface text-left"
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
        </motion.div>
      </div>
    </>
  );
}
