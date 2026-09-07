import type { ComponentType } from "react";
import {
  LayoutDashboard,
  ImageIcon,
  FileText,
  Tag,
  ChartBar,
  Settings,
} from "@/app/_components/ui/Icons";

/**
 * تنها منبعِ حقیقتِ ناوبریِ پنل.
 *
 * چرا داده و نه JSX پراکنده: همین آرایه سه مصرف‌کننده دارد — سایدبارِ دسکتاپ،
 * کشوی موبایل، و عنوانِ تاپ‌بار. اگر هر سه فهرستِ خودشان را داشتند، اضافه‌کردنِ
 * یک صفحه یعنی سه‌جا ویرایش و یکی‌شان همیشه جا می‌ماند.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** توضیحِ یک‌خطی؛ در حالتِ جمع‌شده به‌عنوان tooltip و در کشو زیرِ عنوان می‌آید. */
  hint: string;
};

/** ترتیب همان چیزی است که در بریف خواسته شده و عمداً عوض نشده. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    href: "/admin",
    label: "داشبورد",
    icon: LayoutDashboard,
    hint: "نگاهِ کلی به وضعیتِ گالری",
  },
  {
    href: "/admin/images",
    label: "تصاویر",
    icon: ImageIcon,
    hint: "افزودن، ویرایش و حذفِ تصویر",
  },
  {
    href: "/admin/prompts",
    label: "پرامپت‌ها",
    icon: FileText,
    hint: "ویرایشِ متنِ پرامپت‌ها",
  },
  {
    href: "/admin/categories",
    label: "دسته‌بندی‌ها",
    icon: Tag,
    hint: "مدیریتِ دسته‌ها و تعدادِ تصاویرشان",
  },
  {
    href: "/admin/analytics",
    label: "آمار و گزارش‌ها",
    icon: ChartBar,
    hint: "توزیعِ محتوا و روندِ افزودن",
  },
  {
    href: "/admin/settings",
    label: "تنظیمات",
    icon: Settings,
    hint: "وضعیتِ اتصال‌ها و حسابِ مدیر",
  },
] as const;

/**
 * پیدا کردنِ آیتمِ فعال از روی مسیرِ فعلی.
 *
 * ⚠️ منطقِ تطبیق دو حالته است و باید همین‌طور بماند:
 *    «/admin» فقط با تطبیقِ دقیق فعال می‌شود، وگرنه چون پیشوندِ همه‌ی مسیرهای
 *    دیگر است، در کلِ پنل روشن می‌ماند و «داشبورد» همیشه فعال به نظر می‌رسد.
 *    بقیه با پیشوند تطبیق می‌کنند تا /admin/images/new هم «تصاویر» را فعال کند.
 *
 * بلندترین تطبیق برنده است، تا اگر روزی مسیرِ تودرتویی اضافه شد که خودش هم در
 * این فهرست است، والدش آن را ندزدد.
 */
export function findActiveNavItem(pathname: string): AdminNavItem | undefined {
  let best: AdminNavItem | undefined;

  for (const item of ADMIN_NAV) {
    const matches =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (matches && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }

  return best;
}
