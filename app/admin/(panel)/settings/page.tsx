import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader, Card, CardHeader, codeBox } from "@/app/_components/admin/AdminUi";
import { Settings } from "@/app/_components/ui/Icons";

export const metadata: Metadata = { title: "تنظیمات" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasPasswordHash = Boolean(process.env.ADMIN_PASSWORD_HASH?.trim());

  return (
    <>
      <PageHeader title="تنظیمات" description="وضعیت اتصال‌ها و چیزهایی که برای اجرای پنل لازم‌اند." />
      <Card>
        <CardHeader title="وضعیت محیط" />
        <dl className="divide-y divide-line text-[12px]">
          <SettingRow label="اتصال دیتابیس" ok={hasDatabaseUrl} value="DATABASE_URL" />
          <SettingRow label="رمز مدیر" ok={hasPasswordHash} value="ADMIN_PASSWORD_HASH" />
          <SettingRow label="فایل مهاجرت پنل" ok value="db/migrations/002-admin-support.sql" />
        </dl>
      </Card>
      <Card className="mt-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-mark bg-accent-soft text-accent" aria-hidden>
            <Settings size={16} />
          </span>
          <p className="text-[12px] leading-relaxed text-muted">
            اگر کارت‌های دیتابیس پیام مهاجرت نشان دادند، فایل زیر را در کنسول SQL دیتابیس اجرا کن:
            <span dir="ltr" className={`${codeBox} mt-2 block overflow-x-auto`}>db/migrations/002-admin-support.sql</span>
          </p>
        </div>
      </Card>
    </>
  );
}

function SettingRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
      <dt className="font-bold text-ink">{label}</dt>
      <dd dir="ltr" className={`${codeBox} overflow-x-auto`}>{value}</dd>
      <dd className={`font-bold ${ok ? "text-affirm" : "text-alert"}`}>
        {ok ? "آماده" : "تنظیم نشده"}
      </dd>
    </div>
  );
}
