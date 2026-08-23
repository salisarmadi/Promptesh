"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { galleryHref } from "@/lib/urls";
import { Search, X, ArrowLeft } from "./icons";

/**
 * جستجوی گالری — ظاهرِ ماک، معماریِ خودمان.
 *
 * چرا حالتِ جستجو در URL است و نه در state: نتیجه‌ی جستجو چیزی است که کاربر
 * می‌خواهد بفرستد یا بوکمارک کند، و دکمه‌ی بازگشتِ مرورگر باید کار کند. ماک این
 * را در state نگه داشته بود و عبارتِ جستجو را هنگام رفتن به گالری کامل دور
 * می‌ریخت — یعنی جستجویش در عمل هیچ کاری نمی‌کرد. آن بخش عوض نشد.
 *
 * چرا هم <form method="get"> و هم router.push: «بهسازیِ تدریجی» —
 *   • بدون جاواسکریپت، فرم به‌صورت بومی به /?q=… می‌رود و جستجو کار می‌کند.
 *   • با جاواسکریپت، preventDefault می‌کنیم و انتقالِ سمتِ کلاینت می‌شود که کلِ
 *     سند را دوباره دانلود نمی‌کند (مهم روی اتصالِ کند).
 * حذفِ هرکدام یکی از این دو را از دست می‌دهد.
 *
 * چرا قالبِ خودِ فیلد با CSS انیمیت می‌شود و نه با motion: تغییرِ حاشیه و سایه
 * فقط به فوکوس بستگی دارد، و focus-within در CSS همان کار را بی هیچ
 * جاوااسکریپتی می‌کند — پس روی سرور هم درست رندر می‌شود و توکن‌های
 * --shadow-field را هم می‌تواند بخواند (motion نمی‌تواند). motion فقط برای دو
 * چیزی مانده که CSS نمی‌تواند: چرخشِ متنِ راهنما و بازشدنِ ارتفاعِ چیپ‌ها.
 */

/**
 * واژه‌های پرتکرارِ خودِ پرامپت‌ها، مرتب بر اساس فراوانی در محتوای واقعی.
 *
 * این‌ها حدس نیستند؛ روی ۷۰۰ پرامپت شمرده شده‌اند (portrait ۳۷۱،
 * cinematic ۳۳۴، editorial ۲۴۱، minimal ۱۸۷، 85mm ۱۷۵، film grain ۹۹،
 * bokeh ۹۹، golden hour ۶۵). دلیلِ شمردن: چیپِ پیشنهادی که به نتیجه‌ی خالی
 * برسد بدتر از نبودنش است — کاربر فکر می‌کند جستجو خراب است. در ماک دو تا از
 * پنج چیپِ پیشنهادی به هیچ داده‌ای وصل نبودند.
 *
 * کارِ دومشان آموزش است: کاربرِ تازه نمی‌داند پرامپت با چه واژگانی نوشته می‌شود.
 */
const VOCAB = [
  "portrait",
  "cinematic",
  "editorial",
  "minimal",
  "85mm",
  "film grain",
  "bokeh",
  "golden hour",
] as const;

/**
 * متنِ راهنمای چرخان.
 *
 * برخلافِ ماک، این‌ها عبارت‌های ساختگی نیستند بلکه جستجوهایی‌اند که واقعاً
 * نتیجه می‌دهند: دو نامِ دسته (فارسی) و سه واژه‌ی پرتکرارِ پرامپت (انگلیسی).
 * راهنمایی که اگر عیناً تایپ شود صفر نتیجه بدهد، همان تلهٔ چیپ‌های ماک است.
 * درهم‌بودنِ دو خط عمدی است: به کاربر می‌گوید هر دو زبان کار می‌کند.
 */
const HINTS = ["پرتره", "cinematic", "کاپل", "golden hour", "85mm"] as const;

const HINT_MS = 2600;

/**
 * «آیا هیدریت شده‌ایم؟» بدونِ setState در effect.
 *
 * useSyncExternalStore روی سرور snapshotِ سوم را می‌خواند (false) و روی کلاینت
 * دومی را (true)، پس همان نتیجه‌ی «mounted» را می‌دهد بی‌آنکه رندرِ دوم را از
 * داخلِ effect راه بیندازد. راهِ قبلی (useEffect(() => setMounted(true), []))
 * همان کار را می‌کرد ولی لینتِ کامپایلرِ ری‌اکت درست می‌گیردش: setState در بدنه‌ی
 * effect یعنی یک رندرِ آبشاری.
 *
 * هر سه تابع باید در سطحِ مدول باشند تا در هر رندر یکی بمانند؛ اگر داخلِ
 * کامپوننت تعریف شوند، subscribe تازه در هر رندر باعثِ اشتراکِ دوباره می‌شود.
 */
