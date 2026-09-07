import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { faDate, faNum, faRelative } from "@/lib/admin/format";
import {
  ADMIN_PAGE_SIZE,
  listAdminImages,
  listCategoryOptions,
  type AdminCategoryOption,
  type AdminImageRow,
} from "@/lib/admin/images";
import {
  ADMIN_IMAGES_PATH,
  hasActiveFilter,
  imageListHref,
  parseImageListQuery,
  type ImageListQuery,
  type RawSearchParams,
} from "@/lib/admin/image-list";
import { Pagination } from "@/app/_components/ui/Pagination";
import { AlertTriangle, Check, ImageIcon, Search, Upload } from "@/app/_components/ui/Icons";
import {
  Card,
  EmptyState,
  PageHeader,
  btnPrimary,
  btnSoft,
} from "@/app/_components/admin/AdminUi";
import {
  DbNotice,
  classifyDbError,
  type DbFailure,
} from "@/app/_components/admin/AdminDbNotice";
import { ImagesFilterBar } from "./_components/images-filter-bar";
import { ImagesTable, type ImageRowView } from "./_components/images-table";

/**
 * فهرستِ تصاویر — /admin/images
 *
 * ⚠️ requireAdmin در همین فایل صدا زده می‌شود، با اینکه چیدمانِ (panel) هم صدایش
 *    می‌زند. چیدمان در جابه‌جایی بینِ صفحه‌های همان گروه دوباره اجرا نمی‌شود و
 *    جلوی رندرِ صفحه‌های تودرتو را هم نمی‌گیرد، پس تنها گاردِ واقعیِ این صفحه
 *    همین خط است. توضیحِ کامل در lib/admin/auth.ts.
 *
 * ── تقسیمِ کار بینِ این صفحه و کامپوننت‌های کلاینتی ──
 * هر قالب‌بندی (تاریخ، عدد، ابعاد) *اینجا* انجام می‌شود و رشته‌ی آماده پایین
 * می‌رود. اگر کامپوننتِ کلاینتی خودش Intl را صدا بزند، منطقه‌ی زمانیِ مرورگر با
 * سرور یکی نیست (نت‌لیفای روی UTC است) و HTMLِ دو طرف نمی‌خواند → خطای هیدریت.
 */

export const metadata: Metadata = {
  title: "تصاویر",
};

// ---------------------------------------------------------------------------
// خواندنِ داده
// ---------------------------------------------------------------------------

type LoadState =
  | {
      ok: true;
      rows: AdminImageRow[];
      total: number;
      categories: AdminCategoryOption[];
      /**
       * لحظه‌ی خواندنِ داده، مبنای «۳ روز پیش»ها.
       *
       * ⚠️ اینجا گرفته می‌شود و نه در بدنه‌ی کامپوننت: Date.now ناخالص است و
       *    قاعده‌ی خلوصِ رندرِ ری‌اکت را می‌شکند (eslint هم می‌گیردش). معنایی‌تر
       *    هم هست — مبنای «پیش» باید یک لحظه برای کلِ فهرست باشد.
       */
      now: number;
    }
  | { ok: false; failure: DbFailure };

async function load(filters: ImageListQuery): Promise<LoadState> {
  try {
    // موازی: دیتابیس دور است و دو رفت‌وبرگشتِ سری تاخیر را دو برابر می‌کند.
    // فهرستِ دسته‌ها هم برای نوارِ فیلتر لازم است و هم برای عملیاتِ گروهی.
    const [list, categories] = await Promise.all([
      listAdminImages(filters),
      listCategoryOptions(),
    ]);
    return { ok: true, rows: list.rows, total: list.total, categories, now: Date.now() };
  } catch (err) {
    return { ok: false, failure: classifyDbError(err) };
  }
}

