import Link from "next/link";
import { Search } from "@/app/_components/ui/Icons";
import { EmptyState, PageHeader, btnPrimary } from "@/app/_components/admin/AdminUi";

/**
 * ۴۰۴ درونِ پنل.
 *
 * ── چرا این فایل لازم است ──
 * بدونِ آن، notFound() در /admin/images/999 به not-found ریشه می‌رسید — همان
 * فایلی که <SiteChrome> با هدر و فوترِ سایتِ عمومی را رندر می‌کند. یعنی مدیر
 * وسطِ کار ناگهان از پنل بیرون پرت می‌شد و لینکِ برگشتی به فهرست هم نداشت.
 *
 * ⚠️ محلِ فایل معنا دارد: چون داخلِ گروهِ (panel) است، *درونِ* AdminShell رندر
 *    می‌شود (not-found هر سگمنت بینِ loading و page می‌نشیند و مرزهای همان سگمنت
 *    را به ارث می‌برد). اگر یک پوشه بالاتر، در app/admin/ گذاشته شود، سایدبار را
 *    از دست می‌دهد.
 *
 * ⚠️ گاردِ مجوز ندارد و نباید داشته باشد: این فایل UI محضِ یک کدِ وضعیتِ ۴۰۴ است
 *    و هیچ داده‌ای نمی‌خواند. requireAdmin اینجا فقط یک redirect به صفحه‌ی ورود
 *    اضافه می‌کرد وسطِ رندرِ یک صفحه‌ی خطا.
 */
export default function AdminNotFound() {
  return (
    <>
      <PageHeader title="پیدا نشد" />
      <div className="rounded-card border border-line bg-canvas shadow-card">
        <EmptyState
          icon={Search}
          title="این صفحه در پنل وجود ندارد"
          body="یا آدرس اشتباه تایپ شده، یا رکوردی که دنبالش بودی حذف شده است."
          action={
            <Link href="/admin" className={btnPrimary}>
              بازگشت به داشبورد
            </Link>
          }
        />
      </div>
    </>
  );
}
