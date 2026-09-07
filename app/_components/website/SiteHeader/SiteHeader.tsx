import Link from "next/link";
import { Sparkles, Instagram } from "@/app/_components/ui/Icons";

/**
 * هدرِ چسبانِ سایت — مطابق ماک.
 *
 * تغییرِ نسبت به نسخه‌ی قبل: نشانِ سایت از «پلاکِ سردِ مونواسپیس با کاراکترِ ‹»
 * به نشانِ آبی با جرقه عوض شد. نسخه‌ی قبل استدلالِ خودش را داشت (لوگو همان
 * دوگانگیِ فارسی/ماشین را می‌گفت و از کلیشه‌ی «جرقه» فاصله می‌گرفت)، ولی تصمیمِ
 * صاحبِ محصول این است که خروجی همان ماک باشد. نگه‌داشتنِ نشانِ قبلی کنارِ
 * پالتِ جدید، هدر را از بقیه‌ی صفحه جدا می‌کرد.
 *
 * هدر عمداً خالی است: فقط هویت و راهِ برگشت به گالریِ بدون فیلتر. جستجو و
 * فیلترها جای خودشان در صفحه‌اند، نه اینجا.
 *
 * پس‌زمینه‌ی نیمه‌شفاف + blur لازم است چون زیرِ هدر، دستِ کارت‌ها رد می‌شود؛
 * با پس‌زمینه‌ی مات، کارت‌ها زیرِ یک لبه‌ی سختِ سفید قطع می‌شدند.
 */

/** لینک اینستاگرام اگر تنظیم شده باشد. با خالی‌بودن env دکمه اصلاً رندر نمی‌شود. */
const INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/88 backdrop-blur-[14px]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl"
          aria-label="پرامپتش، صفحه‌ی اصلی"
        >
          <span className="flex size-7 items-center justify-center rounded-mark bg-accent text-white">
            <Sparkles size={14} />
          </span>
          {/* وزن ۵۰۰ و نه bold: در ماک نشانِ سایت آرام است و وزنِ سنگین را به
              تیترِ هیرو واگذار می‌کند. tracking منفی فقط همین‌جا مجاز است. */}
          <span className="text-[16px] font-medium leading-6 tracking-[-0.4px] text-ink">
            پرامپتِش
          </span>
        </Link>

        {INSTAGRAM ? (
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="اینستاگرامِ پرامپتش"
            className="flex size-[38px] items-center justify-center rounded-full bg-surface text-muted transition-colors hover:text-accent"
          >
            <Instagram size={17} />
          </a>
        ) : null}
      </div>
    </header>
  );
}