/** ردیفِ دیتابیس → ردیفِ آماده‌ی نمایش. */
function toView(row: AdminImageRow, now: number): ImageRowView {
  return {
    id: row.id,
    url: row.url,
    title: row.title_fa,
    modelUsed: row.model_used,
    dimensions:
      row.width !== null && row.height !== null
        ? `${faNum(row.width)} × ${faNum(row.height)}`
        : null,
    width: row.width,
    height: row.height,
    likes: faNum(row.likes_count),
    createdAt: faDate(row.created_at),
    // زمانِ نسبی و نه تاریخِ کامل: در فهرستِ ویرایش، «۲ ساعت پیش» جوابِ سؤالِ
    // واقعیِ مدیر است («تازه دست‌زدم یا نه؟»)، نه تاریخِ دقیق.
    updatedAt: row.updated_at ? faRelative(row.updated_at, now) : null,
    promptExcerpt: row.prompt_excerpt,
    promptLength: row.prompt_length !== null ? `${faNum(row.prompt_length)} نویسه` : null,
    categories: row.categories.map((c) => ({ id: c.id, name_fa: c.name_fa })),
  };
}

// ---------------------------------------------------------------------------
// پیامِ نتیجه‌ی عملیات
// ---------------------------------------------------------------------------

type Flash = { tone: "affirm" | "alert"; text: string };

/**
 * نتیجه‌ی اکشن‌ها از query string خوانده می‌شود و نه از state.
 *
 * دلیلش در app/admin/_actions/images.ts توضیح داده شده: بعد از حذفِ گروهی،
 * فهرستِ روی صفحه دیگر معتبر نیست و باید از نو خوانده شود.
 */
function readFlash(params: RawSearchParams): Flash | null {
  const num = (key: string): number | null => {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== "string") return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const removed = num("removed");
  if (removed !== null) {
    return removed > 0
      ? { tone: "affirm", text: `${faNum(removed)} تصویر حذف شد.` }
      : { tone: "alert", text: "چیزی حذف نشد؛ احتمالاً پیش‌تر حذف شده بود." };
  }

  const added = num("added");
  if (added !== null) {
    // ⚠️ «۰ تصویر» اینجا خطا نیست و باید فرقش با موفقیت روشن بماند: یعنی همه‌ی
    //    انتخاب‌شده‌ها از قبل در آن دسته بودند. اگر همان پیامِ موفقیت را بدهیم،
    //    مدیر فکر می‌کند کاری انجام شد که انجام نشد.
    return added > 0
      ? { tone: "affirm", text: `${faNum(added)} تصویر به دسته افزوده شد.` }
      : { tone: "alert", text: "همه‌ی تصاویرِ انتخاب‌شده از قبل در این دسته بودند." };
  }

  const detached = num("detached");
  if (detached !== null) {
    return detached > 0
      ? { tone: "affirm", text: `دسته از ${faNum(detached)} تصویر برداشته شد.` }
      : { tone: "alert", text: "هیچ‌کدام از تصاویرِ انتخاب‌شده در این دسته نبودند." };
  }

  const bulk = Array.isArray(params.bulk) ? params.bulk[0] : params.bulk;
  if (bulk === "none") {
    return { tone: "alert", text: "اول ردیف‌هایی را که می‌خواهی تغییر کنند تیک بزن." };
  }
  if (bulk === "no-category") {
    return { tone: "alert", text: "برای عملیاتِ دسته‌ای، یک دسته انتخاب کن." };
  }

  return null;
}

// ---------------------------------------------------------------------------
// صفحه
// ---------------------------------------------------------------------------

