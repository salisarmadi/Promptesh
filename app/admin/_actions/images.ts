"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { logActivity } from "@/lib/admin/queries";
import {
  createAdminImage,
  updateAdminImage,
  deleteAdminImages,
  addCategoryToImages,
  removeCategoryFromImages,
  isValidId,
  type AdminImageInput,
} from "@/lib/admin/images";
import { ADMIN_IMAGES_PATH } from "@/lib/admin/image-list";
import type { ImageFormState } from "./image-state";

/**
 * اکشن‌های نوشتنِ تصاویر.
 *
 * ⚠️ هر تابعِ export شده‌ی این فایل یک نقطه‌ی ورودیِ HTTP است که هر کسی می‌تواند
 *    بی‌واسطه و بدونِ عبور از رابط صدایش بزند. دو نتیجه‌ی مستقیم:
 *      ۱. هیچ تابعِ کمکیِ داخلی نباید export شود.
 *      ۲. هر اکشن باید *خودش* requireAdmin() را صدا بزند. اینکه صفحه‌ای که
 *         فرم را نشان می‌دهد مجوز می‌سنجد هیچ ربطی به این ندارد؛ اکشن از آن
 *         صفحه فراخوانی نمی‌شود، از شبکه فراخوانی می‌شود.
 *
 * ⚠️ redirect() با پرتابِ یک استثنا کار می‌کند، پس همیشه *بیرونِ* try/catch صدا
 *    زده می‌شود. داخلِ try، خودش را به‌عنوان «خطای ذخیره» می‌گرفتیم.
 */

// ---------------------------------------------------------------------------
// اعتبارسنجیِ ورودیِ فرم
// ---------------------------------------------------------------------------

/**
 * سقف‌ها.
 *
 * ⚠️ اسکیما برای این ستون‌ها سقفِ طول ندارد (همه TEXT‌اند). یعنی اگر اینجا سقف
 *    نگذاریم، یک درخواستِ دستی می‌تواند یک مگابایت متن در title_fa بنشاند و
 *    جدولِ فهرست را برای همیشه خراب کند. سقف‌ها دست‌ودل‌بازند و کارِ واقعی را
 *    محدود نمی‌کنند.
 */
const MAX_URL = 2048;
const MAX_TITLE = 200;
const MAX_MODEL = 120;
const MAX_PROMPT = 20_000;
/** بزرگ‌ترین بعدِ معقول برای یک تصویر؛ بالاتر از این یعنی اشتباهِ تایپی. */
const MAX_DIMENSION = 20_000;

type FieldKey = "url" | "title" | "model" | "width" | "height" | "prompt";

/** رشته‌ی trim شده، یا null اگر خالی بود. */
function text(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * عددِ صحیحِ مثبت، یا null اگر خالی بود.
 *
 * `undefined` یعنی «مقدار داده شده ولی عدد نیست» — که با «خالی» فرق دارد و
 * باید خطا بدهد، نه اینکه بی‌صدا null شود و مدیر فکر کند ذخیره شد.
 */
function positiveInt(formData: FormData, key: string): number | null | undefined {
  const raw = text(formData, key);
  if (raw === null) return null;
  // ارقامِ فارسی که مدیر ممکن است تایپ کند به لاتین برمی‌گردند.
  const latin = raw.replace(/[۰-۹٠-٩]/g, (d) => String(d.charCodeAt(0) & 0xf));
  if (!/^[0-9]+$/.test(latin)) return undefined;
  const value = Number.parseInt(latin, 10);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_DIMENSION) return undefined;
  return value;
}

/**
 * بررسیِ شکلِ url.
 *
 * ⚠️ عمداً سخت‌گیر نیست و هیچ نرمال‌سازی‌ای نمی‌کند. شکلِ فعلیِ url در دیتابیس
 *    قراردادِ سایتِ عمومی است و تغییرش اینجا یعنی ریسکِ شکستنِ گالری. پس فقط دو
 *    چیز رد می‌شود: مقدارِ دارای فاصله (که همیشه اشتباهِ کپی است) و مقداری که نه
 *    مسیرِ نسبیِ /… است و نه آدرسِ http(s). هر دو شکلی که امروز در پروژه وجود
 *    دارد از این بررسی رد می‌شود.
 */
