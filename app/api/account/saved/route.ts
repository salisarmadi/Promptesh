import { getCurrentUser } from "@/lib/users/session";
import { query } from "@/lib/db";

function sameOrigin(request: Request): boolean { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }
async function imageId(request: Request): Promise<string | null> { try { const data = await request.json() as { imageId?: unknown }; return typeof data.imageId === "string" && /^[1-9][0-9]{0,18}$/.test(data.imageId) ? data.imageId : null; } catch { return null; } }
export async function POST(request: Request) {
  const user = await getCurrentUser(); const id = await imageId(request);
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (!id) return Response.json({ error: "invalid" }, { status: 400 });
  await query("INSERT INTO user_saved_images (user_id, image_id) SELECT $1, id FROM images WHERE id=$2::bigint ON CONFLICT DO NOTHING", [user.id, id]);
  return Response.json({ saved: true });
}
export async function DELETE(request: Request) {
  const user = await getCurrentUser(); const id = await imageId(request);
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (!id) return Response.json({ error: "invalid" }, { status: 400 });
  await query("DELETE FROM user_saved_images WHERE user_id=$1 AND image_id=$2::bigint", [user.id, id]);
  return Response.json({ saved: false });
}
