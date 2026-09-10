import { randomUUID } from "node:crypto";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

function assertImageBytes(bytes: Uint8Array, mime: string): void {
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  const webp = bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!((mime === "image/jpeg" && jpg) || (mime === "image/png" && png) || (mime === "image/webp" && webp))) {
    throw new Error("فایل انتخاب‌شده یک تصویر معتبر JPG، PNG یا WEBP نیست.");
  }
}

export async function uploadSubmissionImage(file: File, userId: string): Promise<string> {
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) throw new Error("فقط تصویرهای JPG، PNG و WEBP پذیرفته می‌شوند.");
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new Error("حجم تصویر باید حداکثر ۴ مگابایت باشد.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  assertImageBytes(bytes, file.type);
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) throw new Error("فضای آپلود هنوز پیکربندی نشده است. با مدیر سایت تماس بگیر.");

  const objectPath = `user-submissions/${userId}/${randomUUID()}.${extension}`;
  const response = await fetch(`${baseUrl}/storage/v1/object/Gallery/${objectPath}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, apikey: key, "content-type": file.type, "x-upsert": "false" },
    body: bytes,
  });
  if (!response.ok) {
    console.error("[users] storage upload failed:", response.status, await response.text());
    throw new Error("آپلود تصویر انجام نشد. کمی بعد دوباره تلاش کن.");
  }
  return `${baseUrl}/storage/v1/object/public/Gallery/${objectPath}`;
}
