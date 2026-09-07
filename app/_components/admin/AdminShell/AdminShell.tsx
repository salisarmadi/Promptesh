"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "@/app/_components/ui/Icons";
import { AdminSidebar } from "@/app/_components/admin/AdminSidebar";
import { AdminTopbar } from "@/app/_components/admin/AdminTopbar";

/**
 * قالبِ پنل: سایدبارِ ثابتِ دسکتاپ، کشوی موبایل، تاپ‌بار، و ناحیه‌ی محتوا.
 *
 * ── چرا این کامپوننت کلاینتی است ──
 * تنها به‌خاطرِ دو حالتِ رابط: جمع‌بودنِ سایدبار و بازبودنِ کشو. صفحه‌های داخلِ
 * پنل همه سروری می‌مانند و به‌عنوان children از سرور می‌آیند، پس هیچ‌کدام از
 * کوئری‌های دیتابیس به باندلِ مرورگر نمی‌روند.
 *
 * ── چرا حالتِ جمع‌شدن در کوکی است و نه در localStorage ──
 * با localStorage، سرور نمی‌داند سایدبار جمع است یا نه، پس اولین رندر همیشه
 * حالتِ باز است و بعد از هیدریت می‌پرد به حالتِ جمع — یک پرشِ چیدمانِ دیدنی در
 * هر بار لود. کوکی سمتِ سرور خوانده می‌شود و رندرِ اول درست است.
 * (نکته‌ی جانبی: دامنه‌ی کوکی /admin است، پس همراهِ درخواست‌های سایتِ عمومی
 * نمی‌رود.)
 */

const SIDEBAR_COOKIE = "promptesh_admin_sidebar";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const WIDTH_EXPANDED = 264;
const WIDTH_COLLAPSED = 76;

export function AdminShell({
  collapsedInitial,
  sessionLabel,
  children,
}: {
  collapsedInitial: boolean;
  sessionLabel: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(collapsedInitial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  /**
   * بستنِ کشو وقتی مسیر عوض می‌شود.
   *
   * بدونِ این، بعد از انتخابِ یک صفحه کشو باز می‌ماند و صفحه‌ی تازه را می‌پوشاند.
   * (onNavigate روی لینک‌ها هم همین کار را می‌کند؛ این لایه‌ی دوم برای
   * ناوبری‌هایی است که از جای دیگری می‌آیند — مثلاً دکمه‌ی back مرورگر.)
   *
   * ⚠️ چرا در بدنه‌ی رندر و نه در useEffect: setState داخلِ افکت یک رندرِ دومِ
   *    زنجیره‌ای می‌سازد، یعنی کاربر یک فریم کشوی بازِ روی صفحه‌ی جدید را
   *    می‌بیند. این همان الگوی «تنظیمِ state وقتی پراپ عوض می‌شود» از مستندات
   *    ری‌اکت است: ری‌اکت رندر را همان‌جا رها می‌کند و با مقدارِ تازه دوباره
   *    شروع می‌کند، بی اینکه چیزی به DOM برود. شرط لازم است — بی آن، حلقه‌ی
   *    بی‌پایان می‌شود.
   */
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (pathname !== drawerPathname) {
    setDrawerPathname(pathname);
    setDrawerOpen(false);
  }

  /** عنصری که قبل از باز شدنِ کشو فوکوس داشت، تا بعد از بستن به آن برگردد. */
  const focusBeforeDrawer = useRef<HTMLElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);

  const toggleCollapse = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    // نوشتنِ کوکی بیرونِ به‌روزرسانِ setState است و عمداً: React در حالتِ
    // strict به‌روزرسان را دو بار صدا می‌زند و اثرِ جانبی داخلش جای درستی
    // نیست.
    document.cookie = [
      `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}`,
      "path=/admin",
      `max-age=${SIDEBAR_COOKIE_MAX_AGE}`,
      "samesite=lax",
    ].join("; ");
  }, [collapsed]);

  const openDrawer = useCallback(() => {
    focusBeforeDrawer.current = document.activeElement as HTMLElement | null;
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Esc برای بستن، و قفلِ اسکرولِ پشتِ کشو.
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    // فوکوس می‌رود روی دکمه‌ی بستن، وگرنه کاربرِ کیبورد داخلِ کشو گم می‌شود.
    drawerCloseRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      focusBeforeDrawer.current?.focus();
    };
  }, [drawerOpen, closeDrawer]);

  return (
    // bg-surface عمدی: دات‌گریدِ زمینه‌ی سایتِ عمومی زیرِ جدول و کارت‌های داده
    // شلوغ می‌شود. این یک لایه‌ی مات روی آن می‌کشد، با همان توکن‌ها.
    <div className="flex flex-1 bg-surface">
      {/* ── سایدبارِ دسکتاپ ───────────────────────────────────────────
          sticky + h-dvh یعنی صفحه به‌صورتِ معمولی اسکرول می‌شود ولی سایدبار
          سرِ جایش می‌ماند؛ ساده‌تر و کم‌خطاتر از دو ناحیه‌ی اسکرولِ جدا.
          border-e (نه border-s): در RTL سایدبار سمتِ راست است، پس مرزِ آن با
          محتوا لبه‌ی inline-end است. */}
      <aside
        className="sticky top-0 hidden h-dvh shrink-0 border-e border-line transition-[width] duration-200 ease-out lg:flex"
        style={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
      >
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          sessionLabel={sessionLabel}
        />
      </aside>

      {/* ── کشوی موبایل ──────────────────────────────────────────────
          ⚠️ start-0 در RTL یعنی سمتِ راست، و translate-x-full یعنی جابه‌جاییِ
          فیزیکی به راست — پس کشو از راست می‌آید. کلاس‌های translate در تِیلویند
          منطقی (logical) نیستند و با dir برنمی‌گردند؛ اگر روزی نسخه‌ی LTR اضافه
          شد، این دو باید دستی عوض شوند. */}
      <div
        onClick={closeDrawer}
        aria-hidden
        className={`fixed inset-0 z-30 bg-ink/40 transition-opacity duration-200 lg:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="منوی پنل مدیریت"
        // وقتی بسته است از ترتیبِ Tab بیرون می‌رود، وگرنه فوکوس داخلِ یک پنلِ
        // نامرئی گیر می‌کند. inert در React 19 یک پراپِ بولینِ واقعی است.
        inert={!drawerOpen}
        className={`fixed inset-y-0 start-0 z-40 flex w-[264px] max-w-[82vw] shadow-modal transition-transform duration-200 ease-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <AdminSidebar collapsed={false} onNavigate={closeDrawer} sessionLabel={sessionLabel} />
        <button
          ref={drawerCloseRef}
          type="button"
          onClick={closeDrawer}
          aria-label="بستن منو"
          className="absolute end-3 top-4 flex size-8 items-center justify-center rounded-plate text-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── ستونِ محتوا ──────────────────────────────────────────────
          ⚠️ min-w-0 لازم است. بدونش، اولین جدولِ عریض یا رشته‌ی بلندِ بی‌فاصله
          کلِ ستون را پهن می‌کند و سایدبار را از صفحه بیرون می‌اندازد — چون
          کمینه‌ی عرضِ پیش‌فرضِ آیتمِ فلکس auto است، نه صفر. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onOpenDrawer={openDrawer} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
