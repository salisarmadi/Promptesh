import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="antialiased">
      {/* min-h-dvh نه min-h-screen: روی موبایل، ۱۰۰vh ارتفاعِ نوار آدرس را
          حساب نمی‌کند و ته صفحه زیر آن گم می‌شود. */}
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
