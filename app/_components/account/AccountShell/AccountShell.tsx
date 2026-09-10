import Link from "next/link";
import { logoutAction } from "@/app/account/_actions/auth";
import { AccountSidebarMenu } from "@/app/_components/account/AccountSidebarMenu";
import { Avatar } from "@/app/_components/account/Avatar";

export function AccountShell({ user, children, active }: { user: { display_name: string; email: string; profile_slug: string; avatar_color: string }; children: React.ReactNode; active: "dashboard" | "submit" | "settings" }) {
  const links = [{ href: "/account", label: "داشبورد", key: "dashboard" }, { href: "/account/submit", label: "ارسال پرامپت", key: "submit" }, { href: "/account/settings", label: "تنظیمات", key: "settings" }] as const;
  const menuLinks = [...links, { href: `/u/${user.profile_slug}`, label: "پروفایل عمومی", key: "profile" }].map((link) => ({ href: link.href, label: link.label, active: link.key === active }));
  return <section dir="rtl" className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-8"><aside className="hidden h-fit rounded-card border border-line bg-white p-4 shadow-[0_8px_20px_-16px_rgba(20,19,43,.45)] md:block"><Link href={`/u/${user.profile_slug}`} className="mb-5 flex items-center gap-3 rounded-field p-2 hover:bg-surface"><Avatar name={user.display_name} color={user.avatar_color} /><span className="min-w-0"><strong className="block truncate text-sm text-ink">{user.display_name}</strong><span className="text-xs text-faint">مشاهدهٔ پروفایل عمومی</span></span></Link><nav className="grid gap-1">{links.map((link) => <Link key={link.key} href={link.href} className={`rounded-field px-3 py-2.5 text-sm font-bold transition-colors ${active === link.key ? "bg-accent text-white" : "text-muted hover:bg-surface hover:text-ink"}`}>{link.label}</Link>)}</nav><form action={logoutAction} className="mt-4 border-t border-line pt-4"><button className="w-full rounded-field px-3 py-2 text-right text-sm font-bold text-alert hover:bg-alert-wash">خروج از حساب</button></form></aside><div className="min-w-0"><div className="mb-5 md:hidden"><AccountSidebarMenu user={user} links={menuLinks} /></div>{children}</div></section>;
}

export { Avatar } from "@/app/_components/account/Avatar";
