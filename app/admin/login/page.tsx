import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Lock, ArrowLeft } from "@/app/_components/ui/Icons";
import { adminConfigurationIssue, isAdminConfigured } from "@/lib/admin/session";
import { isAdminAuthenticated, safeNextPath } from "@/lib/admin/auth";
import { LoginForm } from "@/app/_components/admin/LoginForm";

/**
 * صفحه‌ی ورودِ پنل.
 *
 * تنها صفحه‌ی زیرِ /admin است که requireAdmin ندارد و نباید هم داشته باشد —
 * وگرنه حلقه‌ی بی‌پایانِ ریدایرکت می‌شود. به همین دلیل بیرونِ گروهِ (panel)
 * است: نه پوسته‌ی سایدبار را می‌گیرد و نه دربانِ آن گروه را.
 *
 * دو حالتِ خاص که هر دو عمدی‌اند:
 *
 *   • کاربرِ واردشده که دوباره سرِ این صفحه می‌آید، به داشبورد می‌رود. همین کار
 *     در proxy.ts هم هست؛ اینجا تکرار شده چون proxy یک بررسیِ خوش‌بینانه است و
 *     ممکن است اجرا نشود (مثلاً در ناوبریِ سمتِ کلاینت).
 *
 *   • اگر متغیرهای محیطی تنظیم نشده باشند، جای فرم یک راهنمای راه‌اندازی
 *     نشان داده می‌شود. چرا مهم است: بدونِ آن، نصبِ تازه یک فرمِ ورود می‌دید که
 *     هر رمزی بزند خطای مبهم می‌گیرد. حالا دقیقاً می‌گوید کدام دستور را بزند.
 */

export const metadata: Metadata = {
  title: "ورود مدیر",
  // پنل هیچ‌جا نباید در نتایجِ جستجو بیاید. کدِ noindex در خودِ هدرِ صفحه هم
  // می‌رود، پس حتی اگر لینکش جایی لو رفت، ایندکس نمی‌شود.
  robots: { index: false, follow: false, nocache: true },
};

/** بلوکِ راهنمای راه‌اندازی. تنها وقتی دیده می‌شود که env تنظیم نشده باشد. */
function SetupGuide({ issue }: { issue: string | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-plate bg-surface px-4 py-4">
      <p className="text-[11.5px] font-semibold text-ink">پنل هنوز راه‌اندازی نشده</p>
      <p className="text-[11.5px] leading-relaxed text-muted">
        رمزِ مدیر و کلیدِ امضای نشست تنظیم نشده‌اند. این دستور را در ریشه‌ی پروژه اجرا کن و دو
        خطی که چاپ می‌کند را در <span dir="ltr" className="font-mono">.env.local</span> بگذار:
      </p>
      {issue ? <p className="rounded-field border border-alert/20 bg-alert-wash px-3 py-2 text-[11px] leading-relaxed text-alert">{issue}</p> : null}
      <code
        dir="ltr"
        className="rounded-plate bg-canvas px-3 py-2.5 font-mono text-[11.5px] text-ink-code shadow-field"
      >
        node scripts/hash-password.mjs
      </code>
      <p className="text-[11px] leading-relaxed text-faint">
        بعد از ویرایشِ فایل، سرورِ توسعه را یک بار ری‌استارت کن.
      </p>
    </div>
  );
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // مقدارهای محرمانه‌ی پنل از محیطِ runtime نتلیفای خوانده می‌شوند، نه از
  // HTML ساخته‌شده در زمان build. این مرز برای تغییر env و redeploy ضروری است.
  await connection();
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : null;
  const nextPath = safeNextPath(rawNext);

  if (await isAdminAuthenticated()) {
    redirect(nextPath);
  }

  const configured = isAdminConfigured();
  const configurationIssue = configured ? null : adminConfigurationIssue();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6 rounded-card bg-canvas p-7 shadow-card">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className="flex size-12 items-center justify-center rounded-mark bg-accent-soft text-accent"
              aria-hidden
            >
              <Lock size={20} />
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="text-[14px] font-bold text-ink">ورود به پنل مدیریت</h1>
              <p className="text-[11.5px] leading-relaxed text-faint">
                این بخش فقط برای مدیرِ پرامپتش است.
              </p>
            </div>
          </div>

          {configured ? <LoginForm nextPath={nextPath} /> : <SetupGuide issue={configurationIssue} />}
        </div>

        {/* راهِ برگشت به سایت. کسی که اشتباهی سرِ این آدرس آمده نباید در بن‌بست بماند. */}
        <div className="mt-5 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} />
            بازگشت به گالری
          </Link>
        </div>
      </div>
    </main>
  );
}
