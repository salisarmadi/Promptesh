"use client";

import { useActionState } from "react";
import { AlertTriangle, Lock } from "@/app/_components/ui/Icons";
import { loginAction } from "@/app/admin/_actions/auth";
import { LOGIN_INITIAL_STATE } from "@/app/admin/_actions/auth-state";

/**
 * فرمِ ورود.
 *
 * چرا کلاینتی است در حالی که کلِ کارِ واقعی سمتِ سرور انجام می‌شود؟
 *     تنها برای دو چیز: نشان‌دادنِ پیامِ خطای برگشتی، و غیرفعال‌کردنِ دکمه در
 *     زمانِ ارسال. بدونِ حالتِ در حال ارسال، کاربر دکمه را چند بار می‌زند و
 *     چون scrypt عمداً کند است، چند تلاشِ موازی ثبت می‌شود و سبدِ نرخ بی‌دلیل
 *     پر می‌شود.
 *
 * ⚠️ خودِ فرم با action کار می‌کند و نه با onSubmit + fetch. یعنی اگر
 *    جاوااسکریپت لود نشده باشد یا خطا بدهد، فرم به‌صورتِ ارسالِ معمولیِ HTML
 *    کار می‌کند و ورود ممکن می‌ماند. این را با تبدیلِ فرم به fetchِ دستی از
 *    دست نده.
 */
export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, LOGIN_INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {/* مقصدِ بعد از ورود. مقدارش قبلاً با safeNextPath پاک‌سازی شده و در
          خودِ اکشن دوباره هم پاک‌سازی می‌شود — چون این ورودیِ فرم است و
          کاربر می‌تواند قبل از ارسال عوضش کند. */}
      <input type="hidden" name="next" value={nextPath} />

      <div className="flex flex-col gap-2">
        <label htmlFor="admin-password" className="text-[11.5px] font-semibold text-muted">
          رمزِ مدیر
        </label>
        {/* dir="ltr" عمدی است: رمز معمولاً لاتین است و در فیلدِ راست‌به‌چپ،
            نشانگر با هر کاراکتر می‌پرد. برچسب و پیامِ خطا فارسی و RTL
            می‌مانند. */}
        <input
          id="admin-password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          autoFocus
          required
          disabled={isPending}
          aria-describedby={state.kind === "none" ? undefined : "admin-login-error"}
          aria-invalid={state.kind === "credentials" || undefined}
          className="w-full rounded-field bg-canvas px-4 py-3 text-left font-mono text-[13px] text-ink shadow-field outline-none transition-shadow placeholder:text-faint focus:shadow-field-focus disabled:opacity-60"
          placeholder="••••••••••••"
        />
      </div>

      {state.kind !== "none" && (
        <p
          id="admin-login-error"
          role="alert"
          className="flex items-start gap-2 rounded-plate bg-alert-wash px-3 py-2.5 text-[11.5px] leading-relaxed text-alert"
        >
          <span className="mt-px shrink-0">
            <AlertTriangle size={14} />
          </span>
          <span>{state.error}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-pill bg-accent px-5 py-3 text-[12.5px] font-bold text-white shadow-cta transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Lock size={15} />
        {isPending ? "در حال بررسی…" : "ورود"}
      </button>
    </form>
  );
}
