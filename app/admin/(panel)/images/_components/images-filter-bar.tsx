"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Search, X } from "@/app/_components/ui/Icons";
import { inputClass, selectClass } from "@/app/_components/admin/AdminForm";
import {
  ADMIN_IMAGES_PATH,
  DEFAULT_SORT,
  MISSING_OPTIONS,
  SORT_OPTIONS,
  hasActiveFilter,
  imageListHref,
  type ImageListHrefPatch,
  type ImageListQuery,
  type ImageListSort,
  type MissingField,
} from "@/lib/admin/image-list";

/**
 * نوارِ جستجو و فیلترِ فهرستِ تصاویر.
 *
 * ── چرا هم <form method="get"> و هم router.push ──
 * همان الگوی بهسازیِ تدریجیِ جستجوی گالری:
 *   • بدونِ جاوااسکریپت، فرم به‌صورتِ بومی به /admin/images?… می‌رود و فیلتر کار
 *     می‌کند. برای پنلِ مدیریت این «خوب است اگر باشد» نیست — این پنل تنها راهِ
 *     ویرایشِ محتواست و نباید با یک خطای جاوااسکریپت از کار بیفتد.
 *   • با جاوااسکریپت، preventDefault می‌کنیم و آدرسِ *تمیز* می‌سازیم. ارسالِ
 *     بومیِ فرم همه‌ی فیلدها را می‌فرستد، حتی خالی‌ها، و آدرس می‌شود
 *     «?q=&category=&missing=&sort=newest» که کپی‌کردنش بی‌فایده است.
 *
 * ⚠️ حالتِ محلی فقط برای فیلدِ متنی است. سه <select> عمداً کنترل‌نشده‌اند و با
 *    key={signature} بازسازی می‌شوند: با کنترل‌کردنشان باید هر تغییر را هم در
 *    state می‌نوشتیم و هم navigate می‌کردیم، و آن دو می‌توانند از هم جدا بیفتند
 *    (مثلاً با دکمه‌ی بازگشتِ مرورگر) و <select> چیزی نشان دهد که در آدرس نیست.
 */

type CategoryChoice = { slug: string; name_fa: string; image_count: number };

