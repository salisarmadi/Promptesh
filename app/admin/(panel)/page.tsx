import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getDashboardStats, getRecentActivity } from "@/lib/admin/queries";
import type { ActivityRow, DashboardStats } from "@/lib/admin/queries";
import { faNum, faDate, faDateTime, faRelative } from "@/lib/admin/format";
import {
  PageHeader,
  Card,
  CardHeader,
  StatTile,
  CompletenessRow,
  EmptyState,
  btnPrimary,
  btnSoft,
  codeBox,
} from "@/app/_components/admin/AdminUi";
import { DbNotice, classifyDbError, type DbFailure } from "@/app/_components/admin/AdminDbNotice";
import {
  ImageIcon,
  FileText,
  Tag,
  AlertTriangle,
  Plus,
  Pencil,
  Trash,
  Upload,
  LayoutDashboard,
} from "@/app/_components/ui/Icons";

/**
 * داشبوردِ پنل — /admin
 *
 * ── قاعده‌ی این صفحه: هیچ عددِ ساختگی ──
 * هر عددی که اینجا می‌بینی از یک کوئریِ واقعی می‌آید. جاهایی که داده‌ی واقعی
 * صفر است، صفر نشان داده می‌شود — نه یک عددِ «نمونه» که صفحه پرتر به نظر برسد.
 *
 * ⚠️ ولی صفرِ بی‌توضیح خودش یک باگِ ظاهری است. مثالِ همین پروژه: تاریخِ محتوای
 *    موجود تیر و مرداد ۱۴۰۵ است، پس «افزوده‌شده در ۷ روزِ گذشته» واقعاً صفر است.
 *    این عدد بی بافت شبیهِ «سایت خراب است» می‌شود، پس همیشه کنارِ تاریخِ
 *    تازه‌ترین رکورد می‌آید. اگر روزی شمارنده‌ی تازه‌ای اضافه کردی که می‌تواند
 *    صفر شود، همین کار را برایش بکن.
 *
 * ⚠️ requireAdmin در همین فایل هم صدا زده می‌شود، با اینکه چیدمانِ (panel) هم
 *    صدایش می‌زند. تکرار نیست: چیدمان در جابه‌جایی بینِ صفحه‌های همان گروه
 *    دوباره اجرا نمی‌شود و جلوی رندرِ صفحه را هم نمی‌گیرد، پس تنها گاردِ واقعیِ
 *    این صفحه همین خط است. توضیحِ کامل در lib/admin/auth.ts.
 *
 * چرا await connection() لازم نیست: requireAdmin خودش cookies() را می‌خواند و
 * همان صفحه را از prerender بیرون می‌برد.
 */

export const metadata: Metadata = {
  title: "داشبورد",
};

type LoadState =
  | {
      ok: true;
      stats: DashboardStats;
      activity: ActivityRow[] | null;
      /**
       * لحظه‌ی خواندنِ داده، برای «۳ روز پیش»های فهرستِ فعالیت.
       *
       * ⚠️ اینجا گرفته می‌شود و نه داخلِ کامپوننت. دو دلیل: (۱) Date.now یک تابعِ
       *    ناخالص است و صدا زدنش در بدنه‌ی رندر قاعده‌ی خلوصِ ری‌اکت را می‌شکند —
       *    eslint هم درست اعتراض می‌کند. (۲) معنایی‌تر: مبنای «پیش» باید لحظه‌ی
       *    *خواندن* باشد، یکی برای کلِ فهرست، نه لحظه‌ی رندرِ هر ردیف.
       */
      now: number;
    }
  | { ok: false; failure: DbFailure };

