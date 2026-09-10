import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/_components/account/AccountForms";
import { registerAction } from "@/app/account/_actions/auth";
import { getCurrentUser } from "@/lib/users/session";
export const metadata: Metadata = { title: "ثبت‌نام" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const next = (await searchParams).next;
  const nextPath = typeof next === "string" && next.startsWith("/account") && !next.startsWith("//") ? next : "/account";
  return <div dir="rtl" className="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-12"><section className="w-full rounded-card border border-line bg-white p-6 shadow-[0_16px_40px_-28px_rgba(20,19,43,.45)]"><p className="text-sm font-bold text-accent">پرامپتِش</p><h1 className="mt-2 text-2xl font-extrabold text-ink">ساخت حساب</h1><p className="mt-2 text-sm leading-6 text-muted">با حساب کاربری، پرامپت خودت را برای انتشار بفرست.</p><div className="mt-6"><AuthForm action={registerAction} mode="register" nextPath={nextPath} /></div><p className="mt-5 text-center text-sm text-muted">حساب داری؟ <Link href={`/account/login?next=${encodeURIComponent(nextPath)}`} className="font-bold text-accent">ورود</Link></p></section></div>;
}
