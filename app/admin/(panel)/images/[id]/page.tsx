import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { faDateTime, faNum } from "@/lib/admin/format";
import {
  getAdminImage,
  isValidId,
  listCategoryOptions,
  type AdminCategoryOption,
  type AdminImageDetail,
} from "@/lib/admin/images";
import { ADMIN_IMAGES_PATH } from "@/lib/admin/image-list";
import { ArrowRight, Check } from "@/app/_components/ui/Icons";
import { PageHeader } from "@/app/_components/admin/AdminUi";
import {
  DbNotice,
  classifyDbError,
  type DbFailure,
} from "@/app/_components/admin/AdminDbNotice";
import { ImageForm, type ImageFormValues } from "../_components/image-form";

/**
 * ویرایشِ یک تصویر — /admin/images/[id]
 *
 * ⚠️ requireAdmin در همین فایل صدا زده می‌شود؛ چیدمانِ (panel) گاردِ کافی نیست.
 *    توضیحِ کامل در lib/admin/auth.ts.
 */

export const metadata: Metadata = {
  title: "ویرایشِ تصویر",
};

type LoadState =
  | { ok: true; image: AdminImageDetail | null; categories: AdminCategoryOption[] }
  | { ok: false; failure: DbFailure };

async function load(id: string): Promise<LoadState> {
  try {
    const [image, categories] = await Promise.all([getAdminImage(id), listCategoryOptions()]);
    return { ok: true, image, categories };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

export default async function AdminImageEditPage({
  params,
  searchParams,
}: {
  // هر دو در نکست ۱۶ Promise‌اند.
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();

  const { id } = await params;

  /**
   * ⚠️ اعتبارسنجیِ شکلِ شناسه *پیش از* رسیدن به دیتابیس.
   *
   * /admin/images/abc بدونِ این بررسی به کوئری می‌رسید و پستگرس با خطای 22P02
   * (شکستِ تبدیل به bigint) یک ۵۰۰ می‌داد. ۴۰۴ جوابِ درستِ یک آدرسِ بی‌معناست.
   */
  if (!isValidId(id)) notFound();

  const state = await load(id);

  if (!state.ok) {
    return (
      <>
        <PageHeader title="ویرایشِ تصویر" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  // ⚠️ notFound بیرونِ try/catchِ load است؛ داخلش، خودش را به‌عنوان خطای
  //    دیتابیس می‌گرفتیم و به‌جای ۴۰۴، کارتِ «مهاجرت را اجرا کن» نشان می‌دادیم.
  if (!state.image) notFound();

  const image = state.image;
  const created = (await searchParams).created === "1";

  return (
    <>
      <PageHeader
        title={image.title_fa ?? "تصویرِ بی‌عنوان"}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={ADMIN_IMAGES_PATH}
              className="inline-flex items-center gap-1 font-bold text-accent hover:text-accent-strong"
            >
              <ArrowRight size={13} />
              فهرستِ تصاویر
            </Link>
            <span className="text-faint">·</span>
            <span>شناسه‌ی {faNum(Number(image.id))}</span>
            <span className="text-faint">·</span>
            <span>افزوده‌شده در {faDateTime(image.created_at)}</span>
          </span>
        }
      />

      {/* پیامِ «ساخته شد» پس از هدایت از فرمِ ساخت. */}
      {created ? (
        <div
          role="status"
          className="mb-4 flex items-center gap-2.5 rounded-card border border-affirm/25 bg-affirm/10 px-4 py-3 text-[12px] font-bold text-affirm"
        >
          <span aria-hidden className="shrink-0">
            <Check size={14} />
          </span>
          تصویر ساخته شد. حالا می‌توانی جزئیاتش را کامل کنی.
        </div>
      ) : null}

      <ImageForm image={toFormValues(image)} categories={state.categories} />
    </>
  );
}

/**
 * رکوردِ دیتابیس → مقدارهای فرم.
 *
 * ⚠️ همه‌چیز به رشته تبدیل می‌شود، حتی عددها. مقصد یک <input> است و مقدارِ
 *    <input> در HTML رشته است؛ دادنِ number باعثِ اختلافِ ظریفِ سرور/کلاینت در
 *    هیدریت می‌شود. قالب‌بندیِ فارسیِ تاریخ‌ها هم *اینجا* انجام می‌شود، چون
 *    کامپوننتِ مقصد کلاینتی است و منطقه‌ی زمانیِ مرورگر با سرور یکی نیست.
 */
function toFormValues(image: AdminImageDetail): ImageFormValues {
  return {
    id: image.id,
    url: image.url,
    titleFa: image.title_fa ?? "",
    modelUsed: image.model_used ?? "",
    // ⚠️ عمداً faNum نمی‌شود: این مقدارِ یک فیلدِ ورودیِ عددی است و باید با
    //    ارقامِ لاتین برگردد، وگرنه ذخیره‌ی دوباره باید ارقامِ فارسی را تبدیل کند.
    width: image.width !== null ? String(image.width) : "",
    height: image.height !== null ? String(image.height) : "",
    promptText: image.prompt_text ?? "",
    categoryIds: image.categories.map((c) => c.id),
    likes: faNum(image.likes_count),
    createdAt: faDateTime(image.created_at),
    updatedAt: image.updated_at ? faDateTime(image.updated_at) : null,
  };
}
