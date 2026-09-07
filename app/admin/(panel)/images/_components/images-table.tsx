"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AlertTriangle, ImageIcon, Pencil, Trash } from "@/app/_components/ui/Icons";
import { btnDanger, btnGhost, btnSoft } from "@/app/_components/admin/AdminUi";
import { selectClass } from "@/app/_components/admin/AdminForm";
import { bulkImagesAction } from "@/app/admin/_actions/images";
import { ADMIN_IMAGES_PATH } from "@/lib/admin/image-list";

/**
 * فهرستِ تصاویر با انتخابِ چندتایی و عملیاتِ گروهی.
 *
 * ── چرا <ul> و نه <table> ──
 * محتوای هر ردیف یک رکوردِ چندبخشی است (تصویر، عنوان، نشانی، چکیده‌ی پرامپت،
 * برچسب‌ها، تاریخ‌ها) و روی موبایل باید بشکند و بپیچد. با <table> تنها راهِ
 * واکنشی‌شدن، رندرِ *دوباره‌ی* همان داده به‌شکلِ کارت است — یعنی دو <img> برای هر
 * ردیف و دو برابر شدنِ درخواست‌های تصویر. فهرستی از رکوردها هم صادقانه‌تر است:
 * این داده ستون‌های قابلِ‌مقایسه‌ی عددی ندارد که جدول برایش ساخته شده باشد.
 *
 * ── چرا یک فرم دورِ کلِ فهرست ──
 * چک‌باکس‌ها name="ids" دارند و دکمه‌های عملیات name="op". یعنی خودِ HTML می‌گوید
 * «کدام ردیف‌ها» و «کدام عملیات»، بی هیچ حالتِ کلاینتی برای نگه‌داشتنِ انتخاب.
 * حالتِ کلاینتیِ selected فقط برای *نشان‌دادنِ* شمار و تیکِ «همه» است؛ اگر
 * جاوااسکریپت نباشد، چک‌باکس‌ها و دکمه‌ها همچنان کار می‌کنند.
 *
 * ⚠️ تأییدِ حذف با <details> ساخته شده و نه با دیالوگِ کلاینتی. دلیلش دقیقاً
 *    همین است: دیالوگِ کلاینتی بی‌جاوااسکریپت باز نمی‌شود، و آن حالت یعنی یا
 *    حذفِ بی‌تأیید یا حذفِ ناممکن. <details> بومی است، بی‌جاوااسکریپت باز می‌شود،
 *    و برای اسکرین‌ریدر هم یک دکمه‌ی آشکارساز است. پس دو مرحله‌بودنِ حذف در همه‌ی
 *    حالت‌ها تضمین می‌شود.
 */

/**
 * ردیف، آماده‌ی نمایش.
 *
 * ⚠️ همه‌ی تاریخ‌ها و عددها *قبل از* رسیدن به اینجا رشته شده‌اند. این کامپوننت
 *    کلاینتی است و اگر خودش Intl را صدا بزند، منطقه‌ی زمانیِ مرورگر با سرور یکی
 *    نیست و HTMLِ دو طرف نمی‌خواند → خطای هیدریت. قالب‌بندی کارِ سرور است.
 */
export type ImageRowView = {
  id: string;
  url: string;
  title: string | null;
  modelUsed: string | null;
  /** «۱۲۰۰ × ۸۰۰» یا null اگر ثبت نشده. */
  dimensions: string | null;
  /** برای next/image؛ null یعنی نسبت‌تصویرِ پیش‌فرض. */
  width: number | null;
  height: number | null;
  likes: string;
  createdAt: string;
  /** null یعنی از زمانِ مهاجرت ویرایش نشده. */
  updatedAt: string | null;
  promptExcerpt: string | null;
  /** طولِ کلِ پرامپت، قالب‌بندی‌شده. null یعنی پرامپتی نیست. */
  promptLength: string | null;
  categories: { id: string; name_fa: string }[];
};

