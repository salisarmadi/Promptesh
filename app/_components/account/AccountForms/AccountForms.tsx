"use client";

import { useActionState } from "react";
import type { AccountFormState } from "@/app/account/_actions/state";
import { ACCOUNT_FORM_INITIAL_STATE } from "@/app/account/_actions/state";

type Action = (state: AccountFormState, form: FormData) => Promise<AccountFormState>;

function Notice({ state }: { state: AccountFormState }) {
  if (!state.error && !state.success) return null;
  return <p role={state.error ? "alert" : "status"} className={`rounded-field px-3 py-2 text-sm ${state.error ? "bg-alert-wash text-alert" : "bg-emerald-50 text-affirm"}`}>{state.error || state.success}</p>;
}

export function AuthForm({ action, mode, nextPath }: { action: Action; mode: "login" | "register"; nextPath: string }) {
  const [state, formAction, pending] = useActionState(action, ACCOUNT_FORM_INITIAL_STATE);
  const registering = mode === "register";
  return <form action={formAction} noValidate className="flex flex-col gap-4">
    <input type="hidden" name="next" value={nextPath} />
    {registering && <label className="grid gap-1.5 text-sm font-semibold text-muted">نام نمایشی<input name="display_name" required autoComplete="name" className="account-input" placeholder="مثلاً سارا احمدی" disabled={pending} /></label>}
    <label className="grid gap-1.5 text-sm font-semibold text-muted">ایمیل<input name="email" type="email" dir="ltr" required autoComplete="email" className="account-input text-left" placeholder="you@example.com" disabled={pending} /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-muted">رمز عبور<input name="password" type="password" dir="ltr" required minLength={10} autoComplete={registering ? "new-password" : "current-password"} className="account-input text-left" disabled={pending} /></label>
    <Notice state={state} />
    <button className="account-button" disabled={pending}>{pending ? "در حال انجام…" : registering ? "ساخت حساب" : "ورود به حساب"}</button>
  </form>;
}

export function ProfileForm({ action, user }: { action: Action; user: { display_name: string; bio: string; avatar_color: string; notify_likes: boolean; notify_publication: boolean } }) {
  const [state, formAction, pending] = useActionState(action, ACCOUNT_FORM_INITIAL_STATE);
  return <form action={formAction} className="grid gap-5">
    <label className="grid gap-1.5 text-sm font-semibold text-muted">نام نمایشی<input name="display_name" required defaultValue={user.display_name} className="account-input" /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-muted">دربارهٔ من<textarea name="bio" maxLength={280} rows={4} defaultValue={user.bio} className="account-input resize-y" /></label>
    <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold text-muted">رنگ آواتار</legend><div className="flex gap-3">{["#2563eb", "#7c3aed", "#db2777", "#059669", "#ea580c"].map((color) => <label key={color} className="size-9 cursor-pointer rounded-full" style={{ backgroundColor: color }}><input className="sr-only" type="radio" name="avatar_color" value={color} defaultChecked={user.avatar_color === color} /><span className="sr-only">{color}</span></label>)}</div></fieldset>
    <div className="grid gap-3 rounded-field border border-line p-4 text-sm text-ink"><label className="flex items-center justify-between gap-3">اعلان لایک‌ها<input name="notify_likes" type="checkbox" defaultChecked={user.notify_likes} /></label><label className="flex items-center justify-between gap-3">اعلان انتشار پرامپت<input name="notify_publication" type="checkbox" defaultChecked={user.notify_publication} /></label></div>
    <Notice state={state} /><button className="account-button w-fit px-6" disabled={pending}>{pending ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
  </form>;
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, ACCOUNT_FORM_INITIAL_STATE);
  return <form action={formAction} className="grid gap-4"><label className="grid gap-1.5 text-sm font-semibold text-muted">رمز فعلی<input name="current_password" required type="password" dir="ltr" autoComplete="current-password" className="account-input text-left" /></label><label className="grid gap-1.5 text-sm font-semibold text-muted">رمز جدید<input name="new_password" required minLength={10} type="password" dir="ltr" autoComplete="new-password" className="account-input text-left" /></label><Notice state={state} /><button className="account-button w-fit px-6" disabled={pending}>{pending ? "در حال تغییر…" : "تغییر رمز"}</button></form>;
}

export function SubmissionForm({ action, categories }: { action: Action; categories: Array<{ id: string; name_fa: string }> }) {
  const [state, formAction, pending] = useActionState(action, ACCOUNT_FORM_INITIAL_STATE);
  return <form action={formAction} encType="multipart/form-data" className="grid gap-5">
    <label className="grid gap-1.5 text-sm font-semibold text-muted">تصویر<input name="image" required type="file" accept="image/jpeg,image/png,image/webp" className="account-input file:ml-3 file:rounded-pill file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-accent" /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-muted">متن پرامپت<textarea name="prompt_text" required dir="ltr" rows={7} maxLength={20000} className="account-input font-mono text-left text-[13px]" placeholder="A cinematic portrait…" /></label>
    <label className="grid gap-1.5 text-sm font-semibold text-muted">دسته‌بندی<select name="category_id" required defaultValue="" className="account-input"><option value="" disabled>انتخاب دسته‌بندی</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_fa}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold text-muted">مدل هوش مصنوعی <span className="font-normal text-faint">(اختیاری)</span><input name="model_used" maxLength={120} dir="ltr" className="account-input text-left" placeholder="Midjourney v7" /></label>
    <p className="text-xs leading-6 text-faint">JPG، PNG یا WEBP تا ۴ مگابایت. محتوا پیش از انتشار بازبینی می‌شود.</p><Notice state={state} /><button className="account-button" disabled={pending}>{pending ? "در حال ارسال…" : "ارسال برای بررسی"}</button>
  </form>;
}
