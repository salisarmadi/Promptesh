"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { hashUserPassword, verifyUserPassword } from "@/lib/users/password";
import { endUserSession, getCurrentUser, revokeUserSessions, startUserSession } from "@/lib/users/session";
import { uploadSubmissionImage } from "@/lib/users/storage";
import { getClientIp } from "@/lib/admin/client-ip";
import { loginAllowed, loginFailed, loginSucceeded } from "@/lib/users/rate-limit";
import type { AccountFormState } from "./state";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeNext = (value: FormDataEntryValue | null) => typeof value === "string" && value.startsWith("/account") && !value.startsWith("//") ? value : "/account";
const text = (form: FormData, key: string) => typeof form.get(key) === "string" ? (form.get(key) as string).trim() : "";

export async function registerAction(_previous: AccountFormState, form: FormData): Promise<AccountFormState> {
  const name = text(form, "display_name");
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? form.get("password") as string : "";
  if (name.length < 2 || name.length > 80) return { error: "نام نمایشی باید بین ۲ تا ۸۰ نویسه باشد.", success: "", field: "display_name" };
  if (!emailPattern.test(email) || email.length > 320) return { error: "یک ایمیل معتبر وارد کن.", success: "", field: "email" };
  if (password.length < 10 || password.length > 256) return { error: "رمز باید دست‌کم ۱۰ نویسه باشد.", success: "", field: "password" };
  const slug = `u-${randomBytes(8).toString("hex")}`;
  try {
    const rows = await query<{ id: string }>(
      "INSERT INTO user_accounts (email, display_name, profile_slug, password_hash) VALUES ($1, $2, $3, $4) RETURNING id::text",
      [email, name, slug, await hashUserPassword(password)]
    );
    await startUserSession(rows[0].id);
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "23505") return { error: "حسابی با این ایمیل از قبل وجود دارد.", success: "", field: "email" };
    console.error("[users] register failed", error);
    return { error: "ساخت حساب انجام نشد. کمی بعد دوباره تلاش کن.", success: "" };
  }
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_previous: AccountFormState, form: FormData): Promise<AccountFormState> {
  const email = text(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? form.get("password") as string : "";
  if (!emailPattern.test(email) || !password) return { error: "ایمیل و رمز عبور را وارد کن.", success: "" };
  const rateKey = `${await getClientIp()}:${email}`;
  if (!loginAllowed(rateKey)) return { error: "تلاش‌های ناموفق زیاد بود. چند دقیقه دیگر دوباره امتحان کن.", success: "" };
  const rows = await query<{ id: string; password_hash: string }>("SELECT id::text, password_hash FROM user_accounts WHERE lower(email) = $1", [email]);
  const user = rows[0];
  if (!user || !(await verifyUserPassword(password, user.password_hash))) { loginFailed(rateKey); return { error: "ایمیل یا رمز عبور درست نیست.", success: "" }; }
  loginSucceeded(rateKey);
  await startUserSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction(): Promise<void> { await endUserSession(); redirect("/"); }

export async function updateProfileAction(_previous: AccountFormState, form: FormData): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/account/settings");
  const name = text(form, "display_name"); const bio = text(form, "bio");
  const color = text(form, "avatar_color");
  if (name.length < 2 || name.length > 80 || bio.length > 280 || !/^#[0-9A-Fa-f]{6}$/.test(color)) return { error: "اطلاعات واردشده معتبر نیست.", success: "" };
  await query("UPDATE user_accounts SET display_name=$1, bio=$2, avatar_color=$3, notify_likes=$4, notify_publication=$5, updated_at=now() WHERE id=$6", [name, bio, color, form.get("notify_likes") === "on", form.get("notify_publication") === "on", user.id]);
  revalidatePath("/account"); revalidatePath("/account/settings"); revalidatePath(`/u/${user.profile_slug}`);
  return { error: "", success: "تنظیمات ذخیره شد." };
}

export async function changePasswordAction(_previous: AccountFormState, form: FormData): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/account/settings");
  const current = typeof form.get("current_password") === "string" ? form.get("current_password") as string : "";
  const next = typeof form.get("new_password") === "string" ? form.get("new_password") as string : "";
  if (next.length < 10 || next.length > 256) return { error: "رمز جدید باید دست‌کم ۱۰ نویسه باشد.", success: "" };
  const rows = await query<{ password_hash: string }>("SELECT password_hash FROM user_accounts WHERE id = $1", [user.id]);
  if (!rows[0] || !(await verifyUserPassword(current, rows[0].password_hash))) return { error: "رمز فعلی درست نیست.", success: "" };
  await query("UPDATE user_accounts SET password_hash=$1, updated_at=now() WHERE id=$2", [await hashUserPassword(next), user.id]);
  await revokeUserSessions(user.id); await startUserSession(user.id);
  return { error: "", success: "رمز عوض شد و نشست‌های دیگر بسته شدند." };
}

export async function submitPromptAction(_previous: AccountFormState, form: FormData): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/account/submit");
  const file = form.get("image"); const prompt = text(form, "prompt_text"); const model = text(form, "model_used"); const categoryId = text(form, "category_id");
  if (!(file instanceof File) || file.size === 0) return { error: "یک تصویر انتخاب کن.", success: "", field: "image" };
  if (!prompt || prompt.length > 20_000) return { error: "متن پرامپت الزامی است و نباید از ۲۰٬۰۰۰ نویسه بیشتر باشد.", success: "", field: "prompt_text" };
  if (!/^[1-9][0-9]*$/.test(categoryId) || model.length > 120) return { error: "دسته‌بندی و مدل را درست انتخاب کن.", success: "" };
  try {
    const imageUrl = await uploadSubmissionImage(file, user.id);
    await query("INSERT INTO user_submissions (user_id, image_url, prompt_text, category_id, model_used) VALUES ($1,$2,$3,$4,$5)", [user.id, imageUrl, prompt, categoryId, model || null]);
  } catch (error) {
    console.error("[users] submit failed", error);
    return { error: error instanceof Error ? error.message : "ارسال انجام نشد.", success: "" };
  }
  revalidatePath("/account");
  return { error: "", success: "پرامپت برای بررسی ارسال شد." };
}
