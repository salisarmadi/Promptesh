import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { query } from "@/lib/db";

export const USER_SESSION_COOKIE = "promptesh_user_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = { id: string; email: string; display_name: string; profile_slug: string; bio: string; avatar_color: string; notify_likes: boolean; notify_publication: boolean; created_at: Date };

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  if (!token || token.length < 32) return null;
  const rows = await query<SessionUser>(
    `SELECT u.id::text, u.email, u.display_name, u.profile_slug, u.bio, u.avatar_color,
            u.notify_likes, u.notify_publication, u.created_at
       FROM user_sessions s JOIN user_accounts u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/account");
  return user;
}

export async function startUserSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  // پاک‌سازی به‌صورتِ کم‌هزینه در هر ورود، تا جدولِ نشست‌ها بی‌دلیل بزرگ نشود.
  await query("DELETE FROM user_sessions WHERE expires_at <= now()");
  await query(
    "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')",
    [hashToken(token), userId]
  );
  (await cookies()).set(USER_SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endUserSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(USER_SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM user_sessions WHERE token_hash = $1", [hashToken(token)]);
  store.delete({ name: USER_SESSION_COOKIE, path: "/" });
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
}
