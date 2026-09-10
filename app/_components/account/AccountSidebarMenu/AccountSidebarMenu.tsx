"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/app/_components/account/Avatar";

type LinkItem = { href: string; label: string; active: boolean };
export function AccountSidebarMenu({ user, links }: { user: { display_name: string; email: string; profile_slug: string; avatar_color: string }; links: LinkItem[] }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="rounded-field border border-line bg-white px-3 py-2 text-sm font-bold text-ink md:hidden">☰ منو</button>{open && <div className="fixed inset-0 z-[60]" dir="rtl"><button aria-label="بستن منو" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" /><aside className="absolute inset-y-0 right-0 flex w-[270px] max-w-[85vw] flex-col bg-white shadow-[-12px_0_40px_-10px_rgba(20,19,43,.25)]"><div className="flex items-center justify-between border-b border-line px-5 py-5"><Link href={`/u/${user.profile_slug}`} onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3"><Avatar name={user.display_name} color={user.avatar_color} /><span className="min-w-0"><strong className="block truncate text-sm text-ink">{user.display_name}</strong><span dir="ltr" className="block truncate text-xs text-faint">{user.email}</span></span></Link><button onClick={() => setOpen(false)} className="rounded-full bg-surface px-3 py-2 text-sm text-muted">×</button></div><nav className="flex-1 px-3 py-4">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`mb-1 block rounded-field px-4 py-3 text-sm font-bold ${link.active ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface"}`}>{link.label}</Link>)}</nav><form action="/account/logout" method="post" className="border-t border-line p-5"><button className="w-full rounded-field bg-alert-wash px-4 py-3 text-right text-sm font-bold text-alert">خروج از حساب</button></form></aside></div>}</>;
}
