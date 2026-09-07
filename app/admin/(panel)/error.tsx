"use client";

import Link from "next/link";
import { AlertTriangle } from "@/app/_components/ui/Icons";
import { btnGhost, btnPrimary, codeBox } from "@/app/_components/admin/AdminUi";

/**
 * مرزِ خطای پنل.
 *
 * ⚠️ error.tsx در نکست *باید* کلاینتی باشد — این تنها فایلی در پنل است که
 *    "use client" اجباری دارد و انتخاب نیست: نکست باید بتواند آن را از سمتِ
 *    مرورگر با پراپِ reset دوباره رندر کند.
 *
 * ⚠️ خودِ error.tsx در همان سگمنت رندر می‌شود که خطا داده، ولی *بیرونِ* آن
 *    سگمنت. یعنی چیدمانِ (panel) — سایدبار و تاپ‌بار — سرِ جایش می‌ماند و مدیر از
 *    پنل بیرون پرت نمی‌شود. اگر یک خطای غیرمنتظره در خودِ چیدمان بیفتد، این فایل
 *    نمی‌گیردش؛ آن حالت به مرزِ ریشه می‌رسد.
 *
 * ── چرا متنِ خطا نشان داده می‌شود ──
 * در تولید، نکست پیامِ خطاهای سرور را پاک می‌کند و فقط digest می‌ماند، پس اینجا
 * چیزِ حساسی درز نمی‌کند. digest همان چیزی است که مدیر می‌تواند در لاگِ نت‌لیفای
 * جستجو کند — یعنی تنها اطلاعاتِ عملاً به‌کارآمد در این صفحه.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
      <span
        className="mb-4 flex size-12 items-center justify-center rounded-mark bg-alert-wash text-alert"
        aria-hidden
      >
        <AlertTriangle size={18} />
      </span>

      <h1 className="text-[15px] font-extrabold text-ink-title">این بخش بالا نیامد</h1>
      <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
        یک خطای غیرمنتظره در سرور رخ داد. بقیه‌ی پنل سالم است؛ می‌توانی همین بخش
        را دوباره امتحان کنی.
      </p>

      {error.digest ? (
        <p dir="ltr" className={`${codeBox} mt-4`}>
          digest: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        {/* reset فقط همین سگمنت را دوباره رندر می‌کند و کلِ صفحه را بازخوانی
            نمی‌کند — برای خطاهای گذرای شبکه‌ی دیتابیس معمولاً همین کافی است. */}
        <button type="button" onClick={reset} className={btnPrimary}>
          تلاشِ دوباره
        </button>
        <Link href="/admin" className={btnGhost}>
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
