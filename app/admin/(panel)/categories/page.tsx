import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { faNum } from "@/lib/admin/format";
import { listAdminCategories } from "@/lib/admin/queries";
import { PageHeader, Card, CardHeader, EmptyState, btnPrimary, codeBox } from "@/app/_components/admin/AdminUi";
import { DbNotice, classifyDbError, type DbFailure } from "@/app/_components/admin/AdminDbNotice";
import { ImageIcon, Plus, Tag } from "@/app/_components/ui/Icons";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

type LoadState =
  | { ok: true; rows: Awaited<ReturnType<typeof listAdminCategories>> }
  | { ok: false; failure: DbFailure };

async function load(): Promise<LoadState> {
  try {
    return { ok: true, rows: await listAdminCategories() };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const state = await load();

  if (!state.ok) {
    return (
      <>
        <PageHeader title="دسته‌بندی‌ها" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="دسته‌بندی‌ها"
        description="دسته‌ها همان تب‌ها و فیلترهای گالری عمومی هستند."
        actions={
          <Link href="/admin/images" className={btnPrimary}>
            <ImageIcon size={14} />
            مدیریت تصاویر
          </Link>
        }
      />

      <Card>
        <CardHeader title="فهرست دسته‌ها" hint={`${faNum(state.rows.length)} دسته`} />
        {state.rows.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="هنوز دسته‌ای ساخته نشده"
            body="فعلاً ساخت دسته از طریق SQL انجام می‌شود؛ بعد از اضافه شدن فرم، همین صفحه مرکز مدیریت دسته‌ها می‌شود."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-[12px]">
              <thead className="border-b border-line bg-surface text-[11px] text-faint-label">
                <tr>
                  <th className="px-5 py-3 font-bold">نام</th>
                  <th className="px-5 py-3 font-bold">slug</th>
                  <th className="px-5 py-3 font-bold">تصاویر</th>
                  <th className="px-5 py-3 font-bold">توضیح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-5 py-3 font-bold text-ink">{row.name_fa}</td>
                    <td className="px-5 py-3">
                      <code dir="ltr" className={codeBox}>{row.slug}</code>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted">{faNum(row.image_count)}</td>
                    <td className="px-5 py-3 text-muted">{row.description ?? "بدون توضیح"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-mark bg-accent-soft text-accent" aria-hidden>
            <Plus size={16} />
          </span>
          <div className="text-[12px] leading-relaxed text-muted">
            فرم ساخت و ویرایش دسته هنوز مرحله بعدی است. تا آن موقع، دسته‌های تازه را می‌شود
            با جدول <code className="font-mono">categories</code> در دیتابیس اضافه کرد.
          </div>
        </div>
      </Card>
    </>
  );
}
