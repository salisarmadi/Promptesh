"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, User, LogOut, ChevronRight, ChevronLeft } from "@/app/_components/ui/Icons";
import { ADMIN_NAV } from "@/app/_components/admin/AdminNav";
import { logoutAction } from "@/app/admin/_actions/auth";

/**
 * سایدبارِ پنل.
 *
 * یک کامپوننت، دو ظرف: هم داخلِ ستونِ ثابتِ دسکتاپ می‌نشیند و هم داخلِ کشوی
 * موبایل. اگر دو نسخه می‌ساختیم، اضافه‌کردنِ یک آیتم یعنی دو جا ویرایش.
 * تفاوتشان فقط در دو چیز است و با پراپ حل شده: در کشو حالتِ جمع‌شده معنایی
 * ندارد، و کلیکِ روی لینک باید کشو را ببندد.
 */

type AdminSidebarProps = {
  /** فقط در دسکتاپ معنا دارد. در کشو همیشه false فرستاده می‌شود. */
  collapsed: boolean;
  onToggleCollapse?: () => void;
  /** در کشو: بستنِ کشو بعد از انتخابِ مقصد. */
  onNavigate?: () => void;
  /** متنِ آماده‌شده‌ی سمتِ سرور، مثلاً «تا ۲۳:۱۵». */
  sessionLabel: string | null;
};

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  sessionLabel,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col bg-canvas">
      {/* ── نشانِ پنل ─────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-2.5 px-4 py-5 ${collapsed ? "justify-center" : ""}`}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-mark bg-accent text-white shadow-cta"
          aria-hidden
        >
          <Sparkles size={17} />
        </span>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-extrabold text-ink">پرامپتش</span>
            <span className="truncate text-[10.5px] font-semibold text-faint">پنل مدیریت</span>
          </div>
        )}
      </div>

      {/* ── ناوبری ────────────────────────────────────────────────── */}
      <nav aria-label="بخش‌های پنل مدیریت" className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV.map((item) => {
            // همان منطقِ دو‌حالته‌ی findActiveNavItem، ولی اینجا به آیتم نیاز
            // نداریم بلکه به بولینِ هر ردیف — پس درجا حساب می‌شود.
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  // در حالتِ جمع‌شده متن نیست، پس عنوانِ دسترسی‌پذیر باید از
                  // aria-label بیاید؛ title هم برای tooltipِ موس.
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? `${item.label} — ${item.hint}` : undefined}
                  className={[
                    "flex items-center gap-2.5 rounded-plate px-3 py-2.5 text-[12px] font-semibold transition-colors",
                    collapsed ? "justify-center" : "",
                    active
                      ? "bg-accent text-white shadow-chip"
                      : "text-muted hover:bg-surface hover:text-ink",
                  ].join(" ")}
                >
                  <span className="shrink-0">
                    <Icon size={17} />
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── حسابِ مدیر و خروج ─────────────────────────────────────── */}
      <div className="border-t border-line px-3 py-3">
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          title={collapsed ? "اطلاعات حساب مدیر" : undefined}
          aria-label={collapsed ? "اطلاعات حساب مدیر" : undefined}
          className={[
            "flex items-center gap-2.5 rounded-plate px-2 py-2 transition-colors hover:bg-surface",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-mark bg-surface text-muted"
            aria-hidden
          >
            <User size={15} />
          </span>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[11.5px] font-bold text-ink">مدیرِ سایت</span>
              {/* اگر نشست خوانده نشد، جای عدد چیزی از خودمان نمی‌سازیم. */}
              <span className="truncate text-[10.5px] text-faint">
                {sessionLabel ?? "اطلاعات حساب"}
              </span>
            </div>
          )}
        </Link>

        {/* خروج یک فرمِ POST است و نه لینک — عمدی:
            GETِ اثرگذار را مرورگر و پیش‌واکشیِ نکست می‌توانند خودشان صدا بزنند و
            مدیر بی‌دلیل از پنل بیرون بیفتد. */}
        <form action={logoutAction}>
          <button
            type="submit"
            title={collapsed ? "خروج" : undefined}
            aria-label={collapsed ? "خروج" : undefined}
            className={[
              "mt-1 flex w-full items-center gap-2.5 rounded-plate px-3 py-2.5 text-[12px] font-semibold text-muted transition-colors hover:bg-alert-wash hover:text-alert",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <span className="shrink-0">
              <LogOut size={17} />
            </span>
            {!collapsed && <span>خروج</span>}
          </button>
        </form>

        {/* دکمه‌ی جمع/باز کردن. فقط دسکتاپ — در کشو onToggleCollapse فرستاده
            نمی‌شود، پس این بلوک رندر نمی‌شود. */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"}
            className={[
              "mt-2 flex w-full items-center gap-2.5 rounded-plate px-3 py-2 text-[11px] font-semibold text-faint transition-colors hover:bg-surface hover:text-ink",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            {/* ⚠️ سایدبار در RTL سمتِ راست است، پس «جمع‌کردن» یعنی شِورونِ
                راست (به سمتِ لبه) و «بازکردن» یعنی چپ. برای کسی که با LTR
                فکر می‌کند برعکسِ شهود است؛ جایشان را عوض نکن. */}
            <span className="shrink-0">
              {collapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </span>
            {!collapsed && <span>جمع کردن</span>}
          </button>
        )}
      </div>
    </div>
  );
}
