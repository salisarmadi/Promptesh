import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { faNum, percent } from "@/lib/admin/format";
import { getDashboardStats, listModelStats } from "@/lib/admin/queries";
import { PageHeader, Card, CardHeader, CompletenessRow, EmptyState } from "@/app/_components/admin/AdminUi";
import { DbNotice, classifyDbError, type DbFailure } from "@/app/_components/admin/AdminDbNotice";
import { ChartBar } from "@/app/_components/ui/Icons";

export const metadata: Metadata = { title: "آمار و گزارش‌ها" };

type LoadState =
  | { ok: true; stats: Awaited<ReturnType<typeof getDashboardStats>>; models: Awaited<ReturnType<typeof listModelStats>> }
  | { ok: false; failure: DbFailure };

async function load(): Promise<LoadState> {
  try {
    const [stats, models] = await Promise.all([getDashboardStats(), listModelStats()]);
    return { ok: true, stats, models };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const state = await load();

  if (!state.ok) {
    return (
      <>
        <PageHeader title="آمار و گزارش‌ها" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  const { stats, models } = state;

  return (
    <>
      <PageHeader title="آمار و گزارش‌ها" description="گزارش‌های سبک و واقعی از محتوای فعلی گالری." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="کامل‌بودن داده" hint={`روی ${faNum(stats.imageCount)} تصویر`} />
          {stats.imageCount === 0 ? (
            <EmptyState icon={ChartBar} title="داده‌ای برای گزارش نیست" />
          ) : (
            <ul className="flex flex-col gap-4 p-5">
              <CompletenessRow label="متن پرامپت" missing={stats.imagesWithoutPrompt} total={stats.imageCount} href="/admin/images?missing=prompt" />
              <CompletenessRow label="عنوان فارسی" missing={stats.imagesWithoutTitle} total={stats.imageCount} href="/admin/images?missing=title" />
              <CompletenessRow label="دسته‌بندی" missing={stats.imagesWithoutCategory} total={stats.imageCount} href="/admin/images?missing=category" />
              <CompletenessRow label="ابعاد تصویر" missing={stats.imagesWithoutDimensions} total={stats.imageCount} href="/admin/images?missing=dimensions" />
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="مدل‌های سازنده" hint="بر اساس فیلد model_used" />
          {models.length === 0 ? (
            <EmptyState icon={ChartBar} title="هنوز مدلی ثبت نشده" />
          ) : (
            <ul className="flex flex-col gap-3 p-5">
              {models.map((row) => {
                const pct = percent(row.image_count, stats.imageCount);
                return (
                  <li key={row.label} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
                      <span dir="auto" className="font-bold text-ink">{row.label}</span>
                      <span className="text-faint">{faNum(row.image_count)} تصویر · {faNum(pct)}٪</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
