"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/lib/gallery";

/**
 * گرید تعاملی گالری + مودال جزئیات + دکمه کپی پرامپت. (کامپوننت کلاینتی)
 *
 * ⚠️ TODO — قبل از لانچ عمومی: route اختصاصی برای هر تصویر اضافه شود.
 * الان مودال کاملاً کلاینتی است (MVP): URL عوض نمی‌شود، پس لینکِ یک پرامپت
 * قابل‌اشتراک نیست، صفحه‌ی سئوی مستقل ندارد، و متن پرامپت همراه کل لیست eager
 * لود می‌شود. مسیر درست پیش از انتشار عمومی: /image/[id] با intercepting/parallel
 * routes — هم مودال از داخل گرید، هم صفحه‌ی واقعیِ قابل‌اشتراک/سئو، و lazy شدن
 * لود پرامپت. (طبق تصمیم ۲۰۲۶-۰۸-۱۶ عمداً برای MVP ساده نگه داشته شده.)
 */

const numFa = new Intl.NumberFormat("fa-IR");

/** آیتم گرید: همان GalleryImage به‌همراه ابعادی که سمت سرور از فایل خوانده شده. */
export type GalleryGridItem = GalleryImage & { width: number; height: number };

export function GalleryGrid({ items }: { items: GalleryGridItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((it) => it.id === openId) ?? null;

  return (
    <>
      <section className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {items.map((img, idx) => (
          <article
            key={img.id}
            className="relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* دکمه‌ی شفافِ روی کل کارت: کلیک‌پذیری + دسترسی با کیبورد، بدون
                گذاشتن عناصر بلوکی داخل <button> (که HTML نامعتبر می‌شد). */}
            <button
              type="button"
              onClick={() => setOpenId(img.id)}
              aria-label={`دیدن پرامپت${img.title_fa ? `: ${img.title_fa}` : ""}`}
              className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />

            <div className="relative">
              <Image
                src={img.url}
                alt={img.title_fa ?? "تصویر ساخته‌شده با هوش مصنوعی"}
                width={img.width}
                height={img.height}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={idx < 3}
                className="h-auto w-full"
              />

              {img.categories.length > 0 ? (
                <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
                  {img.categories.map((c) => (
                    <span
                      key={c.slug}
                      className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-gray-700 backdrop-blur-sm"
                    >
                      {c.name_fa}
                    </span>
                  ))}
                </div>
              ) : null}

              {img.title_fa ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-3 pt-8">
                  <h2 className="line-clamp-2 text-sm font-medium leading-snug text-white">
                    {img.title_fa}
                  </h2>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2">
              {img.model_used ? (
                <span dir="ltr" className="truncate font-mono text-[11px] text-gray-400">
                  {img.model_used}
                </span>
              ) : (
                <span />
              )}
              <span className="shrink-0 text-xs text-gray-500">
                <span className="text-indigo-500" aria-hidden>
                  ♥
                </span>{" "}
                {numFa.format(img.likes_count)}
              </span>
            </div>
          </article>
        ))}
      </section>

      {active ? <ImageModal img={active} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

/**
 * مودال جزئیات: عکس بزرگ + عنوان + دسته‌ها + مدل + پرامپتِ قابل‌کپی.
 * Esc و کلیک روی پس‌زمینه می‌بندند؛ اسکرول صفحه هنگام باز بودن قفل می‌شود.
 */
function ImageModal({ img, onClose }: { img: GalleryGridItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // قفل اسکرول پس‌زمینه تا صفحه پشت مودال جابه‌جا نشود.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={img.title_fa ?? "جزئیات تصویر"}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-lg leading-none text-white transition-colors hover:bg-black/65"
        >
          ×
        </button>

        {/* سمت عکس */}
        <div className="flex shrink-0 items-center justify-center bg-gray-50 sm:w-1/2">
          <Image
            src={img.url}
            alt={img.title_fa ?? "تصویر ساخته‌شده با هوش مصنوعی"}
            width={img.width}
            height={img.height}
            sizes="(max-width: 640px) 100vw, 50vw"
            className="max-h-[45vh] w-full object-contain sm:max-h-[90vh]"
          />
        </div>

        {/* سمت جزئیات (اسکرول‌پذیر) */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
          {img.title_fa ? (
            <h2 className="text-lg font-bold leading-snug text-gray-900">{img.title_fa}</h2>
          ) : null}

          {img.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {img.categories.map((c) => (
                <span
                  key={c.slug}
                  className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                >
                  {c.name_fa}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {img.model_used ? (
              <span dir="ltr" className="font-mono">
                {img.model_used}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <span className="text-indigo-500" aria-hidden>
                ♥
              </span>
              {numFa.format(img.likes_count)}
            </span>
          </div>

          {/* پرامپت — قلب محصول: LTR، مونواسپیس، با دکمه‌ی کپی */}
          {img.prompt_text ? (
            <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">پرامپت</span>
                <CopyButton text={img.prompt_text} />
              </div>
              <p
                dir="ltr"
                className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-left font-mono text-[13px] leading-relaxed text-gray-800"
              >
                {img.prompt_text}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400">پرامپتی برای این تصویر ثبت نشده.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** دکمه‌ی کپی پرامپت با بازخورد «کپی شد» و fallback برای مرورگر/بستر ناامن. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // بستر ناامن (http) یا مرورگر قدیمی: fallback با textarea موقت.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // اگر کپی نشد بی‌سر و صدا بگذر؛ کاربر می‌تواند دستی انتخاب/کپی کند.
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
        copied ? "bg-green-100 text-green-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
      }`}
    >
      {copied ? "کپی شد ✓" : "کپی پرامپت"}
    </button>
  );
}
