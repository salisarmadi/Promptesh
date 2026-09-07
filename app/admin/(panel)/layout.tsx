import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireAdmin, getAdminSessionExpiry } from "@/lib/admin/auth";
import { AdminShell } from "@/app/_components/admin/AdminShell";

/**
 * چیدمانِ گروهِ (panel) — همه‌ی صفحه‌های پنل جز صفحه‌ی ورود.
 *
 * چرا گروهِ مسیر و نه app/admin/layout.tsx؟
 *     چون /admin/login هم زیرِ app/admin است و نباید سایدبار بگیرد. با گروه،
 *     صفحه‌ی ورود بیرونِ آن می‌ماند و آدرس‌ها هم عوض نمی‌شوند: پرانتز در URL
 *     دیده نمی‌شود، پس app/admin/(panel)/page.tsx همان /admin است.
 *
 * ⚠️ requireAdmin اینجا هست ولی این «امنیتِ» پنل نیست، فقط جلوی *دیده‌شدنِ*
 *    پوسته را می‌گیرد. چیدمان در جابه‌جایی بینِ مسیرهای همین گروه دوباره اجرا
 *    نمی‌شود و جلوی رندرِ صفحه‌های تودرتو را هم نمی‌گیرد. پس هر صفحه‌ی این
 *    گروه و هر Server Action باید خودش هم requireAdmin را صدا بزند. این قاعده
 *    استثنا ندارد؛ توضیحِ کاملش در lib/admin/auth.ts است.
 */

export const metadata: Metadata = {
  // قالبِ عنوانِ layout ریشه («%s — پرامپتش») برای پنل مناسب نیست.
  title: { default: "پنل مدیریت", template: "%s — پنل مدیریت" },
  robots: { index: false, follow: false, nocache: true },
};

const SIDEBAR_COOKIE = "promptesh_admin_sidebar";

/**
 * منطقه‌ی زمانیِ نمایش، دستی و ثابت.
 *
 * ⚠️ بدونِ این، ساعت با منطقه‌ی زمانیِ *سرور* فرمت می‌شود. روی Netlify آن UTC
 *    است، یعنی مدیر در تهران عددی می‌دید که سه‌ساعت‌و‌نیم عقب بود و به نظر
 *    می‌رسید نشستش قبلاً تمام شده. هاردکد بودنش عیب نیست: مخاطبِ این پنل یک
 *    نفرِ مشخص در ایران است.
 */
const DISPLAY_TIME_ZONE = "Asia/Tehran";

/**
 * «نشست تا ۲۳:۱۵» یا «نشست تا فردا ۱۱:۳۰».
 *
 * سمتِ سرور ساخته می‌شود و به‌عنوان رشته پایین می‌رود، نه به‌عنوان تاریخ:
 * فرمت‌کردنِ تاریخ سمتِ کلاینت با منطقه‌ی زمانیِ متفاوتِ سرور، اختلافِ
 * HTMLِ سرور و کلاینت و در نتیجه خطای هیدریت می‌سازد.
 *
 * چون عمرِ نشست ۱۲ ساعت است، انقضا فقط می‌تواند «امروز» یا «فردا» باشد؛ پس
 * همین دو حالت کافی است و به فرمتِ تاریخِ کامل نیازی نیست.
 */
function formatSessionLabel(expiresAt: number | null): string | null {
  if (expiresAt === null) return null;

  const time = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(expiresAt);

  // مقایسه‌ی «همان روز» هم باید در همان منطقه‌ی زمانی انجام شود، وگرنه نزدیکِ
  // نیمه‌شبِ تهران جواب با ساعتِ نمایش‌داده‌شده نمی‌خواند.
  const dayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  });
  const sameDay = dayFormatter.format(expiresAt) === dayFormatter.format(Date.now());

  return sameDay ? `نشست تا ${time}` : `نشست تا فردا ${time}`;
}

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const [store, expiresAt] = await Promise.all([cookies(), getAdminSessionExpiry()]);
  const collapsed = store.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <AdminShell collapsedInitial={collapsed} sessionLabel={formatSessionLabel(expiresAt)}>
      {children}
    </AdminShell>
  );
}
