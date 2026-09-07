"use server";

import { redirect } from "next/navigation";
import { verifyPassword, isAdminConfigError } from "@/lib/admin/session";
import {
  startAdminSession,
  endAdminSession,
  safeNextPath,
  isAdminAuthenticated,
  LOGIN_PATH,
} from "@/lib/admin/auth";
import { getClientIp } from "@/lib/admin/client-ip";
import {
  checkLoginAttempt,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/admin/rate-limit";
import type { LoginState } from "./auth-state";

/**
 * اکشن‌های ورود و خروج.
 *
 * ⚠️ «use server» بالای این فایل یعنی هر تابعِ صادرشده‌ی اینجا یک نقطه‌ی
 *    ورودیِ HTTP است که هر کسی می‌تواند بی‌واسطه صدایش بزند. پس هیچ تابعِ
 *    کمکیِ داخلی نباید export شود و هر اکشن باید مجوزِ خودش را خودش بسنجد.
 *
 * ورود عمداً اینجاست و در فایلِ صفحه نیست: صفحه یک کامپوننتِ سروری است و اگر
 * اکشن داخلش تعریف شود، بستارش (closure) در هر رندر سریالایز و به کلاینت
 * فرستاده می‌شود. اینجا فقط ارجاع به تابع می‌رود.
 */

/**
 * بررسیِ رمز و ساختِ نشست.
 *
 * پیامِ خطا عمداً مبهم است («رمز درست نیست») و نمی‌گوید کدام بخش غلط بوده،
 * چون کاربرِ دیگری وجود ندارد که پیامِ دقیق‌تر به دردش بخورد — تنها مخاطبِ
 * پیامِ دقیق، مهاجم است.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password");
  const nextPath = safeNextPath(
    typeof formData.get("next") === "string" ? (formData.get("next") as string) : null
  );

  if (typeof password !== "string" || password.length === 0) {
    return { error: "رمز را وارد کن.", kind: "credentials" };
  }

  const ip = await getClientIp();

  // قبل از verifyPassword: وقتی سقف پر است، هزینه‌ی scrypt هم پرداخت نمی‌شود.
  const verdict = checkLoginAttempt(ip);
  if (!verdict.allowed) {
    const minutes = Math.ceil(verdict.retryAfterSeconds / 60);
    return {
      error: `تلاش‌های ناموفق زیاد بود. حدودِ ${minutes} دقیقه‌ی دیگر دوباره امتحان کن.`,
      kind: "throttled",
    };
  }

  let ok: boolean;
  try {
    ok = await verifyPassword(password);
  } catch (err) {
    // خطای تنظیمات (متغیرِ محیطیِ نبود یا هشِ خراب) تلاشِ ناموفق حساب نمی‌شود:
    // هیچ ربطی به رمزِ واردشده ندارد و شمردنش فقط مدیر را از پنلِ خودش
    // بیرون نگه می‌داشت تا وقتی تنظیمات را درست کند.
    if (isAdminConfigError(err)) {
      return { error: (err as Error).message, kind: "config" };
    }
    throw err;
  }

  if (!ok) {
    recordLoginFailure(ip);
    return { error: "رمز درست نیست.", kind: "credentials" };
  }

  clearLoginFailures(ip);
  await startAdminSession();

  // redirect با پرتابِ خطا کار می‌کند، پس باید بیرونِ هر try/catch باشد —
  // و هست: بلوکِ بالا فقط دورِ verifyPassword است.
  redirect(nextPath);
}

/**
 * خروج.
 *
 * چرا isAdminAuthenticated اول: بدونِ این بررسی، هر سایتی می‌توانست با یک فرمِ
 * مخفی این اکشن را صدا بزند و مدیر را بیرون بیندازد. آسیبش کم است، ولی هزینه‌ی
 * بستنش یک خط است. (نکست خودش برای Server Action مبدأ درخواست را می‌سنجد، پس
 * این لایه‌ی دوم است نه لایه‌ی اول.)
 */
export async function logoutAction(): Promise<void> {
  if (await isAdminAuthenticated()) {
    await endAdminSession();
  }
  redirect(LOGIN_PATH);
}
