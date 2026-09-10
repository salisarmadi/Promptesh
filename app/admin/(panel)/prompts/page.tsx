import type { Metadata } from "next";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin/auth";
import { faDateTime, faNum } from "@/lib/admin/format";
import { listPendingPrompts, listUserSubmissionsForReview } from "@/lib/admin/queries";
import { reviewUserSubmissionAction } from "@/app/admin/_actions/user-submissions";
import { PageHeader, Card, CardHeader, EmptyState, codeBox } from "@/app/_components/admin/AdminUi";
import { DbNotice, classifyDbError, type DbFailure } from "@/app/_components/admin/AdminDbNotice";
import { FileText } from "@/app/_components/ui/Icons";

export const metadata: Metadata = { title: "پرامپت‌ها" };

type LoadState =
  | { ok: true; rows: Awaited<ReturnType<typeof listPendingPrompts>>; userRows: Awaited<ReturnType<typeof listUserSubmissionsForReview>> }
  | { ok: false; failure: DbFailure };

async function load(): Promise<LoadState> {
  try {
    const [rows, userRows] = await Promise.all([listPendingPrompts(), listUserSubmissionsForReview()]);
    return { ok: true, rows, userRows };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

export default async function AdminPromptsPage() {
  await requireAdmin();
  const state = await load();

  if (!state.ok) {
    return (
      <>
        <PageHeader title="پرامپت‌ها" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="پرامپت‌ها"
        description="صف بازبینی محتوایی که از مسیر اتوماسیون وارد شده و هنوز منتشر نشده است."
      />

      <Card>
        <CardHeader title="ارسال‌های کاربران" hint={`${faNum(state.userRows.length)} مورد در انتظار`} />
        {state.userRows.length === 0 ? (
          <EmptyState icon={FileText} title="ارسال کاربریِ در انتظار نیست" body="پرامپت‌های کاربران پس از ارسال، اینجا برای بررسی می‌آیند." />
        ) : <ul className="divide-y divide-line">{state.userRows.map((row) => <li key={row.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[120px_1fr_auto]"><Image src={row.image_url} alt="" width={96} height={96} className="aspect-square w-24 rounded-field object-cover" /><div className="min-w-0"><p className="text-[12px] font-bold text-ink">ارسالِ {row.display_name}</p><p className="mt-1 text-[11px] text-faint">{faDateTime(row.created_at)}</p><p dir="ltr" className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-muted">{row.prompt_text}</p></div><form action={reviewUserSubmissionAction} className="flex h-fit gap-2"><input type="hidden" name="id" value={row.id} /><button name="decision" value="approve" className="rounded-pill bg-affirm px-3 py-2 text-xs font-bold text-white">انتشار</button><button name="decision" value="reject" className="rounded-pill bg-alert-wash px-3 py-2 text-xs font-bold text-alert">رد</button></form></li>)}</ul>}
      </Card>
      <Card className="mt-6">
        <CardHeader title="در انتظار بازبینی" hint={`${faNum(state.rows.length)} مورد آخر`} />
        {state.rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="صف بازبینی خالی است"
            body="وقتی n8n محتوای تازه وارد کند، رکوردهای pending_review اینجا دیده می‌شوند."
          />
        ) : (
          <ul className="divide-y divide-line">
            {state.rows.map((row) => (
              <li key={row.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_2fr]">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-ink">شناسه {faNum(Number(row.id))}</p>
                  <p className="mt-1 text-[11px] text-faint">{faDateTime(row.created_at)}</p>
                  {row.source_channel ? (
                    <p dir="ltr" className={`${codeBox} mt-2 truncate`}>{row.source_channel}</p>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p dir="ltr" className={`${codeBox} overflow-x-auto whitespace-nowrap`}>{row.image_url}</p>
                  <p dir="ltr" className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-muted">
                    {row.prompt_text ?? row.raw_caption ?? "متن قابل نمایش ندارد."}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