const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function PromptSearch({
  query,
  category,
}: {
  /** عبارتِ جستجوی فعال (از URL). */
  query: string;
  /** دسته‌ی فعال — باید هنگام جستجو حفظ شود. */
  category: string | null;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(query);
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState(0);
  /**
   * تا وقتی هیدریت نشده‌ایم، فیلد placeholderِ واقعیِ HTML را دارد؛ بعدش
   * لایه‌ی متحرک جایش را می‌گیرد. متنِ هر دو یکی است (HINTS[0]) پس در لحظه‌ی
   * تعویض هیچ پرشی دیده نمی‌شود، و کاربرِ بی‌جاوااسکریپت فیلدِ خالیِ بی‌راهنما
   * نمی‌بیند.
   */
  const mounted = useSyncExternalStore(subscribeNever, onClient, onServer);

  /**
   * عبارتِ URL که از بیرون عوض شد (کلیک روی چیپ، دکمه‌ی بازگشتِ مرورگر) باید در
   * فیلد هم بنشیند، وگرنه فیلد و آدرسِ صفحه دو چیزِ متفاوت می‌گویند.
   *
   * این هم‌ترازی عمداً در خودِ رندر انجام می‌شود و نه در effect: ری‌اکت وقتی در
   * جریانِ رندر setState ببیند، بی‌درنگ و پیش از کشیدن روی صفحه رندر را از نو
   * اجرا می‌کند، پس هیچ فریمی با مقدارِ کهنه دیده نمی‌شود. راهِ effect یک رندرِ
   * اضافه بعد از paint می‌ساخت — همان چیزی که لینتِ کامپایلر می‌گیردش.
   *
   * چرا به‌جایش key={query} روی کامپوننت نگذاشتیم: آن، کامپوننت را از نو mount
   * می‌کرد و با هر کلیک روی چیپ، فوکوسِ فیلد و ردیفِ بازِ چیپ‌ها از دست می‌رفت؛
   * یعنی کاربر نمی‌توانست دو واژه را پشتِ هم امتحان کند.
   */
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setValue(query);
  }

  // چرخشِ راهنما فقط وقتی فیلد بی‌کار است.
  useEffect(() => {
    if (reduced || focused || value) return;
    const id = window.setInterval(() => setHint((h) => (h + 1) % HINTS.length), HINT_MS);
    return () => window.clearInterval(id);
  }, [reduced, focused, value]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const next = value.trim();
      // فیلدِ خالی → به‌جای رفتن به آدرسِ بی‌معنا، فوکوس برمی‌گردد به فیلد.
      if (!next && !query) {
        inputRef.current?.focus();
        return;
      }
      router.push(galleryHref({ category, q: next }), { scroll: false });
    },
    [router, category, value, query],
  );

  const clear = () => {
    setValue("");
    inputRef.current?.focus();
    // اگر جستجو واقعاً اعمال شده بود، پاک‌کردنِ متن بدونِ پاک‌کردنِ نتیجه
    // گیج‌کننده است: فیلد خالی می‌شد ولی گرید هنوز فیلتر بود.
    if (query) router.push(galleryHref({ category }), { scroll: false });
  };

  const chipsOpen = focused || value.length > 0;

  return (
    <form onSubmit={onSubmit} action="/" method="get" role="search">
      {/* دسته‌ی فعال در مسیرِ بدون‌جاواسکریپت هم باید همراه فرم برود. */}
      {category ? <input type="hidden" name="category" value={category} /> : null}

      <label htmlFor="gallery-search" className="sr-only">
        جستجو در پرامپت‌ها
      </label>

      <div className="group flex h-[52px] items-center overflow-hidden rounded-field border border-accent-line bg-canvas shadow-field transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:shadow-field-focus">
        <span className="flex shrink-0 pe-1 ps-4 text-faint transition-[color,transform] duration-200 group-focus-within:scale-[1.08] group-focus-within:text-accent">
          <Search size={16} />
        </span>

        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id="gallery-search"
            name="q"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={mounted ? undefined : HINTS[0]}
            autoComplete="off"
            className="w-full bg-transparent py-3.5 text-[13px] leading-[19.5px] text-ink placeholder:text-faint focus:outline-none"
          />
          {mounted && !value ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={focused ? "focused" : hint}
                  className="whitespace-nowrap text-[13px] leading-[19.5px] text-faint"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.24 }}
                >
                  {focused ? "چه تصویری در ذهنت داری؟" : HINTS[hint]}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        {value ? (
          /* type="reset" یعنی بدونِ جاواسکریپت هم فیلد را پاک می‌کند. */
          <button
            type="reset"
            onClick={clear}
            aria-label="پاک کردن جستجو"
            className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-line text-muted transition-colors hover:text-ink"
          >
            <X size={12} />
          </button>
        ) : null}

        <div className="shrink-0 pe-1.5 ps-1">
          <button
            type="submit"
            aria-label="جستجو"
            className={`flex size-[38px] items-center justify-center rounded-[20px] transition-colors active:scale-95 ${
              value ? "bg-accent text-white" : "bg-accent-soft text-accent"
            }`}
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      {/* ردیفِ واژگان — با درگیرشدنِ فیلد باز می‌شود.
          لینک‌اند و نه دکمه: بدونِ جاوااسکریپت هم مقصد دارند، و کاربر می‌تواند
          در تبِ جدید بازشان کند. */}
      <AnimatePresence initial={false}>
        {chipsOpen ? (
          <motion.div
            key="chips"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex flex-wrap gap-2 pt-3">
              {VOCAB.map((term, i) => (
                <motion.span
                  key={term}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.04 * i, duration: 0.2 }}
                >
                  <Link
                    href={galleryHref({ category, q: term })}
                    scroll={false}
                    dir="ltr"
                    /* جلوگیری از blurِ فیلد پیش از رسیدنِ کلیک — بدون این، ردیفِ
                       چیپ‌ها بسته می‌شد و کلیک به هوا می‌رفت. */
                    onMouseDown={(e) => e.preventDefault()}
                    className={`flex items-center rounded-full px-3 py-1.5 font-mono text-[11px] transition-transform active:scale-95 ${
                      query.trim().toLowerCase() === term
                        ? "bg-accent text-white"
                        : "bg-accent-soft text-accent"
                    }`}
                  >
                    {term}
                  </Link>
                </motion.span>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