export default async function AdminImagesPage({
  searchParams,
}: {
  // در نکست ۱۶ این پراپ یک Promise است و باید await شود.
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const filters = parseImageListQuery(params);
  const state = await load(filters);

  if (!state.ok) {
    return (
      <>
        <PageHeader title="تصاویر" />
        <DbNotice failure={state.failure} />
      </>
    );
  }

  const { rows, total, categories, now } = state;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  /**
   * صفحه‌ی بیرون از بازه → هدایت به آخرین صفحه‌ی موجود.
   *
   * ⚠️ عمداً notFound() نیست. حالتِ رایجش این است: مدیر در صفحه‌ی ۴ همه را حذف
   *    می‌کند و حالا فقط ۳ صفحه هست. یک ۴۰۴ در آن لحظه شبیهِ «پنل خراب شد» است،
   *    در حالی که کار درست انجام شده. هدایت هم آدرس را تمیز می‌کند.
   *
   * ⚠️ redirect بیرونِ try/catchِ load صدا زده می‌شود؛ داخلش، خودش را به‌عنوان
   *    خطای دیتابیس می‌گرفتیم و کارتِ «مهاجرت را اجرا کن» نشان می‌دادیم.
   */
  if (filters.page > totalPages) {
    redirect(imageListHref({ ...filters, page: totalPages }));
  }

  const backHref = imageListHref(filters);
  const flash = readFlash(params);
  const filtered = hasActiveFilter(filters);
  const from = (filters.page - 1) * ADMIN_PAGE_SIZE + 1;
  const to = from + rows.length - 1;

  return (
    <>
      <PageHeader
        title="تصاویر"
        description={
          total > 0
            ? filtered
              ? `${faNum(total)} تصویر با این فیلترها.`
              : `${faNum(total)} تصویر در گالری.`
            : undefined
        }
        actions={
          <Link href={`${ADMIN_IMAGES_PATH}/new`} className={btnPrimary}>
            <Upload size={14} />
            افزودن تصویر
          </Link>
        }
      />

      {flash ? <FlashStrip flash={flash} /> : null}

      <Card className="mb-4 p-4">
        <ImagesFilterBar
          filters={filters}
          categories={categories.map((c) => ({
            slug: c.slug,
            name_fa: c.name_fa,
            image_count: c.image_count,
          }))}
        />
      </Card>

      {rows.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState
              icon={Search}
              title="چیزی با این فیلترها پیدا نشد"
              body="عبارتِ جستجو را کوتاه‌تر کن یا یکی از فیلترها را بردار."
              action={
                <Link href={ADMIN_IMAGES_PATH} className={btnSoft}>
                  برداشتنِ همه‌ی فیلترها
                </Link>
              }
            />
          ) : (
            /* حالتِ خالیِ طبیعی. پیامش نباید شبیهِ خطا باشد — این وضعیتِ درستِ
               یک پنلِ تازه است. */
            <EmptyState
              icon={ImageIcon}
              title="هنوز تصویری در گالری نیست"
              body="اولین تصویر را اضافه کن تا فهرست، فیلترها و شمارنده‌های داشبورد پر شوند."
              action={
                <Link href={`${ADMIN_IMAGES_PATH}/new`} className={btnPrimary}>
                  <Upload size={14} />
                  افزودن تصویر
                </Link>
              }
            />
          )}
        </Card>
      ) : (
        <>
          <Card>
            <ImagesTable
              rows={rows.map((row) => toView(row, now))}
              categories={categories.map((c) => ({ id: c.id, name_fa: c.name_fa }))}
              backHref={backHref}
            />
          </Card>

          <p className="mt-3 text-center text-[11px] text-faint">
            نمایشِ {faNum(from)} تا {faNum(to)} از {faNum(total)}
          </p>

          <Pagination
            page={filters.page}
            totalPages={totalPages}
            // ⚠️ فیلترهای فعال باید در لینکِ هر صفحه بمانند، وگرنه صفحه‌ی ۲ همه‌ی
            //    آن‌ها را می‌اندازد و مدیر ناگهان کلِ گالری را می‌بیند.
            href={(p) => imageListHref({ ...filters, page: p })}
            label="صفحه‌بندی تصاویر"
          />
        </>
      )}
    </>
  );
}

/**
 * نوارِ نتیجه‌ی آخرین عملیات.
 *
 * role="status" و نه role="alert": این پیام پس از یک ناوبریِ کاملِ صفحه دیده
 * می‌شود و alert وسطِ خواندنِ صفحه حرفِ اسکرین‌ریدر را قطع می‌کند.
 */
function FlashStrip({ flash }: { flash: Flash }) {
  const affirm = flash.tone === "affirm";
  return (
    <div
      role="status"
      className={`mb-4 flex items-center gap-2.5 rounded-card border px-4 py-3 text-[12px] font-bold ${
        affirm
          ? "border-affirm/25 bg-affirm/10 text-affirm"
          : "border-alert/25 bg-alert-wash text-alert"
      }`}
    >
      {/* آیکن با لحن عوض می‌شود: تیکِ سبز پای پیامی که می‌گوید «هیچ‌کاری انجام
          نشد» دقیقاً همان چیزی است که مدیر را گمراه می‌کند. */}
      <span aria-hidden className="shrink-0">
        {affirm ? <Check size={14} /> : <AlertTriangle size={14} />}
      </span>
      {flash.text}
    </div>
  );
}
