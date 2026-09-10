import { query } from "@/lib/db";

export type UserSubmission = {
  id: string; image_url: string; prompt_text: string; model_used: string | null;
  status: "pending_review" | "approved" | "rejected"; created_at: Date; published_image_id: string | null;
  category_name: string | null;
};

export async function listUserSubmissions(userId: string): Promise<UserSubmission[]> {
  return query<UserSubmission>(
    `SELECT s.id::text, s.image_url, s.prompt_text, s.model_used, s.status, s.created_at,
            s.published_image_id::text, c.name_fa AS category_name
       FROM user_submissions s LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.user_id = $1 ORDER BY s.created_at DESC, s.id DESC`, [userId]
  );
}

export type PublicProfile = { id: string; display_name: string; profile_slug: string; bio: string; avatar_color: string; created_at: Date };
export type ProfileImage = { id: string; url: string; title_fa: string | null; likes_count: number; created_at: Date };

export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const rows = await query<PublicProfile>(
    "SELECT id::text, display_name, profile_slug, bio, avatar_color, created_at FROM user_accounts WHERE profile_slug = $1", [slug]
  );
  return rows[0] ?? null;
}

export async function listPublishedImages(userId: string): Promise<ProfileImage[]> {
  return query<ProfileImage>(
    "SELECT id::text, url, title_fa, likes_count, created_at FROM images WHERE author_user_id = $1 ORDER BY created_at DESC, id DESC", [userId]
  );
}

export type UserCategory = { id: string; name_fa: string };
export async function listUserCategories(): Promise<UserCategory[]> {
  return query<UserCategory>("SELECT id::text, name_fa FROM categories ORDER BY name_fa");
}

export type LibraryImage = { id: string; url: string; title_fa: string | null; prompt_text: string | null; created_at: Date; event_at: Date };

export async function listSavedImages(userId: string, limit = 12): Promise<LibraryImage[]> {
  return query<LibraryImage>(
    `SELECT i.id::text, i.url, i.title_fa, p.prompt_text, i.created_at, s.created_at AS event_at
       FROM user_saved_images s JOIN images i ON i.id = s.image_id
       LEFT JOIN prompts p ON p.image_id = i.id
      WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT $2`, [userId, limit]
  );
}

export async function listCopyHistory(userId: string, limit = 12): Promise<LibraryImage[]> {
  return query<LibraryImage>(
    `SELECT i.id::text, i.url, i.title_fa, p.prompt_text, i.created_at, h.copied_at AS event_at
       FROM user_copy_history h JOIN images i ON i.id = h.image_id
       LEFT JOIN prompts p ON p.image_id = i.id
      WHERE h.user_id = $1 ORDER BY h.copied_at DESC, h.id DESC LIMIT $2`, [userId, limit]
  );
}

export async function isImageSaved(userId: string, imageId: string): Promise<boolean> {
  const rows = await query<{ saved: boolean }>("SELECT EXISTS(SELECT 1 FROM user_saved_images WHERE user_id=$1 AND image_id=$2::bigint) AS saved", [userId, imageId]);
  return rows[0]?.saved ?? false;
}