export function ImagesFilterBar({
  filters,
  categories,
}: {
  filters: ImageListQuery;
  categories: CategoryChoice[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * امضای فیلترهای فعال — همان آدرسِ متعارف.
   *
   * برای مقایسه استفاده می‌شود و نه خودِ آبجکت: filters در هر رندر یک شیء تازه
   * است، پس مقایسه‌ی ارجاعی همیشه «عوض شده» می‌گفت و فیلد را در هر کلید‌فشاری
   * بازنویسی می‌کرد.
   */
  const signature = imageListHref(filters);

  const [lastSignature, setLastSignature] = useState(signature);
  const [q, setQ] = useState(filters.q);

  /**
   * وقتی آدرس از بیرون عوض شد (کلیک روی چیپ، دکمه‌ی بازگشت، لینکِ داشبورد)،
   * فیلدِ متنی هم باید همان را نشان دهد.
   *
   * این هم‌ترازی در جریانِ رندر انجام می‌شود و نه در useEffect: ری‌اکت با دیدنِ
   * setState در رندر، بی‌درنگ و پیش از کشیدن روی صفحه از نو رندر می‌کند، پس هیچ
   * فریمی با مقدارِ کهنه دیده نمی‌شود. راهِ effect یک رندرِ اضافه پس از paint
   * می‌ساخت — همان چیزی که قاعده‌ی set-state-in-effect لینت می‌گیردش.
   */
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setQ(filters.q);
  }

  /** آدرسِ تمیز از مقدارهای فعلی. page همیشه می‌افتد: با عوض‌شدنِ فیلتر، صفحه‌ی ۵ بی‌معناست. */
  const buildHref = useCallback(
    (patch: ImageListHrefPatch) =>
      imageListHref({
        q: q.trim(),
        category: filters.category,
        missing: filters.missing,
        sort: filters.sort,
        ...patch,
        page: null,
      }),
    [q, filters.category, filters.missing, filters.sort]
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const next = q.trim();
      // فیلدِ خالی و جستجوی خالی → کاری برای انجام نیست؛ فقط فوکوس برمی‌گردد.
      if (!next && !filters.q) {
        inputRef.current?.focus();
        return;
      }
      router.push(buildHref({ q: next }));
    },
    [router, buildHref, q, filters.q]
  );

  return (
    <div className="flex flex-col gap-3">
      <form
        // action و method برای مسیرِ بدونِ جاوااسکریپت لازم‌اند و نباید حذف شوند.
        action={ADMIN_IMAGES_PATH}
        method="get"
        onSubmit={onSubmit}
        role="search"
        className="flex flex-col gap-3 lg:flex-row lg:items-end"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="admin-image-search" className="text-[11.5px] font-bold text-muted">
            جستجو
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint"
            >
              <Search size={15} />
            </span>
            <input
              ref={inputRef}
              id="admin-image-search"
              name="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              placeholder="عنوان، متنِ پرامپت، یا نامِ دسته"
              className={`${inputClass} ps-9`}
            />
          </div>
        </div>

        <FilterSelect
          key={`category-${signature}`}
          id="admin-image-category"
          label="دسته‌بندی"
          name="category"
          defaultValue={filters.category ?? ""}
          emptyLabel="همه‌ی دسته‌ها"
          onPick={(value) => router.push(buildHref({ category: value || null }))}
          options={categories.map((c) => ({
            value: c.slug,
            label: `${c.name_fa} (${c.image_count})`,
          }))}
        />

        <FilterSelect
          key={`missing-${signature}`}
          id="admin-image-missing"
          label="کارِ ناتمام"
          name="missing"
          defaultValue={filters.missing ?? ""}
          emptyLabel="بدونِ محدودیت"
          onPick={(value) =>
            router.push(buildHref({ missing: (value || null) as MissingField | null }))
          }
          options={MISSING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        <FilterSelect
          key={`sort-${signature}`}
          id="admin-image-sort"
          label="ترتیب"
          name="sort"
          defaultValue={filters.sort}
          onPick={(value) => router.push(buildHref({ sort: (value as ImageListSort) || DEFAULT_SORT }))}
          options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />

        {/*
          ⚠️ این دکمه فقط ظاهراً زائد است. با جاوااسکریپت، انتخابِ هر <select>
          بی‌درنگ ناوبری می‌کند و کاربر هیچ‌وقت لازمش ندارد؛ بدونِ جاوااسکریپت،
          تنها راهِ اعمالِ فیلتر همین است. پس sr-only نمی‌شود و حذف هم نمی‌شود —
          فقط ظاهرش خنثی است.
        */}
        <button
          type="submit"
          className="shrink-0 rounded-pill border border-line bg-canvas px-4 py-2.5 text-[12px] font-bold text-muted transition-colors hover:border-accent-line hover:text-ink"
        >
          اعمال
        </button>
      </form>

      {hasActiveFilter(filters) ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-faint-label">فیلترِ فعال:</span>

          {filters.q ? (
            <FilterChip label={`«${filters.q}»`} href={buildHref({ q: "" })} />
          ) : null}

          {filters.category ? (
            <FilterChip
              label={
                categories.find((c) => c.slug === filters.category)?.name_fa ?? filters.category
              }
              href={buildHref({ category: null })}
            />
          ) : null}

          {filters.missing ? (
            <FilterChip
              label={
                MISSING_OPTIONS.find((o) => o.value === filters.missing)?.label ?? filters.missing
              }
              href={buildHref({ missing: null })}
            />
          ) : null}

          <Link
            href={ADMIN_IMAGES_PATH}
            className="text-[11px] font-bold text-accent hover:text-accent-strong"
          >
            پاک‌کردنِ همه
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/**
 * یک <select> فیلتر.
 *
 * name دارد تا در ارسالِ بومیِ فرم (بی‌جاوااسکریپت) هم شمرده شود، و onChange دارد
 * تا با جاوااسکریپت بی‌درنگ اعمال شود. فلشِ سمتِ چپ دستی کشیده شده چون
 * appearance-none فلشِ بومی را برمی‌دارد — و بومی‌اش در RTL سمتِ اشتباه می‌نشیند.
 */
function FilterSelect({
  id,
  label,
  name,
  defaultValue,
  emptyLabel,
  options,
  onPick,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue: string;
  /** اگر داده شود، گزینه‌ی «همه» با مقدارِ خالی بالای فهرست می‌آید. */
  emptyLabel?: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 lg:w-44">
      <label htmlFor={id} className="text-[11.5px] font-bold text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          onChange={(e) => onPick(e.target.value)}
          className={selectClass}
        >
          {emptyLabel ? <option value="">{emptyLabel}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-faint"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/**
 * چیپِ «این فیلتر فعال است، برای برداشتنش کلیک کن».
 *
 * لینک است و نه دکمه: مقصدِ واقعی دارد، در تبِ جدید باز می‌شود، و بی‌جاوااسکریپت
 * هم کار می‌کند.
 */
function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent-line"
    >
      <span className="max-w-40 truncate">{label}</span>
      <span aria-hidden>
        <X size={11} />
      </span>
      <span className="sr-only">— برداشتنِ این فیلتر</span>
    </Link>
  );
}
