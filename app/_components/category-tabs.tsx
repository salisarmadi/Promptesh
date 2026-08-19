import Link from "next/link";
import type { CategoryWithCount } from "@/lib/gallery";

/**
 * تب‌های فیلتر دسته‌بندی بالای گالری. (کامپوننت سرور — بدون state کلاینتی)
 *
 * چرا سرور و نه کلاینت؟ هر تب فقط یک <Link> است که searchParams را عوض می‌کند
 * (/?category=couple). خودِ صفحه دوباره سمت سرور رندر می‌شود و گرید فیلترشده
 * می‌آید. مزیت‌ها: URL قابل‌اشتراک، بدون جاوااسکریپت هم کار می‌کند، prefetch
 * خودکار، و «تبِ فعال» از روی همان slugِ فعلی مشخص می‌شود نه از state.
 *
 * چرا searchParams و نه مسیر /category/[slug]؟ کم‌فایل‌ترین راه برای MVP و
 * نگه‌داشتن صفحه‌ی اصلی به‌صورت یک صفحه. مسیرِ اختصاصیِ سئو-محور بعداً (کنار
 * کار /image/[id]) اضافه می‌شود.
 */

const numFa = new Intl.NumberFormat("fa-IR");

export function CategoryTabs({
  categories,
  activeSlug,
}: {
  categories: CategoryWithCount[];
  /** slugِ دستهٔ فعال، یا null یعنی تبِ «همه». */
  activeSlug: string | null;
}) {
  return (
    // منفی‌حاشیه‌ها اجازه می‌دهند نوار تب‌ها روی موبایل تا لبه‌ی صفحه اسکرول شود.
    <nav aria-label="فیلتر دسته‌بندی" className="mb-5 -mx-4 sm:mx-0">
      <ul className="flex gap-2 overflow-x-auto px-4 pb-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <TabLink href="/" label="همه" active={activeSlug === null} />
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <TabLink
              href={`/?category=${c.slug}`}
              label={c.name_fa}
              count={c.image_count}
              active={activeSlug === c.slug}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      // scroll={false}: با عوض‌شدن تب، صفحه به بالا نپرد؛ کاربر جای خودش بماند.
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className={`text-xs tabular-nums ${active ? "text-indigo-200" : "text-gray-400"}`}>
          {numFa.format(count)}
        </span>
      ) : null}
    </Link>
  );
}
