import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapTargets } from "@/lib/gallery";
import { galleryHref, imageHref } from "@/lib/urls";

/**
 * sitemap.xml — فهرستِ آدرس‌هایی که می‌خواهیم گوگل بشناسد.
 *
 * ── چه چیزی داخل است ──
 * صفحه‌ی اصلی، هر دسته‌ای که دست‌کم یک عکس دارد، و هر عکسی که پرامپت دارد.
 * شرطِ عضویت در هر سه مورد یکی است: «همان آدرسی که خودِ صفحه‌اش index می‌گیرد».
 * جزئیاتِ فیلترها و دلیلشان در getSitemapTargets در lib/gallery.ts نوشته شده.
 *
 * ── چه چیزی بیرون است و چرا ──
 * ۱) آدرس‌های صفحه‌بندی («/?page=2»، «/category/x?page=3»). خودشان کانونیکِ
 *    خودشان‌اند و noindex نیستند، پس *می‌شد* آوردشان — ولی چیزی اضافه نمی‌کردند:
 *    تنها کارِ آن صفحه‌ها رساندنِ خزنده به عکس‌هاست و هر ۷۰۰ عکس مستقیم در همین
 *    فایل فهرست شده‌اند. در عوض حجمِ فایل چند برابر می‌شد.
 * ۲) نمای جستجو («?q=»). خودِ صفحه noindex می‌گذارد و فضایش بی‌نهایت است.
 * ۳) /admin و /admin/login. متادیتای خودشان noindex, nofollow, nocache دارد.
 *    ⚠️ در robots.txt هم Disallow نگرفتند و این عمدی است: آدرسی که Disallow شود
 *    اصلاً fetch نمی‌شود، پس گوگل آن noindex را *نمی‌خواند* و می‌تواند آدرس را
 *    بی‌محتوا در فهرست نگه دارد. noindex قوی‌تر از Disallow است و هر دو با هم،
 *    ضعیف‌ترش برنده می‌شود.
 *
 * ── چرا changeFrequency و priority نیست ──
 * گوگل رسماً هر دو را نادیده می‌گیرد. عددی که هیچ‌کس نمی‌خواند، فقط این توهم را
 * می‌سازد که یک اهرمِ سئویی در دست داریم. lastModified اما واقعاً استفاده می‌شود.
 *
 * ── چرا await connection() ──
 * sitemap.ts در نکست یک Route Handler است که «به‌طور پیش‌فرض کش می‌شود مگر از
 * یک Request-time API استفاده کند» (مستندِ خودِ نکست). بی این خط دو مشکل داشتیم:
 * در build که DATABASE_URL واقعی وجود ندارد کوئری‌ها اجرا می‌شدند و build را
 * می‌شکستند، و اگر هم موفق می‌شدند فایل با محتوای روزِ build فریز می‌شد — یعنی
 * هر عکسِ تازه تا deploy بعدی در sitemap نبود، که کلِ هدفِ این فایل را از بین
 * می‌برد.
 *
 * ⚠️ خطای دیتابیس اینجا عمداً گرفته نمی‌شود. برخلافِ صفحه‌های گالری که پیامِ
 * راهنما نشان می‌دهند، جوابِ درست برای خزنده کدِ ۵۰۰ است تا بعداً دوباره تلاش
 * کند. یک sitemapِ خالی با کدِ ۲۰۰ به گوگل می‌گوید «همه‌ی آن ۷۰۰ آدرس حذف
 * شده‌اند» — یعنی یک قطعیِ چنددقیقه‌ای به یک افتِ ماندگارِ فهرست تبدیل می‌شود.
 */

/**
 * ریشه‌ی آدرسِ سایت، بی اسلشِ آخر.
 *
 * ⚠️ sitemap برخلافِ canonical آدرسِ نسبی نمی‌پذیرد؛ استانداردش <loc> را مطلق
 * می‌خواهد و نکست هم اینجا metadataBase را اعمال نمی‌کند. پس بی این متغیر هیچ
 * ردیفِ معتبری ساخته نمی‌شود.
 *
 * replace: اگر کسی «https://promptesh.ir/» را با اسلش بگذارد، الحاقِ ساده
 * «//category/x» می‌ساخت.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // بالای تابع و بی‌قید و شرط: نباید در build اجرا شود، حتی در شاخه‌ی خالیِ زیر.
  await connection();

  if (!SITE_URL) {
    /**
     * نه throw و نه سکوت.
     *
     * throw یعنی /sitemap.xml در حالتِ توسعه ۵۰۰ بدهد، درحالی‌که در dev هیچ‌کس
     * این متغیر را لازم ندارد. سکوتِ کامل هم بدتر بود: یک sitemapِ خالی روی
     * پروداکشن دقیقاً شبیهِ یک sitemapِ سالم است و ماه‌ها کسی نمی‌فهمد.
     *
     * لاگ در هر درخواست تکرار می‌شود و این عمدی است: در لاگِ Netlify دیده
     * می‌شود، نه فقط در خروجیِ build که کسی بعداً نمی‌خواندش.
     */
    console.warn(
      "[sitemap] NEXT_PUBLIC_SITE_URL ست نشده — sitemap.xml خالی برگشت. " +
        "پیش از لانچ باید ست شود، وگرنه هیچ آدرسی به گوگل معرفی نمی‌شود."
    );
    return [];
  }

  const { latest, categories, images } = await getSitemapTargets();

  /**
   * مسیرِ نسبی → آدرسِ مطلق.
   *
   * مسیرها از galleryHref و imageHref می‌آیند و نه از رشته‌سازیِ محلی: شکلِ آدرس
   * فقط یک جا تعریف می‌شود، پس اگر فردا «/image/<id>» به «/image/<id>/<slug>»
   * تبدیل شد، sitemap خودش درست می‌ماند و بی‌صدا ۷۰۰ آدرسِ ۴۰۴ نمی‌فرستد.
   *
   * حالتِ «/» جدا افتاده چون galleryHref برای ریشه «/» می‌دهد و الحاقِ ساده
   * «https://promptesh.ir/» می‌ساخت — که با آدرسِ کانونیکِ خودِ صفحه
   * («https://promptesh.ir») یکی نیست و گوگل دو آدرس می‌دید.
   */
  const abs = (path: string) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`);

  return [
    {
      url: abs(galleryHref()),
      // latest === null یعنی گالری خالی است؛ آن‌وقت lastmodِ ساختگی نمی‌دهیم.
      ...(latest ? { lastModified: latest } : {}),
    },
    ...categories.map((c) => ({
      url: abs(galleryHref({ category: c.slug })),
      lastModified: c.last_modified,
    })),
    ...images.map((img) => ({
      url: abs(imageHref(img.id)),
      lastModified: img.last_modified,
    })),
  ];
}
