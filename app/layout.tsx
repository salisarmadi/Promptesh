import type { Metadata } from "next";
import "./globals.css";

/**
 * چیدمان ریشه.
 *
 * نام سایت: «پرامپتش». در سه جای پروژه سه اسم مختلف بود — متادیتا
 * «پرامپت‌گالری»، هدر صفحه «پرامپتش»، و مرجع دیزاین در فوتر «پرامپتا». روی
 * «پرامپتش» یکدست شد چون هم نام پوشه‌ی پروژه است و هم چیزی که در UI بود.
 *
 * metadataBase از متغیر محیطی می‌آید تا با رفتن به دامنه‌ی واقعی فقط یک خط
 * در .env.local عوض شود و نه کد. اگر تنظیم نشده باشد، نکست آدرس‌های OG را
 * نسبی می‌گذارد که در dev بی‌مشکل است.
 *
 * ── چرا هدر و فوترِ سایت اینجا نیست ──
 * قبلاً <SiteHeader/> و <SiteFooter/> همین‌جا بودند. با اضافه‌شدنِ پنل مدیریت
 * منتقل شدند به app/(public)/layout.tsx، چون چیدمان‌های Next روی هم سوار
 * می‌شوند و جایگزینِ هم نمی‌شوند: تا وقتی پوسته در ریشه بود، /admin هم هدر و
 * فوترِ گالری را به ارث می‌برد و راهی برای حذفشان وجود نداشت.
 *
 * آدرس‌ها با این جابه‌جایی عوض نشدند؛ (public) یک گروهِ مسیر است و در URL
 * دیده نمی‌شود.
 *
 * پس این فایل الان فقط سه چیز دارد: پوسته‌ی HTML، استایلِ سراسری، و متادیتای
 * پیش‌فرض. هرچه اضافه کنی، پنل مدیریت هم آن را می‌گیرد.
 */

const SITE_NAME = "پرامپتش";
const SITE_DESCRIPTION =
  "گالری عکس‌های ساخته‌شده با هوش مصنوعی، هر عکس با پرامپت دقیق خودش. متن را کپی کن و در ابزار خودت بزن.";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  // %s جای عنوان صفحه‌های داخلی را می‌گیرد؛ صفحه‌ی اصلی از default استفاده می‌کند.
  title: {
    default: `${SITE_NAME} — عکس و پرامپتش، آماده‌ی کپی`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — عکس و پرامپتش، آماده‌ی کپی`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="antialiased">
      {/* min-h-dvh نه min-h-screen: روی موبایل، ۱۰۰vh ارتفاعِ نوار آدرس را
          حساب نمی‌کند و ته صفحه زیر آن گم می‌شود.
          ⚠️ flex-col و min-h-dvh اینجا لازم‌اند تا flex-1 روی <main> در
          SiteChrome کار کند و فوتر در صفحه‌های کوتاه ته صفحه بنشیند. */}
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
