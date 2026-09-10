import type { Metadata } from "next";
import { AccountShell } from "@/app/_components/account/AccountShell";
import { PasswordForm, ProfileForm } from "@/app/_components/account/AccountForms";
import { changePasswordAction, updateProfileAction } from "@/app/account/_actions/auth";
import { requireUser } from "@/lib/users/session";
export const metadata: Metadata = { title: "تنظیمات حساب" };
export default async function SettingsPage() { const user = await requireUser(); return <AccountShell user={user} active="settings"><h1 className="text-2xl font-extrabold text-ink">تنظیمات پروفایل</h1><section className="mt-6 max-w-2xl rounded-card border border-line bg-white p-5 sm:p-6"><h2 className="mb-5 text-lg font-extrabold text-ink">اطلاعات عمومی</h2><ProfileForm action={updateProfileAction} user={user} /></section><section className="mt-6 max-w-2xl rounded-card border border-line bg-white p-5 sm:p-6"><h2 className="mb-5 text-lg font-extrabold text-ink">رمز عبور</h2><PasswordForm action={changePasswordAction} /></section></AccountShell>; }
