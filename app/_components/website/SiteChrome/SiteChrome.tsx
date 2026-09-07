import { SiteHeader } from "@/app/_components/website/SiteHeader";
import { SiteFooter } from "@/app/_components/website/SiteFooter";

/**
 * پوسته‌ی سایتِ عمومی: هدر، ناحیه‌ی محتوا، فوتر.
 *
 * چرا این کامپوننت هست و این سه خط داخلِ layout ریشه نیست؟
 *     پنل مدیریت زیرِ همان layout ریشه می‌نشیند و چیدمان‌های Next روی هم
 *     سوار می‌شوند، نه جایگزینِ هم. اگر هدر و فوترِ سایت در layout ریشه بماند،
 *     /admin هم آن‌ها را به ارث می‌برد و هیچ راهی برای برداشتنشان نیست.
 *     پس ریشه فقط <html>/<body> شد و پوسته آمد داخلِ گروهِ (public).
 *
 * ولی یک مصرف‌کننده‌ی دوم هم دارد و همان دلیلِ وجودِ این فایلِ جداست:
 * app/not-found.tsx باید در ریشه‌ی app بماند، چون تنها همان‌جا آدرس‌های
 * بی‌تطابقِ کلِ سایت را می‌گیرد (مستندِ Next صریح می‌گوید root not-found این
 * نقش را دارد). و چون بیرونِ گروهِ (public) است، پوسته را به ارث نمی‌برد و
 * باید خودش صدایش بزند. با این کامپوننت، آن دو مسیر از هم واگرا نمی‌شوند.
 *
 * ⚠️ flex-1 روی <main> به `flex min-h-dvh flex-col` روی <body> در layout ریشه
 *    وابسته است. آن کلاس‌ها را از body برنداری، وگرنه فوتر در صفحه‌های کوتاه
 *    می‌چسبد بالا.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
