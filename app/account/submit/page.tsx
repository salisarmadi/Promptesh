import type { Metadata } from "next";
import { AccountShell } from "@/app/_components/account/AccountShell";
import { SubmissionForm } from "@/app/_components/account/AccountForms";
import { submitPromptAction } from "@/app/account/_actions/auth";
import { listUserCategories } from "@/lib/users/queries";
import { requireUser } from "@/lib/users/session";
export const metadata: Metadata = { title: "ارسال پرامپت" };
export default async function SubmitPage() { const [user, categories] = await Promise.all([requireUser(), listUserCategories()]); return <AccountShell user={user} active="submit"><h1 className="text-2xl font-extrabold text-ink">ارسال پرامپت</h1><p className="mt-2 text-sm leading-6 text-muted">تصویر و پرامپتت را بفرست؛ پس از بررسی، با نام تو منتشر می‌شود.</p><section className="mt-6 max-w-2xl rounded-card border border-line bg-white p-5 sm:p-6"><SubmissionForm action={submitPromptAction} categories={categories} /></section></AccountShell>; }
