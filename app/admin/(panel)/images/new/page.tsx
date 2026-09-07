import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listCategoryOptions } from "@/lib/admin/images";
import { ADMIN_IMAGES_PATH } from "@/lib/admin/image-list";
import { ArrowRight } from "@/app/_components/ui/Icons";
import { PageHeader } from "@/app/_components/admin/AdminUi";
import {
  DbNotice,
  classifyDbError,
  type DbFailure,
} from "@/app/_components/admin/AdminDbNotice";
import { ImageForm } from "../_components/image-form";

/**
 * ساختِ تصویر — /admin/images/new
 *
 * ⚠️ این صفحه عمداً وجود دارد و ۴۰۴ نیست: دکمه‌ی «افزودنِ تصویر» در داشبورد به
 *    همین‌جا لینک می‌شود. تا وقتی آپلودِ مستقیم (مرحله‌ی بعد) نیامده، مدیر
 *    نشانیِ تصویر را دستی وارد می‌کند — بعد از آن این فرم همان‌جا ماند و فقط
 *    این فیلد با فایل‌اپلود جایگزین می‌شود.
 */

export const metadata: Metadata = {
  title: "افزودنِ تصویر",
};

type LoadState =
  | { ok: true; categories: Awaited<ReturnType<typeof listCategoryOptions>> }
  | { ok: false; failure: DbFailure };

async function load(): Promise<LoadState> {
  try {
    const categories = await listCategoryOptions();
    return { ok: true, categories };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

export default async function AdminImageNewPage() {
  await requireAdmin();

  const state = await load();

  if (!state.ok) {
    return (
      <>
        <PageHeader title="افزودنِ تصویر" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="افزودنِ تصویر"
        description={
          <span className="flex items-center gap-1.5">
            <Link
              href={ADMIN_IMAGES_PATH}
              className="inline-flex items-center gap-1 font-bold text-accent hover:text-accent-strong"
            >
              <ArrowRight size={13} />
              فهرستِ تصاویر
            </Link>
          </span>
        }
      />

      {state.categories.length === 0 ? (
        <div className="mb-4 rounded-card border border-line bg-canvas px-5 py-4 text-[12px] leading-relaxed text-muted shadow-card">
          هنوز دسته‌ای نساخته‌ای. فیلترهای گالریِ عمومی از دسته‌ها می‌آیند؛ می‌توانی
          اول این تصویر را بدونِ دسته بسازی و بعد دسته‌ها را بسازی، یا{" "}
          <Link href="/admin/categories" className="font-bold text-accent hover:text-accent-strong">
            اول دسته بساز
          </Link>
          .
        </div>
      ) : null}

      <ImageForm image={null} categories={state.categories} />
    </>
  );
}
