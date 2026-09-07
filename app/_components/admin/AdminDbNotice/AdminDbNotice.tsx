import Link from "next/link";
import { AlertTriangle } from "@/app/_components/ui/Icons";
import {
  isDatabaseConfigError,
  isDatabaseConnectionError,
  isUndefinedTableError,
  isUndefinedColumnError,
} from "@/lib/db";
import { codeBox } from "@/app/_components/admin/AdminUi";

/**
 * حالت‌های خرابیِ دیتابیس، یک‌جا برای همه‌ی صفحه‌های پنل.
 *
 * چرا لازم است: پنل بی داده هیچ کاری نمی‌کند، پس هر صفحه باید سه حالتِ راه‌اندازی
 * را جدا از هم بشناسد. بی این، همه‌ی آن‌ها یک «۵۰۰ Internal Server Error» می‌شدند
 * و مدیر باید لاگِ سرور را می‌خواند تا بفهمد فقط یک فایلِ SQL اجرا نشده.
 *
 * ⚠️ سایتِ عمومی همین کار را با app/_components/website/DbNotice می‌کند و آن نسخه
 *    عمداً جدا ماند. متن‌های دو طرف مخاطبِ متفاوتی دارند: آن یکی برای
 *    بازدیدکننده است، این یکی برای کسی که به کنسولِ SQL دسترسی دارد — و مهاجرتی
 *    که هرکدام نام می‌برد هم فرق می‌کند. یکی‌کردنشان یعنی یکی از دو مخاطب متنِ
 *    نامناسب بگیرد.
 */

export type DbFailure =
  | { kind: "config" }
  | { kind: "connection"; detail: string }
  | { kind: "missing" }
  | { kind: "migrate"; detail: string }
  | { kind: "unknown"; detail: string };

/**
 * خطای خام را به یکی از حالت‌های بالا ترجمه می‌کند.
 *
 * ⚠️ این تابع هیچ‌وقت نباید روی خطای notFound()/redirect() نکست اجرا شود. آن دو
 *    با انداختنِ یک خطای خاص کار می‌کنند و اگر داخلِ try گرفته شوند، به‌جای
 *    ریدایرکت یک کارتِ «خطای ناشناخته» روی صفحه می‌آید. پس هر جا از این استفاده
 *    می‌شود، صدا زدنِ آن دو باید بیرونِ try باشد.
 */
export function classifyDbError(err: unknown): DbFailure {
  if (isDatabaseConfigError(err)) return { kind: "config" };
  if (isDatabaseConnectionError(err)) {
    return { kind: "connection", detail: err instanceof Error ? err.message : String(err) };
  }
  if (isUndefinedTableError(err)) return { kind: "missing" };
  if (isUndefinedColumnError(err)) {
    return { kind: "migrate", detail: err instanceof Error ? err.message : String(err) };
  }
  return { kind: "unknown", detail: err instanceof Error ? err.message : String(err) };
}

type NoticeContent = {
  alert: boolean;
  title: string;
  body: string;
  command?: string;
};

const CONTENT: Record<DbFailure["kind"], NoticeContent> = {
  config: {
    alert: false,
    title: "رشته‌ی اتصالِ دیتابیس تنظیم نشده",
    body: "پنل داده‌ای برای نشان دادن ندارد چون به دیتابیس وصل نیست. مقدارِ DATABASE_URL را در .env.local (یا در متغیرهای محیطیِ Netlify) بگذار و سرور را ری‌استارت کن.",
    command: "DATABASE_URL=postgres://…",
  },
  connection: {
    alert: true,
    title: "اتصال به دیتابیس برقرار نشد",
    body: "پنل آماده است، اما سرور توسعه از این محیط به Postgres دسترسی ندارد. اتصال بیرونی دیتابیس، فایروال، VPN یا پورت 5432 را بررسی کن. timeout اتصال کوتاه شده تا صفحه‌ها منتظر نمانند.",
  },
  missing: {
    alert: false,
    title: "جدول‌های دیتابیس ساخته نشده‌اند",
    body: "اتصال برقرار است اما اسکیما خالی است. محتوای این فایل را در کنسولِ SQL اجرا کن:",
    command: "db/schema.sql",
  },
  migrate: {
    alert: false,
    title: "اسکیما از کد عقب‌تر است",
    body: "جدول‌ها هستند ولی ستونی که پنل می‌خواند در آن‌ها نیست. علتش این است که schema.sql با CREATE TABLE IF NOT EXISTS نوشته شده و روی دیتابیسی که جدولش از قبل وجود دارد، ستونِ تازه را بی‌صدا اضافه نمی‌کند. مهاجرتِ پنل را اجرا کن:",
    command: "db/migrations/002-admin-support.sql",
  },
  unknown: {
    alert: true,
    title: "خواندن از دیتابیس با خطا مواجه شد",
    body: "این یکی از حالت‌های شناخته‌شده‌ی راه‌اندازی نیست. متنِ خطای Postgres پایین آمده.",
  },
};

export function DbNotice({ failure }: { failure: DbFailure }) {
  const content = CONTENT[failure.kind];
  const detail = "detail" in failure ? failure.detail : null;

  return (
    <div
      className={`flex w-full max-w-xl flex-col gap-3 rounded-card border p-6 ${
        content.alert ? "border-alert/25 bg-alert-wash" : "border-line bg-canvas shadow-card"
      }`}
    >
      <div className="flex items-center gap-2">
        {content.alert ? (
          <span className="text-alert" aria-hidden>
            <AlertTriangle size={16} />
          </span>
        ) : null}
        <h1 className={`text-[15px] font-extrabold ${content.alert ? "text-alert" : "text-ink"}`}>
          {content.title}
        </h1>
      </div>

      <p
        className={`text-[12px] leading-relaxed ${content.alert ? "text-alert" : "text-muted"}`}
      >
        {content.body}
      </p>

      {content.command ? (
        <p dir="ltr" className={`${codeBox} overflow-x-auto whitespace-pre`}>
          {content.command}
        </p>
      ) : null}

      {/* در حالتِ migrate، متنِ Postgres همان چیزی است که می‌گوید کدام ستون غایب
          است — یعنی اطلاعِ لازم، نه صرفاً دیباگ. */}
      {detail ? (
        <pre dir="ltr" className={`${codeBox} overflow-x-auto leading-relaxed`}>
          {detail}
        </pre>
      ) : null}

      <Link href="/" className="text-[11.5px] font-bold text-accent hover:text-accent-strong">
        بازگشت به گالری
      </Link>
    </div>
  );
}
