import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { faNum, percent } from "@/lib/admin/format";

/**
 * قطعه‌های پایه‌ی رابطِ پنل.
 *
 * همه سروری‌اند — هیچ‌کدام "use client" ندارند و نباید بگیرند. رابطِ پنل عمداً
 * تا جای ممکن سروری می‌ماند و فقط جاهایی که حالتِ تعاملی دارند (کشو، فرم،
 * دیالوگِ حذف) کلاینتی می‌شوند.
 *
 * ⚠️ اینجا جای «کامپوننتِ همه‌کاره» نیست. هر کدام یک کارِ چشمی می‌کند و پراپِ
 *    منطقی نمی‌گیرد؛ منطق در صفحه می‌ماند. اگر روزی یکی از این‌ها بیش از دو
 *    شاخه‌ی شرطی گرفت، یعنی باید در صفحه‌ی مصرف‌کننده حل می‌شد.
 */

// ---------------------------------------------------------------------------
// سرِ صفحه
// ---------------------------------------------------------------------------

/**
 * تیترِ صفحه.
 *
 * هر صفحه‌ی پنل دقیقاً یک <h1> دارد و همین است. تاپ‌بار عنوانِ بخش را با <span>
 * نشان می‌دهد نه تیتر، تا ساختارِ تیترهای سند دوتا نشود.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[19px] font-extrabold text-ink-title sm:text-[22px]">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[12px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ظرف‌ها
// ---------------------------------------------------------------------------

/** کارتِ سفید روی زمینه‌ی surface — واحدِ اصلیِ چیدمانِ پنل. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-canvas shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

/** سرِ کارت با تیترِ h2 و یک لینکِ اختیاری در لبه‌ی مقابل. */
export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-[13px] font-extrabold text-ink">{title}</h2>
        {hint ? <p className="text-[11px] text-faint">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// کاشیِ آمار
// ---------------------------------------------------------------------------

type IconComponent = ComponentType<{ size?: number; className?: string }>;

/**
 * یک عدد و بافتش.
 *
 * ⚠️ پراپِ note اختیاری نیست از سرِ سلیقه: عددِ بی‌بافت در این پنل خطرناک است.
 *    مثال واقعی — «۰ مورد در ۷ روز گذشته» به‌تنهایی شبیهِ خرابیِ سایت است، ولی
 *    با یادداشتِ «تازه‌ترین تصویر: ۱۴ مرداد» می‌شود یک واقعیتِ قابل‌فهم. هر جا
 *    عددی می‌تواند صفر باشد، note را پر کن.
 *
 * tabular-nums برای هم‌ترازیِ عمودیِ عددها در ردیفِ کاشی‌ها.
 */
export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number;
  note?: ReactNode;
  icon: IconComponent;
  /** اگر داده شود، کلِ کاشی لینک می‌شود. */
  href?: string;
  /** attention: عددی که کارِ باقی‌مانده را نشان می‌دهد، نه یک آمارِ بی‌طرف. */
  tone?: "neutral" | "accent" | "attention";
}) {
  const iconTone =
    tone === "attention"
      ? "bg-alert-wash text-alert"
      : tone === "accent"
        ? "bg-accent text-white shadow-cta"
        : "bg-accent-soft text-accent";

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-faint-label">{label}</span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-mark ${iconTone}`}
          aria-hidden
        >
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-3 text-[26px] font-extrabold leading-none tabular-nums text-ink-title">
        {faNum(value)}
      </p>
      {note ? <p className="mt-2 text-[11px] leading-relaxed text-faint">{note}</p> : null}
    </>
  );

  const shell =
    "flex flex-col rounded-card border border-line bg-canvas p-4 shadow-card transition-colors";

  return href ? (
    <Link href={href} className={`${shell} hover:border-accent-line hover:bg-surface`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

// ---------------------------------------------------------------------------
// نوارِ کامل‌بودنِ داده
// ---------------------------------------------------------------------------

/**
 * یک ردیف از فهرستِ «کارهای ناتمام»: چند تا از N رکورد این فیلد را دارند.
 *
 * درصد از خودِ داده درمی‌آید و هیچ عددی ساختگی نیست. نوار وقتی کامل است رنگِ
 * affirm می‌گیرد، وگرنه accent — یعنی «تمام شد» را می‌شود از دور دید.
 */
export function CompletenessRow({
  label,
  missing,
  total,
  href,
}: {
  label: string;
  missing: number;
  total: number;
  href?: string;
}) {
  const filled = Math.max(0, total - missing);
  const pct = percent(filled, total);
  const done = missing === 0;

  const labelNode = href && !done ? (
    <Link href={href} className="font-bold text-accent hover:text-accent-strong">
      {label}
    </Link>
  ) : (
    <span className="font-bold text-ink">{label}</span>
  );

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
        {labelNode}
        <span className="shrink-0 tabular-nums text-faint">
          {done ? (
            <span className="font-bold text-affirm">کامل</span>
          ) : (
            <>
              {faNum(missing)} مورد باقی مانده
            </>
          )}
        </span>
      </div>
      {/* نوار خودش داده‌ای نمی‌گوید که در متن نباشد، پس از دیدِ دسترسی‌پذیری
          تزئینی است و aria-hidden می‌گیرد. */}
      <div className="h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
        <div
          className={`h-full rounded-full ${done ? "bg-affirm" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// حالتِ خالی
// ---------------------------------------------------------------------------

/**
 * «هنوز چیزی اینجا نیست» — با قدمِ بعدی، نه فقط اعلامِ خالی‌بودن.
 *
 * ⚠️ این کامپوننت برای خالی‌بودنِ *طبیعی* است. خالی‌بودن به‌خاطرِ فیلتر، یا
 *    به‌خاطرِ اجرانشدنِ مهاجرت، پیامِ دیگری لازم دارد؛ آن دو را با این قاطی نکن،
 *    وگرنه کاربر «فیلترت نتیجه نداد» را «داده‌ام پاک شده» می‌خواند.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: IconComponent;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
      <span
        className="mb-3 flex size-12 items-center justify-center rounded-mark bg-accent-soft text-accent"
        aria-hidden
      >
        <Icon size={18} />
      </span>
      <p className="text-[12.5px] font-bold text-ink">{title}</p>
      {body ? <p className="max-w-sm text-[11.5px] leading-relaxed text-faint">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// دکمه‌ها
// ---------------------------------------------------------------------------

/**
 * ظاهرِ دکمه به‌صورتِ رشته‌ی کلاس، نه کامپوننت.
 *
 * عمدی: مقصدِ این ظاهر گاهی <button> است، گاهی <Link>، و گاهی دکمه‌ی submitِ یک
 * فرم با useFormStatus. یک کامپوننتِ Button که هر سه را پوشش بدهد ناچار بود
 * پراپِ as/asChild بگیرد و تایپش بی‌دلیل پیچیده شود. یک ثابتِ رشته‌ای همان کار
 * را بی هیچ لایه‌ای می‌کند.
 */
const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export const btnPrimary = `${BTN_BASE} bg-accent text-white shadow-cta hover:bg-accent-strong`;
export const btnSoft = `${BTN_BASE} bg-accent-soft text-accent hover:bg-accent-line`;
export const btnGhost = `${BTN_BASE} border border-line bg-canvas text-muted hover:border-accent-line hover:text-ink`;
export const btnDanger = `${BTN_BASE} bg-alert-wash text-alert hover:bg-alert hover:text-white`;

/** کدِ ماشین‌خوان: همیشه LTR و مونواسپیس — قاعده‌ی ثابتِ کلِ سایت. */
export const codeBox =
  "rounded-plate border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink-code";