export function ImagesTable({
  rows,
  categories,
  backHref,
}: {
  rows: ImageRowView[];
  /** گزینه‌های عملیاتِ گروهیِ دسته. */
  categories: { id: string; name_fa: string }[];
  /** آدرسِ همین فهرست با همین فیلترها — اکشن بعد از کار به همین‌جا برمی‌گردد. */
  backHref: string;
}) {
  /**
   * انتخاب با عوض‌شدنِ صفحه پاک می‌شود.
   *
   * ⚠️ این پاک‌سازی لازم است و تزئینی نیست: بدونِ آن، مدیر در صفحه‌ی ۱ سه ردیف
   *    تیک می‌زد، به صفحه‌ی ۲ می‌رفت و شمارنده هنوز «۳ مورد» می‌گفت، در حالی که
   *    آن سه چک‌باکس دیگر در DOM نیستند و در ارسالِ فرم هم نمی‌آیند. یعنی عددِ
   *    روی صفحه با کاری که واقعاً انجام می‌شد نمی‌خواند.
   *
   * کلید از شناسه‌های ردیف ساخته می‌شود و نه از شماره‌ی صفحه: حذفِ گروهی هم
   * ردیف‌ها را عوض می‌کند بی‌آنکه صفحه عوض شود.
   */
  const rowKey = rows.map((r) => r.id).join(",");
  const [lastRowKey, setLastRowKey] = useState(rowKey);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());

  if (rowKey !== lastRowKey) {
    setLastRowKey(rowKey);
    setSelected(new Set<string>());
  }

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set<string>());
    },
    [rows]
  );

  const count = selected.size;
  const allSelected = rows.length > 0 && count === rows.length;

  return (
    <form action={bulkImagesAction} className="flex flex-col">
      {/* مقصدِ بازگشت. در اکشن هم دوباره اعتبارسنجی می‌شود، چون ورودیِ فرم است. */}
      <input type="hidden" name="back" value={backHref} />

      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-[11.5px] font-bold text-muted">
          {/*
            ⚠️ این چک‌باکس name ندارد و نباید بگیرد: با name، مقدارش هم به‌عنوان
            یک id به سرور می‌رفت و اکشن یک شناسه‌ی بی‌معنی می‌دید.

            حالتِ indeterminate عمداً پیاده نشده — ری‌اکت پراپی برایش ندارد و
            ست‌کردنش نیازِ useEffect و دست‌بردن در DOM دارد. به‌جایش خودِ برچسب
            شمار را می‌گوید، که برای اسکرین‌ریدر هم روشن‌تر از یک حالتِ سوم است.
          */}
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            className="size-4 cursor-pointer accent-accent"
          />
          {count > 0 ? `${count} مورد انتخاب شده` : "انتخابِ همه‌ی این صفحه"}
        </label>

        <span className="text-[11px] text-faint">{rows.length} ردیف در این صفحه</span>
      </div>

      {/* نوارِ عملیاتِ گروهی — همیشه در DOM است، حتی بی‌انتخاب. اگر شرطی می‌شد،
          در حالتِ بی‌جاوااسکریپت (که count همیشه صفر می‌ماند) هیچ‌وقت دیده نمی‌شد
          و عملیاتِ گروهی از دسترس خارج بود. */}
      <BulkBar categories={categories} count={count} />

      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <Row
            key={row.id}
            row={row}
            checked={selected.has(row.id)}
            onToggle={(checked) => toggle(row.id, checked)}
          />
        ))}
      </ul>
    </form>
  );
}

/**
 * نوارِ عملیاتِ گروهی.
 *
 * سه دکمه، همه submit، هر کدام با name="op" و مقدارِ خودش. مرورگر فقط مقدارِ
 * دکمه‌ای را می‌فرستد که زده شده — یعنی «کدام عملیات» بی هیچ state و بی هیچ
 * onClick منتقل می‌شود.
 */
