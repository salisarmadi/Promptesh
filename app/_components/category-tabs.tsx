import Link from "next/link";
import type { CategoryWithCount } from "@/lib/gallery";
import { galleryHref } from "@/lib/urls";

/**
 * ردیفِ فیلترِ دسته — تک‌انتخابی، سمتِ سرور، بدون هیچ state کلاینتی.
 *
 * <Link> و نه onClick: وضعیتِ فیلتر در URL است، پس دکمه‌ی بازگشت کار می‌کند،
 * لینکِ «گالریِ پرتره» قابل‌فرستادن است، و این کامپوننت هیچ جاواسکریپتی به
 * مرورگر نمی‌فرستد.
 *
 * scroll={false}: با عوض‌کردن دسته، صفحه نباید به بالا بپرد؛ کاربر دارد
 * فیلترها را مقایسه می‌کند و پرشِ اسکرول جایش را گم می‌کند.
 *
 * نکته‌ی مهم: عبارتِ جستجو از galleryHref همراه لینک می‌رود. اگر نمی‌رفت،
 * کاربری که «bokeh» را جستجو کرده و بعد روی «پرتره» می‌زند، بی‌خبر جستجویش را
 * از دست می‌داد.
 *
 * ── تغییرها نسبت به نسخه‌ی قبل ──
 * • نقطه‌ی طلاییِ کنارِ دسته‌ی فعال حذف شد. در ماک هیچ طلایی وجود ندارد و آن
 *   نقطه امضای پالتِ قدیمی بود. کارِ اطلاع‌رسانی‌اش را از قبل هم aria-current و
 *   کنتراستِ پرِ آبی انجام می‌دادند، پس چیزی از دست نرفت.
 * • شمارِ عکس‌ها ماند، هرچند در ماک نیست: با ۶۲۴ عکس در «پرتره» و ۴ عکس در
 *   «گروهی»، همین عدد تنها چیزی است که به کاربر می‌گوید کدام دسته ارزشِ زدن
 *   دارد. حذفش برای شبیه‌شدن به ماک، یک دادهٔ واقعی را قربانیِ ظاهر می‌کرد.
 */

const numFa = new Intl.NumberFormat("fa-IR");

export function CategoryTabs({
  categories,
  activeSlug,
  query,
  totalCount,
}: {
  categories: CategoryWithCount[];
  activeSlug: string | null;
  /** عبارتِ جستجوی فعال — حفظ می‌شود. */
  query: string;
  /** تعدادِ کلِ عکس‌ها با جستجوی فعلی و بدون فیلترِ دسته — شمارِ چیپِ «همه». */
  totalCount: number;
}) {
  return (
    <nav aria-label="فیلتر دسته‌بندی" className="rail flex gap-2 py-1">
      <Chip href={galleryHref({ q: query })} isActive={activeSlug === null} count={totalCount}>
        همه
      </Chip>

      {categories.map((c) => (
        <Chip
          key={c.slug}
          href={galleryHref({ category: c.slug, q: query })}
          isActive={activeSlug === c.slug}
          count={c.image_count}
        >
          {c.name_fa}
        </Chip>
      ))}
    </nav>
  );
}

function Chip({
  href,
  isActive,
  count,
  children,
}: {
  href: string;
  isActive: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      // aria-current تنها راهی است که کاربرِ اسکرین‌ریدر بفهمد کدام فیلتر فعال
      // است؛ رنگِ پس‌زمینه برای او وجود ندارد.
      aria-current={isActive ? "page" : undefined}
      /* اندازه‌ها از ماک: ۱۲ پیکسل متن، ارتفاعِ کمینه‌ی ۳۴، پرِ ۷×۱۵.
         min-h-[34px] لازم است چون چیپِ فعال وزنِ ۷۰۰ می‌گیرد و بدون ارتفاعِ
         کمینه، ردیف با هر انتخاب یک پیکسل بالا و پایین می‌پرید. */
      className={`flex min-h-[34px] shrink-0 items-center gap-2 rounded-full border px-[15px] py-[7px] text-xs transition-colors ${
        isActive
          ? "border-accent bg-accent font-bold text-white shadow-chip"
          : "border-line bg-canvas font-medium text-muted hover:border-accent/40 hover:text-accent"
      }`}
    >
      <span>{children}</span>
      <span className={isActive ? "text-white/70" : "text-faint"}>{numFa.format(count)}</span>
    </Link>
  );
}
