import Link from "next/link";
import { Search } from "./_components/icons";

/**
 * صفحه‌ی ۴۰۴.
 *
 * چرا الان لازم شد: صفحه‌بندی برای «?page=» بیرون از محدوده notFound() صدا
 * می‌زند. بدونِ این فایل، نکست صفحه‌ی پیش‌فرضِ خودش را نشان می‌دهد که انگلیسی و
 * LTR است و در وسطِ یک سایتِ فارسی مثلِ خرابیِ سایت به نظر می‌رسد.
 *
 * ساختِ ظاهری عیناً همان حالتِ خالیِ گالری است (NoResults در app/page.tsx): یک
 * آدرسِ اشتباه هم از دیدِ کاربر همان تجربه‌ی «چیزی که می‌خواستم اینجا نبود» است،
 * پس دلیلی ندارد دو زبانِ بصریِ متفاوت داشته باشند.
 *
 * متادیتای اختصاصی ندارد و برای الان مشکلی نیست: کدِ وضعیتِ ۴۰۴ خودش سیگنالِ
 * اصلی برای خزنده است. ولی این «لازم نیست» نیست — عنوانِ تبِ مرورگر همان عنوانِ
 * پیش‌فرضِ layout می‌ماند («گالری پرامپت…») که برای صفحه‌ی نیافته دقیق نیست. اگر
 * جای دیگری هم به notFound() رسید، اینجا یک generateMetadata با عنوانِ خودش
 * بگذار.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-24 sm:px-6">
      <div className="flex max-w-md flex-col items-center gap-1 text-center">
        <span
          className="mb-4 flex size-14 items-center justify-center rounded-mark bg-accent-soft text-accent"
          aria-hidden
        >
          <Search size={20} />
        </span>
        <h1 className="text-[13px] font-bold text-ink">این صفحه پیدا نشد</h1>
        <p className="mb-4 text-[11.5px] leading-relaxed text-faint">
          یا آدرس اشتباه تایپ شده، یا صفحه‌ای که دنبالش بودی جابه‌جا شده. از گالری شروع کن.
        </p>
        <Link
          href="/"
          className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-white shadow-chip"
        >
          رفتن به گالری
        </Link>
      </div>
    </div>
  );
}
