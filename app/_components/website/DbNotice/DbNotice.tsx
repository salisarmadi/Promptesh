import {
  isDatabaseConfigError,
  isDatabaseConnectionError,
  isUndefinedTableError,
  isUndefinedColumnError,
} from "@/lib/db";

/**
 * پیامِ حالت‌های غیرعادیِ دیتابیس در سایتِ عمومی.
 *
 * ⚠️ فقط سمتِ سرور: از پیش‌بین‌های lib/db استفاده می‌کند که به pg وابسته است.
 * هیچ‌وقت از یک کامپوننتِ "use client" ایمپورتش نکن.
 *
 * ── چرا از صفحه‌ی اصلی بیرون کشیده شد ──
 * سه صفحه‌ی عمومی (گالری، عکس، دسته) به همین شش پیام نیاز دارند. با کپیِ محلی
 * در هرکدام، متنِ راهنما در سه جا از هم واگرا می‌شد — و بدترین حالتش این است که
 * یکی از صفحه‌ها دستورِ قدیمیِ import را نشان بدهد که دیگر کار نمی‌کند.
 *
 * طبق راهنمای نوشتار: خطا عذرخواهی نمی‌کند و مبهم نیست — می‌گوید چه شده و قدمِ
 * بعدی چیست. حالت‌های راه‌اندازی (config/missing/migrate/empty) خطا نیستند و
 * رنگِ هشدار نمی‌گیرند؛ فقط connection و error رنگِ alert دارند.
 *
 * ⚠️ همنامِ پنل (app/_components/admin/AdminDbNotice) عمداً جدا مانده و
 * یکی‌شان نکن. مخاطبشان یکی نیست: آن یکی برای کسی است که به کنسولِ SQL دسترسی
 * دارد و مهاجرتِ خودِ پنل را نام می‌برد (002-admin-support.sql)، این یکی برای
 * کسی که سایت را بالا می‌آورد (001-add-image-dimensions.sql). ادغامشان یعنی یکی
 * از دو مخاطب دستورِ نامربوط بگیرد.
 */

export type DbNoticeKind = "config" | "connection" | "missing" | "migrate" | "empty" | "error";

/**
 * خطای گرفته‌شده را به یکی از حالت‌های بالا نگاشت می‌کند.
 *
 * ⚠️ «ردیف پیدا نشد» اینجا نیست و نباید باشد. صفحه‌ی عکس باید ۴۰۴ را فقط برای
 * ردیفِ واقعاً غایب بدهد؛ نگاشتنِ خطای دیتابیس به ۴۰۴ یعنی یک قطعیِ چنددقیقه‌ای
 * به گوگل می‌گوید هفتصد صفحه حذف شده‌اند. خطای دیتابیس باید ۵۰۰ بماند (یعنی
 * «بعداً دوباره بیا») یا همین پیام را نشان بدهد.
 */
export function classifyDbError(err: unknown): DbNoticeKind {
  if (isDatabaseConfigError(err)) return "config";
  if (isDatabaseConnectionError(err)) return "connection";
  if (isUndefinedTableError(err)) return "missing";
  // ستونِ غایب یعنی اسکیما از کد عقب‌تر است. جدا نگه داشته می‌شود تا صفحه بگوید
  // کدام فایل را اجرا کن، نه اینکه فقط متنِ خامِ Postgres را نشان بدهد.
  if (isUndefinedColumnError(err)) return "migrate";
  return "error";
}

/** متنِ خطا را برای نمایش در کادرِ دیباگ بیرون می‌کشد. */
export function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * دستور و مسیرِ فایل داخلِ کادرِ مونواسپیس با dir="ltr" می‌نشینند — قاعده‌ی ثابتِ
 * سایت: هرچه ماشین می‌خوانَدش، LTR و مونواسپیس.
 */
const CODE_BOX = "rounded-plate border border-line bg-surface font-mono text-ink-code";

