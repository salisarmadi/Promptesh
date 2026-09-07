import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/admin/session";
import { LOGIN_PATH, ADMIN_HOME } from "@/lib/admin/auth-paths";

/**
 * دربانِ سریعِ مسیرهای /admin.
 *
 * ⚠️ در Next 16 این فایل «proxy» است، نه middleware. اسمِ فایل و نامِ تابع هر
 *    دو عوض شده‌اند؛ اگر جایی middleware.ts بسازی، Next 16 نادیده‌اش می‌گیرد و
 *    پنل بی‌دربان بالا می‌آید — یعنی خرابیِ خاموش، بدون هیچ خطایی.
 *
 * این لایه یک بررسیِ خوش‌بینانه است و نه مرزِ امنیت: فقط امضای کوکی را
 * می‌سنجد تا کاربرِ بی‌نشست پیش از رندرِ صفحه به /admin/login برود. بررسیِ
 * واقعی داخلِ خودِ صفحه‌ها و Server Actionها با requireAdmin() انجام می‌شود.
 * دلیلش صریح در مستندِ Next آمده: proxy جلوی صدازدنِ مستقیمِ Server Action یا
 * رندرِ بخش‌های تودرتو را نمی‌گیرد.
 *
 * چرا اصلاً وجود دارد؟ چون بدونش، کاربرِ خارج‌شده یک لحظه پوسته‌ی پنل را
 * می‌دید و بعد ریدایرکت می‌شد؛ و صفحه‌ها بی‌دلیل رندر می‌شدند.
 *
 * runtime این فایل در Next 16 همیشه nodejs است و قابلِ تنظیم نیست — که دقیقاً
 * به نفعِ ماست: node:crypto در دسترس است، پس HMAC همین‌جا بررسی می‌شود.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const onLoginPage = pathname === LOGIN_PATH;

  // کاربرِ واردشده کاری در صفحه‌ی ورود ندارد.
  if (authenticated && onLoginPage) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
  }

  if (!authenticated && !onLoginPage) {
    const url = new URL(LOGIN_PATH, request.url);
    // مقصد را نگه می‌داریم تا بعد از ورود همان‌جا برگردد و کاربر مسیرش را از
    // اول پیدا نکند. اعتبارسنجی‌اش سمتِ اکشنِ ورود با safeNextPath انجام
    // می‌شود — اینجا هرچه بنویسیم، آنجا دوباره سنجیده می‌شود.
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * هر دو الگو لازم است: '/admin/:path*' زیرمسیرها را می‌گیرد و '/admin' خودِ
   * ریشه را. با یکی از این دو، همیشه یک طرف از قلم می‌افتد.
   *
   * دامنه عمداً تنگ است: گالریِ عمومی نباید به‌خاطر پنل، به ازای هر درخواست
   * یک لایه‌ی اضافه رد کند.
   */
  matcher: ["/admin", "/admin/:path*"],
};
