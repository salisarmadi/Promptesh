"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { isValidId } from "@/lib/admin/images";
import { withTransaction } from "@/lib/db";

const BACK = "/admin/prompts";

export async function reviewUserSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id"); const decision = formData.get("decision");
  if (!isValidId(id) || (decision !== "approve" && decision !== "reject")) redirect(BACK);
  await withTransaction(async (client) => {
    const result = await client.query<{ user_id: string; image_url: string; prompt_text: string; model_used: string | null; category_id: string | null }>(
      `SELECT user_id::text, image_url, prompt_text, model_used, category_id::text
         FROM user_submissions WHERE id = $1::bigint AND status = 'pending_review' FOR UPDATE`, [id]
    );
    const submission = result.rows[0];
    if (!submission) return;
    if (decision === "reject") {
      await client.query("UPDATE user_submissions SET status='rejected', reviewed_at=now() WHERE id=$1::bigint", [id]);
      return;
    }
    const image = await client.query<{ id: string }>(
      `INSERT INTO images (url, model_used, author_user_id) VALUES ($1, $2, $3::bigint) RETURNING id::text`,
      [submission.image_url, submission.model_used, submission.user_id]
    );
    const imageId = image.rows[0]?.id;
    if (!imageId) throw new Error("تصویرِ ارسال‌شده ساخته نشد.");
    await client.query("INSERT INTO prompts (image_id, prompt_text) VALUES ($1::bigint, $2)", [imageId, submission.prompt_text]);
    if (submission.category_id) await client.query("INSERT INTO image_categories (image_id, category_id) VALUES ($1::bigint, $2::bigint) ON CONFLICT DO NOTHING", [imageId, submission.category_id]);
    await client.query("UPDATE user_submissions SET status='approved', published_image_id=$2::bigint, reviewed_at=now() WHERE id=$1::bigint", [id, imageId]);
  });
  revalidatePath("/"); revalidatePath(BACK); revalidatePath("/account");
  redirect(BACK);
}
