"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@/app/_components/ui/Icons";

/**
 * پوسته‌ی مودالِ مسیرِ رهگیری‌شده.
 *
 * روی موبایل «برگه‌ی پایینی» است که از لبه‌ی زیر بالا می‌آید و با کشیدن به پایین
 * بسته می‌شود؛ روی دسکتاپ کارتِ وسط‌چین. این فرم اتفاقی نیست: کنشِ اصلیِ محصول
 * (کپیِ پرامپت) داخلِ همین است و روی موبایل باید نزدیکِ شستِ کاربر باشد.
 *
 * ── چرا بستن یعنی router.back() و نه setState ──
 * این مودال یک *مسیر* است (app/(public)/@modal/(.)image/[id]). آدرسِ صفحه واقعاً
 * /image/<id> است، پس «بستن» یعنی برگشتن در تاریخِ مرورگر. اگر با state بسته
 * می‌شد، مودال از صفحه می‌رفت ولی آدرس روی /image/<id> می‌ماند و رفرش، صفحه‌ی
 * کاملِ عکس را می‌آورد — یعنی وضعیتِ روی صفحه با آدرس نمی‌خواند.
 *
 * ── چرا اول انیمیشن و بعد router.back() ──
 * ترتیبش عکسِ کارِ ساده است و عمدی: با صداکردنِ router.back() در همان لحظه‌ی
 * کلیک، نکست بلافاصله این اسلات را از درخت برمی‌دارد و انیمیشنِ بسته‌شدن هرگز
 * دیده نمی‌شود (همان دلیلی که AnimatePresence برای مودالِ state-محورِ قبلی لازم
 * بود). پس اول state داخلی false می‌شود، exit اجرا می‌شود، و در
 * onExitComplete آدرس عوض می‌شود.
 *
 * ── نکته‌ای که به آن تکیه شده ──
 * چون مسیرِ موازی است، درختِ children (گرید) در تمامِ این مدت mount می‌ماند. دو
 * نتیجه‌ی مستقیم: اسکرولِ گالری حفظ می‌شود، و prevFocus هنوز یک عنصرِ زنده در
 * صفحه است، پس برگرداندنِ فوکوس به همان کارتی که مودال را باز کرد کار می‌کند.
 * ⚠️ لینک‌های کارت باید scroll={false} داشته باشند، وگرنه ناوبریِ نکست صفحه‌ی
 * پشتِ مودال را به بالا می‌پراند.
 */
export function Modal({
  children,
  labelledBy,
}: {
  children: React.ReactNode;
  /**
   * id عنصرِ تیتر داخلِ محتوا (IMAGE_TITLE_ID). لازم است و اختیاری نشد: مودالِ
   * بی‌نام برای کاربرِ اسکرین‌ریدر فقط «dialog» اعلام می‌شود. کامپوننتِ جزئیات
   * تیتر را همیشه رندر می‌کند، حتی برای عکسِ بی‌عنوان، پس این مقدار همیشه به
   * چیزی اشاره دارد.
   */
  labelledBy: string;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // قفلِ اسکرولِ پس‌زمینه تا صفحه پشتِ مودال جابه‌جا نشود.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // فوکوس داخلِ مودال می‌رود و در بستن به همان کارتی برمی‌گردد که بازش کرد،
    // وگرنه کاربرِ کیبورد بعد از بستن سرِ صفحه پرت می‌شود و باید از اول تا
    // کارتِ بعدی Tab بزند.
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, []);

  const spring = reduced
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness: 340, damping: 36 } as const);

  return (
    <AnimatePresence onExitComplete={() => router.back()}>
      {open ? (
        /* یک فرزندِ کلیددارِ AnimatePresence: محوشدنِ پرده و برگه با هم. exit روی
           فرزندها هم منتشر می‌شود، پس سُرخوردنِ برگه به پایین همراهش اجرا می‌شود
           و onExitComplete بعد از تمام‌شدنِ هر دو صدا زده می‌شود. */
        <motion.div
          key="image-modal"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.18 }}
        >
          {/* پرده. رنگش کمی از --color-ink تیره‌تر است؛ عمداً توکن نشد چون تنها
              کاربردش همین یک جاست. */}
          <div
            onClick={close}
            className="absolute inset-0 bg-[rgba(14,13,32,0.55)] backdrop-blur-[2px]"
          />

          {/* ظرفِ جای‌گیری. pointer-events-none تا کلیکِ کنارِ مودال به پرده‌ی
              زیرش برسد و ببندد؛ خودِ برگه دوباره auto می‌شود. */}
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:items-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelledBy}
              className="pointer-events-auto mb-3 max-h-[86vh] w-[calc(100%-24px)] max-w-[400px] overflow-hidden rounded-[28px] bg-canvas shadow-modal md:mb-0 md:max-w-[620px]"
              initial={{ y: 130 }}
              animate={{ y: 0 }}
              exit={{ y: 130 }}
              transition={spring}
              /* کشیدن به پایین برای بستن — روی موبایل طبیعی‌ترین راهِ بستن است.
                 dragConstraints.top = 0 یعنی به بالا کشیده نمی‌شود. */
              drag={reduced ? false : "y"}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.22 }}
              onDragEnd={(_event, info) => {
                if (info.offset.y > 90) close();
              }}
            >
              {/* دستگیره‌ی کشیدن + دکمه‌ی بستن */}
              <div className="relative flex items-center justify-center pb-2 pt-3">
                <div className="h-[5px] w-9 rounded-full bg-line" aria-hidden />
                <button
                  ref={closeRef}
                  type="button"
                  onClick={close}
                  aria-label="بستن"
                  className="absolute end-3 top-2 flex size-[30px] items-center justify-center rounded-full bg-surface text-muted transition-transform active:scale-95"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="max-h-[calc(86vh-46px)] overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
