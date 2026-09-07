"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Eye } from "@/app/_components/ui/Icons";
import { findActiveNavItem } from "@/app/_components/admin/AdminNav";

/**
 * نوارِ بالای پنل.
 *
 * عنوان از روی مسیر حساب می‌شود و نه از پراپ. دلیلش این است که هر صفحه‌ی
 * جدیدی که زیرِ /admin اضافه شود، فقط باید در ADMIN_NAV ثبت شود و عنوانش
 * خودبه‌خود درست می‌آید — بدونِ اینکه یادت بماند در دو جا بنویسی.
 *
 * چرا اینجا h1 نیست: هر صفحه h1 خودش را دارد. دو h1 در یک صفحه ساختارِ عنوان‌ها
 * را برای screen reader خراب می‌کند، پس این فقط یک برچسبِ بصری است.
 */
export function AdminTopbar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname();
  const active = findActiveNavItem(pathname);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur-md sm:px-6">
      {/* دکمه‌ی کشو — فقط زیرِ عرضِ lg، چون از آن بالاتر سایدبارِ ثابت هست. */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="باز کردن منوی پنل"
        className="flex size-9 shrink-0 items-center justify-center rounded-plate text-muted transition-colors hover:bg-surface hover:text-ink lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-bold text-ink">
          {active?.label ?? "پنل مدیریت"}
        </span>
        {active?.hint && (
          <span className="truncate text-[10.5px] text-faint">{active.hint}</span>
        )}
      </div>

      {/* دیدنِ سایتِ عمومی. تبِ تازه عمدی است: مدیر وسطِ کار است و نباید
          پنل را از دست بدهد. rel="noreferrer" هم به همان دلیلِ همیشگی. */}
      <Link
        href="/"
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1.5 rounded-pill border border-line px-3 py-2 text-[11.5px] font-semibold text-muted transition-colors hover:border-accent-line hover:text-accent"
      >
        <Eye size={14} />
        <span className="hidden sm:inline">دیدن سایت</span>
      </Link>
    </header>
  );
}
