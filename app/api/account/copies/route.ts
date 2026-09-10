import { getCurrentUser } from "@/lib/users/session";
import { query } from "@/lib/db";
export async function POST(request: Request) {
  const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser(); if (!user) return Response.json({ ignored: true });
  let imageId: unknown; try { imageId = (await request.json() as { imageId?: unknown }).imageId; } catch { return Response.json({ error: "invalid" }, { status: 400 }); }
  if (typeof imageId !== "string" || !/^[1-9][0-9]{0,18}$/.test(imageId)) return Response.json({ error: "invalid" }, { status: 400 });
  await query("INSERT INTO user_copy_history (user_id, image_id) SELECT $1, id FROM images WHERE id=$2::bigint", [user.id, imageId]);
  return Response.json({ recorded: true });
}