function BulkBar({
  categories,
  count,
}: {
  categories: { id: string; name_fa: string }[];
  count: number;
}) {
  const idle = count === 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-2.5 border-b border-line bg-surface px-4 py-3 transition-opacity ${
        idle ? "opacity-60" : ""
      }`}
    >
      <span className="text-[11px] font-bold text-faint-label">عملیاتِ گروهی:</span>

      {categories.length > 0 ? (
        <>
          <label htmlFor="bulk-category" className="sr-only">
            دسته‌بندیِ عملیاتِ گروهی
          </label>
          <select
            id="bulk-category"
            name="category_id"
            defaultValue={categories[0].id}
            className={`${selectClass} w-auto min-w-40 py-1.5 text-[11.5px]`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_fa}
              </option>
            ))}
          </select>

          <button type="submit" name="op" value="add-category" className={`${btnSoft} py-1.5`}>
            افزودن به دسته
          </button>
          <button type="submit" name="op" value="remove-category" className={`${btnGhost} py-1.5`}>
            برداشتن از دسته
          </button>
        </>
      ) : (
        <span className="text-[11px] text-faint">
          هنوز دسته‌ای ساخته نشده، پس عملیاتِ دسته‌ای در دسترس نیست.
        </span>
      )}

      {/* تأییدِ دو‌مرحله‌ای، بومی و بی‌جاوااسکریپت. */}
      <details className="ms-auto">
        <summary
          className={`${btnDanger} cursor-pointer list-none py-1.5 marker:content-none`}
          // فلشِ پیش‌فرضِ summary در وبکیت با list-none نمی‌رود؛ این کلاسِ دلخواه
          // در globals.css نیست، پس دو راه پوشش داده شده تا در هر مرورگری تمیز
          // دیده شود.
        >
          <Trash size={13} />
          حذفِ انتخاب‌شده‌ها
        </summary>
        <div className="mt-2 flex flex-col gap-2 rounded-plate border border-alert/30 bg-alert-wash p-3">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-alert">
            <span className="mt-px shrink-0" aria-hidden>
              <AlertTriangle size={13} />
            </span>
            <span>
              {count > 0
                ? `${count} تصویر و متنِ پرامپتشان برای همیشه حذف می‌شوند. این کار برگشت‌پذیر نیست.`
                : "اول ردیف‌هایی را که می‌خواهی حذف شوند تیک بزن."}
            </span>
          </p>
          <button
            type="submit"
            name="op"
            value="delete"
            className={`${btnDanger} self-start bg-alert text-white hover:bg-alert`}
          >
            بله، حذف کن
          </button>
        </div>
      </details>
    </div>
  );
}

/** یک ردیفِ فهرست. */
function Row({
  row,
  checked,
  onToggle,
}: {
  row: ImageRowView;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const editHref = `${ADMIN_IMAGES_PATH}/${row.id}`;
  const title = row.title ?? "بی‌عنوان";

  return (
    <li className={`flex gap-3 px-4 py-3.5 transition-colors ${checked ? "bg-accent-soft/40" : ""}`}>
      <div className="flex shrink-0 items-start pt-1">
        <input
          type="checkbox"
          name="ids"
          value={row.id}
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-4 cursor-pointer accent-accent"
          aria-label={`انتخابِ «${title}»`}
        />
      </div>

      {/* بندانگشتی. لینک است تا کلِ سطحش راهِ رسیدن به ویرایش باشد. */}
      <Link
        href={editHref}
        tabIndex={-1}
        aria-hidden
        className="relative size-16 shrink-0 overflow-hidden rounded-plate border border-line bg-surface-image sm:size-20"
      >
        {/*
          ⚠️ همان <Image> و همان src که گالریِ عمومی استفاده می‌کند — بی هیچ
          نرمال‌سازی و بی unoptimized. شکلِ url در دیتابیس قراردادِ سایتِ عمومی
          است و دست‌زدن به آن اینجا یعنی ریسکِ شکستنِ گالری بی هیچ سودی.
        */}
        <Image
          src={row.url}
          alt=""
          width={row.width ?? 160}
          height={row.height ?? 160}
          sizes="80px"
          className="size-full object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link
            href={editHref}
            className={`truncate text-[13px] font-extrabold hover:text-accent ${
              row.title ? "text-ink-title" : "text-faint italic"
            }`}
          >
            {title}
          </Link>
          {row.modelUsed ? (
            <span dir="ltr" className="font-mono text-[10.5px] text-faint">
              {row.modelUsed}
            </span>
          ) : null}
        </div>

        {/* نشانی: همیشه LTR و مونو — قاعده‌ی ثابتِ محتوای ماشین‌خوان در کلِ سایت. */}
        <p dir="ltr" className="truncate text-left font-mono text-[10.5px] text-ink-code">
          {row.url}
        </p>

        {row.promptExcerpt ? (
          <p dir="ltr" className="line-clamp-2 text-left font-mono text-[11px] leading-relaxed text-muted">
            {row.promptExcerpt}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-alert">
            <span aria-hidden>
              <AlertTriangle size={12} />
            </span>
            پرامپتی ثبت نشده
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {row.categories.length > 0 ? (
            row.categories.map((c) => (
              <span
                key={c.id}
                className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent"
              >
                {c.name_fa}
              </span>
            ))
          ) : (
            <span className="rounded-pill bg-alert-wash px-2 py-0.5 text-[10px] font-bold text-alert">
              بی‌دسته
            </span>
          )}
        </div>

        <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-faint">
          <Meta label="افزوده" value={row.createdAt} />
          <Meta label="ویرایش" value={row.updatedAt ?? "—"} />
          <Meta label="ابعاد" value={row.dimensions ?? "ثبت نشده"} />
          <Meta label="لایک" value={row.likes} />
          {row.promptLength ? <Meta label="طولِ پرامپت" value={row.promptLength} /> : null}
        </dl>
      </div>

      <div className="flex shrink-0 items-start pt-0.5">
        <Link href={editHref} className={`${btnGhost} py-1.5`}>
          <Pencil size={13} />
          <span className="hidden sm:inline">ویرایش</span>
        </Link>
      </div>
    </li>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1">
      <dt className="text-faint-label">{label}:</dt>
      <dd className="tabular-nums">{value}</dd>
    </span>
  );
}

/** آیکنِ خالیِ فهرست — از همین فایل صادر می‌شود تا صفحه یک import کمتر داشته باشد. */
export { ImageIcon as ImagesEmptyIcon };