const CONTENT: Record<
  DbNoticeKind,
  { alert: boolean; title: string; body: string; command?: string; showDetail?: boolean }
> = {
  config: {
    alert: false,
    title: "هنوز به دیتابیس وصل نشده‌ای",
    body: "این حالت تا پیش از راه‌اندازی طبیعی است. رشته‌ی اتصالِ Postgres را در فایلِ .env.local بگذار و سرور را ری‌استارت کن.",
    command: "DATABASE_URL=postgres://…",
  },
  connection: {
    alert: true,
    title: "اتصال به دیتابیس برقرار نشد",
    body: "سرور توسعه در حال حاضر نمی‌تواند به Postgres وصل شود. اتصال اینترنت، VPN، فایروال یا دسترسی بیرونی دیتابیس را بررسی کن.",
  },
  missing: {
    alert: false,
    title: "جدول‌ها هنوز ساخته نشده‌اند",
    body: "اتصال برقرار است اما اسکیمای دیتابیس خالی است. این فایل را در کنسولِ SQL اجرا کن:",
    command: "db/schema.sql",
  },
  migrate: {
    alert: false,
    title: "اسکیمای دیتابیس از کد عقب‌تر است",
    body: "جدول‌ها هستند، ولی ستونی که کد می‌خواند در آن‌ها نیست. علتش این است که schema.sql با CREATE TABLE IF NOT EXISTS نوشته شده و روی دیتابیسی که جدولش از قبل ساخته شده، ستونِ تازه را بی‌صدا اضافه نمی‌کند. این دو قدم حلش می‌کند:",
    command:
      "-- 1) run in the SQL console:\ndb/migrations/001-add-image-dimensions.sql\n\n# 2) then in the terminal:\nnode scripts/import-content.mjs --reset",
    // متنِ خودِ Postgres اینجا اطلاعِ لازم است نه صرفاً دیباگ: همین است که
    // می‌گوید کدام ستون غایب است.
    showDetail: true,
  },
  empty: {
    alert: false,
    title: "هنوز عکسی اضافه نشده",
    body: "اسکیما ساخته شده ولی داده‌ای نیست. برای وارد کردنِ محتوا این را اجرا کن:",
    command: "node scripts/import-content.mjs --reset",
  },
  error: {
    alert: true,
    title: "خطا در خواندنِ گالری",
    body: "کوئری یا اتصال با خطا مواجه شد. متنِ خطا برای دیباگ پایین آمده.",
    showDetail: true,
  },
};

export function DbNotice({
  kind,
  detail,
  /**
   * سطحِ تیتر. صفحه‌ای که این پیام تنها محتوایش است h1 می‌خواهد؛ اگر روزی داخلِ
   * صفحه‌ای با h1 موجود نشست، h2 بدهد.
   */
  as: Heading = "h1",
}: {
  kind: DbNoticeKind;
  detail?: string;
  as?: "h1" | "h2";
}) {
  const content = CONTENT[kind];

  return (
    <section className="flex items-center justify-center py-20">
      <div
        className={`flex w-full max-w-lg flex-col gap-3 rounded-card border p-6 ${
          content.alert ? "border-alert/25 bg-alert-wash" : "border-line bg-canvas shadow-card"
        }`}
      >
        <Heading className={`text-lg font-bold ${content.alert ? "text-alert" : "text-ink"}`}>
          {content.title}
        </Heading>
        <p className={`text-sm leading-relaxed ${content.alert ? "text-alert" : "text-muted"}`}>
          {content.body}
        </p>
        {content.command ? (
          <p dir="ltr" className={`${CODE_BOX} overflow-x-auto whitespace-pre px-3 py-2 text-[13px]`}>
            {content.command}
          </p>
        ) : null}
        {content.showDetail && detail ? (
          <pre dir="ltr" className={`${CODE_BOX} overflow-x-auto p-3 text-xs leading-relaxed`}>
            {detail}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