async function load(): Promise<LoadState> {
  try {
    // موازی و نه پشت‌سرهم: دیتابیس دور است و دو رفت‌وبرگشتِ سری، تاخیرِ شبکه را
    // دو برابر می‌کرد. getRecentActivity خودش نبودِ جدول را می‌بلعد و null
    // می‌دهد، پس شکستِ آن کلِ Promise.all را نمی‌اندازد.
    const [stats, activity] = await Promise.all([getDashboardStats(), getRecentActivity(8)]);
    return { ok: true, stats, activity, now: Date.now() };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const state = await load();

  if (!state.ok) {
    return (
      <>
        <PageHeader title="داشبورد" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  const { stats, activity, now } = state;

  return (
    <>
      <PageHeader
        title="داشبورد"
        description={
          stats.imageCount > 0 && stats.oldestImageAt && stats.newestImageAt
            ? `محتوای گالری از ${faDate(stats.oldestImageAt)} تا ${faDate(stats.newestImageAt)}.`
            : "هنوز محتوایی در گالری نیست."
        }
        actions={
          <>
            <Link href="/admin/images/new" className={btnPrimary}>
              <Upload size={14} />
              افزودن تصویر
            </Link>
            <Link href="/admin/categories" className={btnSoft}>
              <Tag size={14} />
              دسته‌بندی‌ها
            </Link>
          </>
        }
      />

      {/* ── ردیفِ شمارنده‌ها ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="تصاویر"
          value={stats.imageCount}
          icon={ImageIcon}
          href="/admin/images"
          tone="accent"
          // ⚠️ عددِ ۷ روز هرگز تنها نمی‌آید؛ توضیحِ بالای فایل را بخوان.
          note={
            stats.newestImageAt
              ? `${faNum(stats.addedLast7Days)} مورد در ۷ روزِ گذشته · تازه‌ترین: ${faDate(stats.newestImageAt)}`
              : undefined
          }
        />
        <StatTile
          label="پرامپت‌ها"
          value={stats.promptCount}
          icon={FileText}
          href="/admin/prompts"
          note={
            stats.imagesWithoutPrompt > 0
              ? `${faNum(stats.imagesWithoutPrompt)} تصویر هنوز پرامپت ندارد`
              : "همه‌ی تصاویر پرامپت دارند"
          }
        />
        <StatTile
          label="دسته‌بندی‌ها"
          value={stats.categoryCount}
          icon={Tag}
          href="/admin/categories"
          note={
            stats.imagesWithoutCategory > 0
              ? `${faNum(stats.imagesWithoutCategory)} تصویر در هیچ دسته‌ای نیست`
              : "همه‌ی تصاویر دسته‌بندی شده‌اند"
          }
        />
        <StatTile
          label="منتظرِ بازبینی"
          value={stats.pendingReviewCount}
          icon={AlertTriangle}
          href="/admin/prompts"
          tone={stats.pendingReviewCount > 0 ? "attention" : "neutral"}
          note={
            stats.pendingReviewCount > 0
              ? "محتوای واردشده با n8n، پیش از انتشار"
              : "صفِ ورودیِ n8n خالی است"
          }
        />
      </div>

      {/* ── دو ستونِ پایین ───────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <DataHealthCard stats={stats} />
        </div>
        <div className="xl:col-span-3">
          <ActivityCard activity={activity} now={now} />
        </div>
      </div>
    </>
  );
}

/**
 * کارهای ناتمامِ محتوا.
 *
 * هدفِ این کارت این است که مدیر بی جستجو بفهمد «کجا را باید پر کنم». هر ردیف به
 * فهرستِ تصاویر با همان فیلتر لینک می‌شود، پس یک کلیک از دیدن تا انجام فاصله
 * است.
 *
 * ترتیب از پرهزینه‌ترین نقص به کم‌هزینه‌ترین: پرامپتِ نداشته یعنی کارتِ گالری
 * چیزی برای کپی ندارد (خودِ محصول)، ولی ابعادِ نداشته فقط نسبتِ تصویر را تقریبی
 * می‌کند.
 */
function DataHealthCard({ stats }: { stats: DashboardStats }) {
  const total = stats.imageCount;

  if (total === 0) {
    return (
      <Card>
        <CardHeader title="کامل‌بودنِ داده" />
        <EmptyState
          icon={ImageIcon}
          title="هنوز تصویری نیست"
          body="بعد از افزودنِ اولین تصویر، اینجا نشان داده می‌شود کدام فیلدها پر نشده‌اند."
        />
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="کامل‌بودنِ داده"
        hint={`روی ${faNum(total)} تصویر`}
      />
      <ul className="flex flex-col gap-4 p-5">
        <CompletenessRow
          label="متنِ پرامپت"
          missing={stats.imagesWithoutPrompt}
          total={total}
          href="/admin/images?missing=prompt"
        />
        <CompletenessRow
          label="عنوانِ فارسی"
          missing={stats.imagesWithoutTitle}
          total={total}
          href="/admin/images?missing=title"
        />
        <CompletenessRow
          label="دسته‌بندی"
          missing={stats.imagesWithoutCategory}
          total={total}
          href="/admin/images?missing=category"
        />
        <CompletenessRow
          label="ابعادِ تصویر"
          missing={stats.imagesWithoutDimensions}
          total={total}
          href="/admin/images?missing=dimensions"
        />
      </ul>
      <p className="mt-auto border-t border-line px-5 py-3 text-[10.5px] leading-relaxed text-faint">
        عنوان برای متنِ alt و سئوی فارسی لازم است؛ ابعاد جلوی پرشِ چیدمان در
        گالری را می‌گیرد.
      </p>
    </Card>
  );
}

// نامِ فارسیِ رویدادها. جدولِ ثابت و نه ساختنِ جمله در جا، تا اگر روزی به
// admin_activity نوعِ تازه‌ای اضافه شد، TypeScript همین‌جا اعتراض کند.
const ACTION_LABEL: Record<ActivityRow["action"], string> = {
  create: "افزودن",
  update: "ویرایش",
  delete: "حذف",
};

const ACTION_ICON: Record<ActivityRow["action"], typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash,
};

const ACTION_TONE: Record<ActivityRow["action"], string> = {
  create: "bg-accent-soft text-accent",
  update: "bg-surface text-muted",
  delete: "bg-alert-wash text-alert",
};

const ENTITY_LABEL: Record<ActivityRow["entity_type"], string> = {
  image: "تصویر",
  category: "دسته",
  prompt: "پرامپت",
};

/**
 * آخرین نوشتن‌های پنل.
 *
 * ⚠️ سه حالتِ متفاوت دارد و هیچ دو تایشان نباید یک پیام بگیرند:
 *    null            → جدولِ لاگ وجود ندارد (مهاجرت اجرا نشده) — یک کارِ مدیر.
 *    آرایه‌ی خالی    → جدول هست و هنوز کاری نکرده‌ای — وضعیتِ طبیعیِ پنلِ تازه.
 *    آرایه‌ی پر      → فهرست.
 *    اگر دو حالتِ اول را یکی کنیم، مدیر «لاگ‌نویسی خاموش است» را «کاری نکرده‌ام»
 *    می‌خواند و هیچ‌وقت متوجه نمی‌شود گزارشش ثبت نمی‌شود.
 */
function ActivityCard({ activity, now }: { activity: ActivityRow[] | null; now: number }) {
  if (activity === null) {
    return (
      <Card className="h-full">
        <CardHeader title="فعالیت‌های اخیر" />
        <div className="flex flex-col gap-3 p-5">
          <p className="text-[12px] leading-relaxed text-muted">
            جدولِ گزارشِ فعالیت در دیتابیس وجود ندارد، پس نوشتن‌های پنل ثبت
            نمی‌شوند. خودِ پنل کار می‌کند و این فقط دفترِ رخدادها را خاموش
            می‌گذارد. برای روشن‌کردنش این فایل را در کنسولِ SQL اجرا کن:
          </p>
          <p dir="ltr" className={`${codeBox} overflow-x-auto`}>
            db/migrations/002-admin-support.sql
          </p>
        </div>
      </Card>
    );
  }

  if (activity.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader title="فعالیت‌های اخیر" />
        <EmptyState
          icon={LayoutDashboard}
          title="هنوز رویدادی ثبت نشده"
          body="هر افزودن، ویرایش و حذفی که از این پنل انجام بدهی اینجا می‌آید."
        />
      </Card>
    );
  }

  // یک «الان» برای همه‌ی ردیف‌ها، گرفته‌شده در لحظه‌ی خواندنِ داده (پراپِ now).
  return (
    <Card className="h-full">
      <CardHeader
        title="فعالیت‌های اخیر"
        hint="آخرین نوشتن‌های پنل"
        action={
          <Link
            href="/admin/analytics"
            className="text-[11px] font-bold text-accent hover:text-accent-strong"
          >
            آمار و گزارش‌ها
          </Link>
        }
      />
      <ul className="divide-y divide-line">
        {activity.map((row) => {
          const Icon = ACTION_ICON[row.action];
          return (
            <li key={row.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-mark ${ACTION_TONE[row.action]}`}
                aria-hidden
              >
                <Icon size={13} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-[12px] font-bold text-ink">
                  {ACTION_LABEL[row.action]} {ENTITY_LABEL[row.entity_type]}
                </p>
                {/* خلاصه می‌تواند عنوانِ لاتینِ یک تصویر باشد، پس جهتش را خودِ
                    متن تعیین می‌کند و نه چیدمانِ صفحه. */}
                {row.summary ? (
                  <p dir="auto" className="truncate text-[11.5px] text-muted">
                    {row.summary}
                  </p>
                ) : null}
              </div>
              {/* زمانِ نسبی خوانا است ولی مبهم؛ تاریخِ دقیق در tooltip می‌ماند. */}
              <time
                dateTime={row.created_at.toISOString()}
                title={faDateTime(row.created_at)}
                className="shrink-0 pt-0.5 text-[10.5px] text-faint"
              >
                {faRelative(row.created_at, now)}
              </time>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