function validateUrl(raw: string | null): string | null {
  if (raw === null) return "نشانیِ تصویر الزامی است.";
  if (raw.length > MAX_URL) return `نشانی نباید از ${MAX_URL} نویسه بلندتر باشد.`;
  if (/\s/.test(raw)) return "نشانی نباید فاصله داشته باشد؛ احتمالاً کپی ناقص بوده است.";
  if (raw.startsWith("/")) return null;
  if (/^https?:\/\/\S+$/i.test(raw)) return null;
  return "نشانی باید یا با / شروع شود (مسیرِ داخلی) یا یک آدرسِ کاملِ http/https باشد.";
}

/** FormData → ورودیِ لایه‌ی داده، یا فهرستِ خطاها. */
function readImageForm(
  formData: FormData
): { ok: true; input: AdminImageInput } | { ok: false; errors: Partial<Record<FieldKey, string>> } {
  const errors: Partial<Record<FieldKey, string>> = {};

  const url = text(formData, "url");
  const urlError = validateUrl(url);
  if (urlError) errors.url = urlError;

  const titleFa = text(formData, "title_fa");
  if (titleFa && titleFa.length > MAX_TITLE) {
    errors.title = `عنوان نباید از ${MAX_TITLE} نویسه بلندتر باشد.`;
  }

  const modelUsed = text(formData, "model_used");
  if (modelUsed && modelUsed.length > MAX_MODEL) {
    errors.model = `نامِ مدل نباید از ${MAX_MODEL} نویسه بلندتر باشد.`;
  }

  const width = positiveInt(formData, "width");
  if (width === undefined) errors.width = "عرض باید یک عددِ صحیحِ مثبت باشد.";
  const height = positiveInt(formData, "height");
  if (height === undefined) errors.height = "ارتفاع باید یک عددِ صحیحِ مثبت باشد.";

  // ⚠️ یکی از دو بعد به‌تنهایی به هیچ دردی نمی‌خورد: <Image> نکست هر دو را لازم
  //    دارد و با یکی، نسبت‌تصویر ساخته نمی‌شود. پس نیمه‌کاره را همین‌جا می‌گیریم
  //    نه اینکه در گالری بی‌صدا بی‌اثر بماند.
  if (width !== undefined && height !== undefined) {
    if (width !== null && height === null) errors.height = "با داشتنِ عرض، ارتفاع هم لازم است.";
    if (height !== null && width === null) errors.width = "با داشتنِ ارتفاع، عرض هم لازم است.";
  }

  const promptRaw = formData.get("prompt_text");
  const promptText = typeof promptRaw === "string" ? promptRaw.trim() : "";
  if (promptText.length > MAX_PROMPT) {
    errors.prompt = `متنِ پرامپت نباید از ${MAX_PROMPT} نویسه بلندتر باشد.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    input: {
      // url اینجا حتماً رشته است: validateUrl برای null خطا داده و بالا برگشته‌ایم.
      url: url as string,
      titleFa,
      modelUsed,
      width: width ?? null,
      height: height ?? null,
      promptText: promptText.length > 0 ? promptText : null,
      categoryIds: formData.getAll("category_ids").filter(isValidId),
    },
  };
}

/** خلاصه‌ی خوانا برای دفترِ رویدادها. */
function describe(input: { titleFa: string | null; url: string }): string {
  return input.titleFa ?? input.url;
}

/**
 * تازه‌سازیِ کشِ مسیرهای پنل.
 *
 * ⚠️ صفحه‌ی عمومیِ «/» عمداً اینجا نیست. آن صفحه با await connection() همیشه
 *    پویا رندر می‌شود، پس چیزی برای بی‌اعتبار کردن ندارد و صدا زدنش فقط یک
 *    کارِ بی‌اثر بود که آدم را به این فکر می‌انداخت که کشی هست.
 *
 * داشبورد هم بی‌اعتبار می‌شود چون شمارنده‌هایش (بدونِ پرامپت، بدونِ دسته) با
 * همین نوشتن عوض شده‌اند.
 */
function revalidateAdmin(): void {
  revalidatePath(ADMIN_IMAGES_PATH);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// ساخت و ویرایش
// ---------------------------------------------------------------------------

/**
 * ذخیره‌ی فرمِ تصویر — هم ساخت و هم ویرایش.
 *
 * یک اکشن برای هر دو، چون اعتبارسنجی و شکلِ فرم دقیقاً یکی است و دو نسخه یعنی
 * دو جا برای فراموش‌کردنِ یک قاعده. تفاوتشان یک فیلدِ مخفیِ id است.
 *
 * ⚠️ id از خودِ فرم می‌آید و فرم را می‌توان دستکاری کرد — ولی خطری ندارد: تنها
 *    کاری که با آن می‌شود کرد ویرایشِ تصویری *دیگر* است، و کسی که تا اینجا
 *    رسیده مجوزِ ویرایشِ همه‌ی تصاویر را دارد. اگر روزی نقشِ محدود اضافه شد،
 *    اینجا همان نقطه‌ای است که باید مالکیت بررسی شود.
 */
export async function saveImageAction(
  _prev: ImageFormState,
  formData: FormData
): Promise<ImageFormState> {
  await requireAdmin();

  const parsed = readImageForm(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "فرم ذخیره نشد؛ موردهای مشخص‌شده را اصلاح کن.",
      fieldErrors: parsed.errors,
    };
  }

  const rawId = formData.get("id");
  const id = typeof rawId === "string" && isValidId(rawId) ? rawId : null;

  let createdId: string | null = null;

  try {
    if (id === null) {
      createdId = await createAdminImage(parsed.input);
    } else {
      const updated = await updateAdminImage(id, parsed.input);
      if (!updated) {
        return {
          status: "error",
          message: "این تصویر دیگر وجود ندارد؛ احتمالاً در جای دیگری حذف شده است.",
          fieldErrors: {},
        };
      }
    }
  } catch (err) {
    console.error("[admin] ذخیره‌ی تصویر ناموفق بود:", err);
    return {
      status: "error",
      message: "ذخیره در دیتابیس انجام نشد. اگر تکرار شد، لاگِ سرور را ببین.",
      fieldErrors: {},
    };
  }

  // بیرونِ تراکنش و بیرونِ try: دفترِ رویداد نباید بتواند نتیجه‌ی یک ذخیره‌ی
  // موفق را عوض کند (خودِ logActivity هم هیچ خطایی به بیرون نمی‌دهد).
  await logActivity({
    action: createdId ? "create" : "update",
    entityType: "image",
    entityId: createdId ?? id,
    summary: describe(parsed.input),
  });

  revalidateAdmin();

  // ساختِ تازه: به صفحه‌ی ویرایشِ همان ردیف می‌رویم. ماندن روی فرمِ خالی یعنی
  // مدیر نمی‌داند ذخیره شد یا نه، و زدنِ دوباره‌ی «ذخیره» یک ردیفِ تکراری
  // می‌ساخت. ⚠️ redirect بیرونِ try است چون با پرتابِ استثنا کار می‌کند.
  if (createdId) redirect(`${ADMIN_IMAGES_PATH}/${createdId}?created=1`);

  // اینجا id قطعاً non-null است (createdId فقط وقتی پر می‌شود که id تهی باشد)،
  // ولی به شرط تکیه می‌کنیم و نه به ! — تا اگر روزی شرطِ بالا عوض شد، «null» در
  // آدرسِ کش نیفتد.
  if (id) revalidatePath(`${ADMIN_IMAGES_PATH}/${id}`);

  return { status: "saved", message: "تغییرات ذخیره شد.", fieldErrors: {} };
}

// ---------------------------------------------------------------------------
// حذفِ تکی
// ---------------------------------------------------------------------------

/**
 * حذف از صفحه‌ی ویرایش.
 *
 * پراپِ prev نمی‌گیرد چون نتیجه‌اش همیشه رفتن به فهرست است؛ حالتی برای
 * نشان‌دادن باقی نمی‌ماند. با <form action={…}> مستقیم استفاده می‌شود.
 */
export async function deleteImageAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const rawId = formData.get("id");
  if (typeof rawId !== "string" || !isValidId(rawId)) redirect(ADMIN_IMAGES_PATH);

  const deleted = await deleteAdminImages([rawId as string]);

  if (deleted.length > 0) {
    await logActivity({
      action: "delete",
      entityType: "image",
      entityId: deleted[0].id,
      summary: deleted[0].title_fa ?? deleted[0].url,
    });
  }

  revalidateAdmin();
  redirect(`${ADMIN_IMAGES_PATH}?removed=${deleted.length}`);
}

// ---------------------------------------------------------------------------
// عملیاتِ گروهی
// ---------------------------------------------------------------------------

/**
 * حذفِ گروهی و افزودن/برداشتنِ دسته روی چند تصویر.
 *
 * چرا یک اکشن با فیلدِ op و نه سه اکشن: هر سه روی *همان* مجموعه‌ی چک‌باکس‌ها کار
 * می‌کنند، و یک فرم نمی‌تواند سه action داشته باشد. با دکمه‌های
 * <button name="op" value="…"> خودِ HTML می‌گوید کدام عملیات زده شده — بی هیچ
 * جاوااسکریپتی و بی حالتِ کلاینتی برای «کدام دکمه فعال است».
 *
 * ⚠️ نتیجه به‌جای state، در query string برمی‌گردد و صفحه دوباره خوانده می‌شود.
 *    دلیل: بعد از حذفِ گروهی، فهرستِ روی صفحه دیگر معتبر نیست و چک‌باکس‌های
 *    تیک‌خورده به ردیف‌هایی اشاره می‌کنند که وجود ندارند. نگه‌داشتنِ همان صفحه با
 *    یک پیامِ کوچک، دقیقاً حالتی است که در آن مدیر دوباره «حذف» می‌زند و
 *    نمی‌فهمد چرا کار نمی‌کند.
 */
export async function bulkImagesAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const op = formData.get("op");
  const ids = formData.getAll("ids").filter(isValidId);
  // مقصدِ بازگشت: همان فهرست با همان فیلترها. از فیلدِ مخفیِ فرم می‌آید و چون
  // ورودیِ کاربر است، فقط مسیرِ داخلیِ خودِ فهرست پذیرفته می‌شود — وگرنه یک
  // فرمِ دستکاری‌شده می‌توانست مدیر را به سایتِ دیگری بفرستد (open redirect).
  const rawBack = formData.get("back");
  const back =
    typeof rawBack === "string" && rawBack.startsWith(`${ADMIN_IMAGES_PATH}`)
      ? rawBack
      : ADMIN_IMAGES_PATH;

  const sep = back.includes("?") ? "&" : "?";

  if (ids.length === 0) redirect(`${back}${sep}bulk=none`);

  if (op === "delete") {
    const deleted = await deleteAdminImages(ids);
    await logActivity({
      action: "delete",
      entityType: "image",
      entityId: deleted.length === 1 ? deleted[0].id : null,
      summary:
        deleted.length === 1
          ? (deleted[0].title_fa ?? deleted[0].url)
          : `حذفِ گروهیِ ${deleted.length} تصویر`,
    });
    revalidateAdmin();
    redirect(`${back}${sep}removed=${deleted.length}`);
  }

  const rawCategory = formData.get("category_id");
  if (typeof rawCategory !== "string" || !isValidId(rawCategory)) {
    redirect(`${back}${sep}bulk=no-category`);
  }
  const categoryId = rawCategory as string;

  if (op === "add-category") {
    const affected = await addCategoryToImages(ids, categoryId);
    await logActivity({
      action: "update",
      entityType: "image",
      summary: `افزودنِ دسته به ${affected} تصویر`,
    });
    revalidateAdmin();
    redirect(`${back}${sep}added=${affected}`);
  }

  if (op === "remove-category") {
    const affected = await removeCategoryFromImages(ids, categoryId);
    await logActivity({
      action: "update",
      entityType: "image",
      summary: `برداشتنِ دسته از ${affected} تصویر`,
    });
    revalidateAdmin();
    redirect(`${back}${sep}detached=${affected}`);
  }

  // opِ ناشناخته: فقط برمی‌گردیم. رسیدن به اینجا یعنی فرم دستکاری شده.
  redirect(back);
}
