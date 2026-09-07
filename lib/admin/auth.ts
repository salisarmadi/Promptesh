import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { LOGIN_PATH, ADMIN_HOME } from "./auth-paths";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  readSessionExpiry,
} from "./session";

/**
 * مرزِ واقعیِ امنیتِ پنل مدیریت.
 *
 * proxy.ts کاربرِ بدونِ کوکی را سریع به صفحه‌ی ورود می‌فرستد، ولی مستندِ خودِ
 * Next صریح می‌گوید proxy یک بررسیِ «خوش‌بینانه» است و نباید تنها خطِ دفاع
 * باشد. دلیلش هم این است که Server Action و Route Handler نقطه‌ی ورودِ مستقلی
 * دارند و کسی می‌تواند بدون رد شدن از مسیرِ صفحه، مستقیم صداشان بزند.
 *
 * پس قاعده‌ی این پروژه، بدون استثنا:
 *     هر صفحه‌ی زیرِ /admin و هر Server Action نویسنده، در اولین خطش
 *     await requireAdmin() دارد.
 *
 * چیدنِ این بررسی در layout کافی *نیست*: layout در جابه‌جایی بینِ مسیرها
 * دوباره رندر نمی‌شود و جلوی رندرِ بخش‌های تودرتو را هم نمی‌گیرد.
 */

/** مسیرهای پنل از ماژولِ auth-paths می‌آیند و از همین‌جا هم دوباره صادر می‌شوند، تا کدِ اپ یک جای واحد برای ایمپورت داشته باشد. */
export { LOGIN_PATH, ADMIN_HOME };

/**
 * دامنه‌ی کوکی به /admin محدود است، نه /.
 *
 * سود: کوکیِ نشست هرگز همراهِ درخواست‌های گالریِ عمومی فرستاده نمی‌شود — نه
 * برای صفحه‌ها، نه برای تصاویر، نه در لاگِ CDN.
 * هزینه‌ای که باید یادت بماند: هر API یا Route Handlerِ مربوط به پنل هم باید
 * زیرِ /admin باشد، وگرنه کوکی به آن نمی‌رسد و بی‌دلیل ۴۰۱ می‌گیرد.
 */
const COOKIE_PATH = "/admin";

/**
 * آیا این درخواست نشستِ معتبر دارد؟
 *
 * با cache پیچیده شده تا در یک بار رندر، هرچند بار که صدا زده شود (لایه، صفحه،
 * چند کامپوننت) کوکی یک‌بار خوانده و امضا یک‌بار بررسی شود. بدون آرگومان صدا
 * زده می‌شود، پس کلیدِ کش پایدار است.
 */
export const isAdminAuthenticated = cache(async (): Promise<boolean> => {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
});

/**
 * زمانِ انقضای نشستِ فعلی (میلی‌ثانیه)، یا null اگر نشستی نباشد.
 *
 * فقط برای نمایش در «اطلاعات حساب مدیر». هیچ تصمیمِ دسترسی‌ای به این مقدار
 * وابسته نیست — آن کار با requireAdmin انجام می‌شود.
 */
export const getAdminSessionExpiry = cache(async (): Promise<number | null> => {
  const store = await cookies();
  return readSessionExpiry(store.get(SESSION_COOKIE)?.value);
});

/**
 * دربانِ صفحه‌ها و اکشن‌ها. اگر نشست معتبر نباشد، به صفحه‌ی ورود می‌فرستد.
 *
 * توجه: redirect داخلی‌اش با پرتابِ یک خطای خاص کار می‌کند، پس این تابع را
 * هرگز داخلِ try/catch عمومی صدا نزن — بلوکِ catch آن خطا را می‌بلعد و
 * ریدایرکت بی‌اثر می‌شود. (همان الگویی که در app/page.tsx هم رعایت شده.)
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect(LOGIN_PATH);
  }
}

/** ثبتِ کوکیِ نشست. فقط از اکشنِ ورود، و فقط بعد از verifyPassword موفق. */
export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    // در dev روی http کار می‌کنیم؛ اگر secure را همیشه true بگذاریم مرورگر
    // کوکی را روی localhost دور می‌ریزد و ورود بی‌هیچ پیامی کار نمی‌کند.
    secure: process.env.NODE_ENV === "production",
    // strict نه: با strict، کوکی همراهِ ناوبریِ بعد از ریدایرکت فرستاده نمی‌شود
    // و کاربر بعد از ورودِ موفق دوباره به صفحه‌ی ورود برمی‌گردد.
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** حذفِ کوکی. مقدارِ توکن سمتِ سرور ذخیره نشده، پس همین یک کار «خروج» است. */
export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: COOKIE_PATH });
}

/**
 * پاک‌سازیِ مقصدِ بعد از ورود.
 *
 * ⚠️ این تابع تنها چیزی است که بینِ ?next=... و یک آسیب‌پذیریِ open redirect
 *    ایستاده. اگر مقدارِ کوئری را دست‌نخورده به redirect بدهیم، لینکِ
 *    /admin/login?next=https://evil.example یک صفحه‌ی ورودِ کاملاً معتبرِ
 *    پرامپتش می‌شود که بعد از ورود کاربر را جای دیگری می‌برد.
 *
 * پس فقط مسیرهایی پذیرفته می‌شوند که با /admin شروع شوند و با // شروع نشوند
 * (که مرورگر آن را «پروتکل‌نسبی» و یعنی دامنه‌ی بیرونی می‌فهمد).
 */
export function safeNextPath(raw: string | undefined | null): string {
  if (!raw) return ADMIN_HOME;
  if (!raw.startsWith("/") || raw.startsWith("//")) return ADMIN_HOME;
  if (raw.includes("\\") || raw.includes("\n") || raw.includes("\r")) return ADMIN_HOME;
  if (raw !== ADMIN_HOME && !raw.startsWith(`${ADMIN_HOME}/`)) return ADMIN_HOME;
  if (raw.startsWith(LOGIN_PATH)) return ADMIN_HOME;
  return raw;
}
