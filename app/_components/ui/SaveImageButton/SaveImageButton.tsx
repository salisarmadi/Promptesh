"use client";

import Link from "next/link";
import { useState } from "react";

export function SaveImageButton({ imageId, initiallySaved, variant = "block" }: { imageId: string; initiallySaved: boolean; variant?: "block" | "icon" }) {
  const [saved, setSaved] = useState(initiallySaved); const [message, setMessage] = useState("");
  async function toggle() {
    setMessage("");
    const response = await fetch("/api/account/saved", { method: saved ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageId }) });
    if (response.status === 401) { setMessage("برای ذخیره، وارد حساب شو."); return; }
    if (!response.ok) { setMessage("عملیات انجام نشد."); return; }
    setSaved(!saved);
  }
  if (variant === "icon") return <button type="button" onClick={toggle} aria-label={saved ? "حذف از ذخیره‌ها" : "ذخیره در کتابخانه"} title={saved ? "حذف از ذخیره‌ها" : "ذخیره در کتابخانه"} className={`flex size-[30px] items-center justify-center rounded-full transition-transform active:scale-95 ${saved ? "bg-rose-500 text-white" : "bg-surface text-muted hover:text-rose-500"}`}><svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg></button>;
  return <div className="grid gap-2"><button type="button" onClick={toggle} className={`min-h-11 w-full rounded-field border px-4 text-sm font-bold transition-colors ${saved ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-muted hover:text-accent"}`}>{saved ? "✓ ذخیره شده" : "ذخیره در کتابخانه"}</button>{message && <p role="status" className="text-center text-xs text-muted">{message.includes("وارد") ? <Link href="/account/login?next=/account" className="font-bold text-accent">{message}</Link> : message}</p>}</div>;
}
