import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { faDateTime, faNum } from "@/lib/admin/format";
import { listPendingPrompts } from "@/lib/admin/queries";
import { PageHeader, Card, CardHeader, EmptyState, codeBox } from "@/app/_components/admin/AdminUi";
import { DbNotice, classifyDbError, type DbFailure } from "@/app/_components/admin/AdminDbNotice";
import { FileText } from "@/app/_components/ui/Icons";

export const metadata: Metadata = { title: "پرامپت‌ها" };

type LoadState =
  | { ok: true; rows: Awaited<ReturnType<typeof listPendingPrompts>> }
  | { ok: false; failure: DbFailure };

async function load(): Promise<LoadState> {
  try {
    return { ok: true, rows: await listPendingPrompts() };
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
