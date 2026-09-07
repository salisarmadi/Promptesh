"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { HeroDeck } from "@/lib/gallery";
import { galleryHref, imageHref } from "@/lib/urls";

/**
 * ریلِ دسته‌بندی + «دستِ کارت»های بالای صفحه.
 *
 * این همان چیزی است که جای HeroSpecimenِ ساکن را گرفت. تزِ بخش عوض نشده —
 * بالای صفحه باید خودِ معامله را نشان بدهد، نه توصیفش را — ولی شکلش عوض شده:
 * جای یک نمونه‌ی ثابت، یک دستِ کارت که به‌تنهایی می‌گوید «اینجا خیلی عکس هست،
 * دسته‌بندی‌شده، و هرکدام پرامپتش رویش است».
 *
 * ⚠️ چرا رنگ‌ها اینجا hex خام‌اند و نه var(--color-*): چون motion برای
 * میان‌یابیِ رنگ و سایه به مقدارِ واقعی احتیاج دارد و رشته‌ی var() را نمی‌تواند
 * میان‌یابی کند — آن را یک رشته‌ی مبهم می‌بیند و پرش می‌کند، بی هیچ خطایی.
 * پس هر مقداری که داخلِ animate می‌رود، باید همین‌جا صریح باشد. برای اینکه دو
 * منبعِ حقیقت نداشته باشیم، توکن‌های متناظرِ استفاده‌نشده از globals.css حذف
 * شده‌اند و اینجا تنها جای تعریفشان است.
 */

/** رنگ‌های موردِ نیازِ animate — هم‌ارزِ --color-accent و --color-faint-label. */
const ACCENT = "#2563EB";
const FAINT_LABEL = "#A1A1AF";
const DOT_IDLE = "#989898";

/** سایه‌های موردِ نیازِ animate. */
const SHADOW = {
  cardFront:
    "0px 21.767px 48.977px -10.884px rgba(60,48,160,0.32), 0px 5.442px 14.512px 0px rgba(17,16,40,0.08)",
  cardBack: "0px 10.231px 22.167px -8.526px rgba(60,48,160,0.20)",
  thumb: "0px 2px 6px 0px rgba(17,16,40,0.06)",
  thumbActive: "0px 10.6px 23.32px -8.48px rgba(0,19,47,0.55)",
} as const;

/**
 * جایگاهِ بصریِ هر کارت در دست. اندیسِ ۰ کارتِ رو است.
 *
 * جایگاهِ آخر opacity صفر دارد: کارتی است که دارد از دست بیرون می‌رود. به همین
 * دلیل تعدادِ جایگاه‌ها با HERO_CARDS_PER_DECK (چهار) یکی است — با کمتر، آخرین
 * کارت ناگهان ناپدید می‌شد؛ با بیشتر، جایگاهی می‌ماند که هیچ‌وقت پر نمی‌شود.
 */
const SLOTS = [
  { y: 0, x: 0, scale: 1, rot: 0, opacity: 1, blur: 0 },
  { y: -14, x: 13, scale: 0.94, rot: 3, opacity: 0.9, blur: 0.8 },
  { y: -25, x: 24, scale: 0.88, rot: 6, opacity: 0.6, blur: 2 },
  { y: -33, x: 32, scale: 0.83, rot: 8.5, opacity: 0, blur: 3 },
];

const SPRING = { type: "spring" as const, stiffness: 250, damping: 28, mass: 0.9 };
const STILL = { duration: 0 } as const;

/** فاصله‌ی زمانیِ چرخشِ خودکارِ دست. */
const AUTO_ADVANCE_MS = 4400;

/** کشیدنِ کمتر از این مقدار، کارت را جابه‌جا نمی‌کند و برمی‌گرداند. */
const SWIPE_PX = 55;

/**
 * جابه‌جاییِ بیشتر از این مقدار میانِ pointerdown و click یعنی «کشید»، نه «زد».
 *
 * چرا لازم است: کارتِ رو هم لینک است (به صفحه‌ی عکس) و هم قابلِ کشیدن. مرورگر
 * در پایانِ یک کشیدن هم رویدادِ click می‌دهد، پس بی این محافظ هر سویپ به
 * ناوبریِ ناخواسته می‌رسید — یعنی روی موبایل ورق‌زدن عملاً غیرممکن می‌شد.
 *
 * ⚠️ چرا با ref و نه با onDragStart/onDragEnd خودِ motion: ترتیبِ آن دو نسبت به
 * رویدادِ بومیِ click تضمین‌شده نیست، و شرطی که به آن ترتیب تکیه کند در یک
 * نسخه‌ی بعدی بی‌صدا برمی‌گردد. مقایسه‌ی مختصات به هیچ ترتیبی وابسته نیست.
 *
 * ۸ پیکسل: کمی بیشتر از لرزشِ انگشت روی صفحه‌ی لمسی و کمتر از آن‌که یک کشیدنِ
 * واقعی از قلم بیفتد (SWIPE_PX خودش ۵۵ است).
 */
const CLICK_SLOP = 8;

/**
 * اندازه‌ی کارت. در ماک ۱۸۸٫۶۵ بود که ضریبِ مقیاسِ خروجیِ فیگما است؛ به ۱۸۹
 * گرد شد. نسبتش (۰٫۷۸۷) تقریباً همان ۴:۵ محتوای واقعی است.
 */
const CARD = { width: 189, height: 240 };

export function CategoryDeck({ decks }: { decks: HeroDeck[] }) {
  const reduced = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);
  /** جهتِ آخرین جابه‌جایی در ریل — ورود و خروجِ دست از همان سمت انجام می‌شود. */
  const [direction, setDirection] = useState(1);
  /** اندیسِ کارتی که رویِ دست است. */
  const [top, setTop] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  /**
   * مختصاتِ شروعِ فشارِ انگشت/موس روی کارتِ رو.
   *
   * ref و نه state: هیچ رندری به آن وابسته نیست و setState در pointerdown یعنی
   * یک رندرِ اضافه در میانه‌ی هر کشیدن. یک ref برای همه‌ی کارت‌ها کافی است چون
   * کارت‌های پشتی pointerEvents: none دارند، پس هیچ‌وقت دو کارت هم‌زمان زیرِ
   * فشار نیستند.
   */
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const active = decks[activeIdx] ?? decks[0];
  const cards = active?.cards ?? [];
  const count = cards.length;

  const spring = reduced ? STILL : SPRING;

  /**
   * چرخشِ خودکار.
   *
   * top داخلِ فهرستِ وابستگی‌هاست، پس هر جابه‌جاییِ دستی (کشیدن یا کلیک روی
   * نقطه) تایمر را از نو می‌چیند. بدون این، ممکن بود کاربر کارت را بکشد و
   * ۲۰۰ میلی‌ثانیه بعد چرخشِ خودکار دوباره جابه‌جا کند.
   */
  useEffect(() => {
    if (reduced || count < 2) return;
    const id = window.setInterval(() => setTop((t) => (t + 1) % count), AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [reduced, count, top, activeIdx]);

  /**
   * نگه‌داشتنِ دسته‌ی فعال در میانِ ریل.
   *
   * scrollIntoView و نه محاسبه‌ی دستیِ scrollLeft: در ظرفِ RTL مقدارِ scrollLeft
   * منفی است ولی offsetLeft همیشه مثبت، و فرمولِ رایج (offsetLeft − نصفِ عرض)
   * در RTL ریل را به سمتِ اشتباه می‌برد. scrollIntoView جهت را خودش می‌فهمد.
   * block: "nearest" جلوی اسکرولِ عمودیِ صفحه را می‌گیرد.
   */
  useEffect(() => {
    const el = railRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeIdx, reduced]);

  if (!active) return null;

  const selectCategory = (i: number) => {
    if (i === activeIdx) return;
    setDirection(i > activeIdx ? 1 : -1);
    setActiveIdx(i);
    setTop(0);
  };

  const advance = () => setTop((t) => (t + 1) % count);
  const retreat = () => setTop((t) => (t - 1 + count) % count);

  return (
    <section className="pt-1">
      {/* ── ریلِ دسته‌بندی ───────────────────────────────────────── */}
      <div className="flex w-full items-center">
        <div
          ref={railRef}
          className="rail flex min-w-0 flex-1 items-center gap-[9.5px] pb-0.5 ps-5 pt-3"
        >
          {decks.map((deck, i) => {
            const isActive = i === activeIdx;
            const thumb = deck.cards[0];
            return (
              <button
                key={deck.slug}
                type="button"
                onClick={() => selectCategory(i)}
                aria-pressed={isActive}
                className="flex h-[76px] w-[58px] shrink-0 flex-col items-center gap-2"
              >
                <motion.span
                  className="relative block overflow-hidden bg-surface-image"
                  style={{ width: 54, height: 54 }}
                  animate={{
                    scale: isActive ? 1.06 : 1,
                    borderRadius: isActive ? 20.14 : 19,
                    boxShadow: isActive ? SHADOW.thumbActive : SHADOW.thumb,
                  }}
                  transition={reduced ? STILL : { type: "spring", stiffness: 380, damping: 26 }}
                >
                  {thumb ? (
                    <Image
                      src={thumb.url}
                      alt=""
                      width={54}
                      height={54}
                      sizes="54px"
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {/* پرده‌ی روشن روی دسته‌های غیرفعال. با opacity و نه با
                      نمایش/عدم‌نمایش، تا محو شدنش قابلِ انیمیشن باشد. */}
                  <motion.span
                    className="absolute inset-0 block"
                    style={{ background: "rgba(243,242,250,0.5)" }}
                    animate={{ opacity: isActive ? 0 : 1 }}
                    transition={reduced ? STILL : { duration: 0.24 }}
                  />
                  {isActive ? (
                    /* layoutId یعنی حلقه از دسته‌ی قبلی به دسته‌ی جدید «سُر
                       می‌خورد» و در جای جدید ظاهر نمی‌شود. */
                    <motion.span
                      layoutId="cat-ring"
                      className="absolute inset-0 block"
                      style={{ border: `3px solid ${ACCENT}`, borderRadius: 20.14 }}
                      transition={reduced ? STILL : { type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                </motion.span>
                <motion.span
                  className="w-full truncate text-center text-[10px] leading-none"
                  animate={{ color: isActive ? ACCENT : FAINT_LABEL }}
                  transition={reduced ? STILL : { duration: 0.2 }}
                  style={{ fontWeight: isActive ? 700 : 500 }}
                >
                  {deck.name_fa}
                </motion.span>
              </button>
            );
          })}
        </div>

        {/* میان‌بُر به چیپ‌های پایینِ صفحه. order-first یعنی در RTL سمتِ راست
            می‌نشیند، ولی در ترتیبِ DOM بعد از ریل است تا کلید Tab اول ریل را
            بگیرد که کنترلِ اصلیِ این بخش است. */}
        <Link
          href="#gallery"
          className="order-first shrink-0 px-[14px] text-right text-[10px] text-faint-label transition-colors hover:text-accent"
        >
          دسته‌بندی‌ها ←
        </Link>
      </div>

      {/* ── دستِ کارت‌های دسته‌ی فعال ─────────────────────────────── */}
      <div className="relative pb-[9px] pt-[14px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.slug}
            initial={{ opacity: 0, y: 24 * direction, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18 * direction, scale: 0.95 }}
            transition={reduced ? STILL : { type: "spring", stiffness: 290, damping: 28 }}
          >
            <div
              role="group"
              aria-label={`نمونه‌های دسته‌ی ${active.name_fa}`}
              className="relative mx-auto"
              style={{ width: CARD.width, height: CARD.height }}
            >
              {/* هاله‌ی آبیِ پشتِ دست. تزئینِ خالص، پس از درختِ دسترسی بیرون. */}
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                  inset: "18% -22% -14% -22%",
                  background:
                    "radial-gradient(ellipse at 50% 60%, rgba(79,150,232,0.16) 0%, rgba(79,222,232,0) 68%)",
                  filter: "blur(8px)",
                }}
              />

              {cards.map((card, i) => {
                const slot = (i - top + count) % count;
                const s = SLOTS[Math.min(slot, SLOTS.length - 1)];
                const isFront = slot === 0;
                return (
                  <motion.div
                    key={card.id}
                    // کارت‌های پشتی برای صفحه‌خوان وجود ندارند: بخشی از عکس‌شان
                    // پیداست و خواندنشان چیزی به کاربر اضافه نمی‌کند.
                    aria-hidden={!isFront}
                    className="absolute inset-0 overflow-hidden rounded-card bg-surface-image"
                    style={{
                      zIndex: SLOTS.length - Math.min(slot, SLOTS.length - 1),
                      // کارتِ رو حالا همیشه لینک است، حتی وقتی دست یک کارت
                      // دارد؛ پس شرطِ count > 1 برداشته شد.
                      cursor: isFront ? "pointer" : "default",
                      pointerEvents: isFront ? "auto" : "none",
                      // از پایینِ کارت باز می‌شود، مثل ورق‌زدنِ یک دستِ کاغذ.
                      transformOrigin: "50% 100%",
                    }}
                    initial={{
                      opacity: 0,
                      y: 34,
                      scale: 0.9,
                      rotate: s.rot,
                      filter: `blur(${s.blur}px)`,
                    }}
                    animate={{
                      x: s.x,
                      y: s.y,
                      scale: s.scale,
                      rotate: s.rot,
                      opacity: s.opacity,
                      filter: `blur(${s.blur}px)`,
                      boxShadow: isFront ? SHADOW.cardFront : SHADOW.cardBack,
                    }}
                    exit={{ opacity: 0, scale: 0.9, y: -26 }}
                    transition={spring}
                    drag={isFront && count > 1 && !reduced ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    whileTap={isFront && !reduced ? { scale: 0.975 } : undefined}
                    onDragEnd={(_event, info) => {
                      if (info.offset.x < -SWIPE_PX) advance();
                      else if (info.offset.x > SWIPE_PX) retreat();
                    }}
                    /**
                     * مبدأِ فشار برای تشخیصِ «زد» از «کشید» در لینکِ زیر.
                     *
                     * روی خودِ کارت است و نه روی لینک، چون کشیدن می‌تواند از
                     * هر جای کارت شروع شود و رویدادهای فرزند به اینجا حباب
                     * می‌کنند — یعنی یک شنونده برای هر دو کار کافی است.
                     */
                    onPointerDown={(event) => {
                      pointerStart.current = { x: event.clientX, y: event.clientY };
                    }}
                  >
                    <Image
                      src={card.url}
                      alt={card.title_fa ?? active.name_fa}
                      width={CARD.width}
                      height={CARD.height}
                      sizes="(min-width: 768px) 227px, 189px"
                      /* کارتِ رویِ دستِ اولْ بزرگ‌ترین تصویرِ بالای صفحه است و
                         LCP همین است؛ بقیه نباید با آن رقابت کنند. */
                      priority={isFront}
                      draggable={false}
                      className="pointer-events-none h-full w-full select-none object-cover"
                    />
                    {/* خطِ موییِ درونی، تا لبه‌ی کارت روی زمینه‌ی سفید گم نشود. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-card"
                      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)" }}
                    />
                    {isFront ? (
                      /* پرامپت روی خودِ عکس، پشتِ گرادیانِ تیره — نه در «پلاک».
                         aria-hidden است چون متنش بریده است و در این اندازه
                         خواندنی نیست؛ متنِ کامل و دکمه‌ی کپی در گرید پایین است. */
                      <motion.div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 px-[11px] pb-[11px] pt-[43px]"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(10,9,26,0.86) 0%, rgba(10,9,26,0.42) 46%, rgba(10,9,26,0) 100%)",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={reduced ? STILL : { delay: 0.12, duration: 0.28 }}
                      >
                        {card.prompt_excerpt ? (
                          <p
                            dir="ltr"
                            className="mb-[7px] line-clamp-2 font-mono text-[7.7px] leading-[11.5px] text-white/85"
                          >
                            {card.prompt_excerpt}
                          </p>
                        ) : null}
                        {card.model_used ? (
                          <span
                            dir="ltr"
                            className="inline-flex items-center rounded-[12.7px] bg-badge/90 px-[7px] py-[2.7px] font-mono text-[7.3px] leading-[10.9px] text-white/95"
                          >
                            {card.model_used}
                          </span>
                        ) : null}
                      </motion.div>
                    ) : null}

                    {/**
                     * لینکِ شفافِ روی کلِ کارتِ رو — همان الگوی gallery-grid.tsx.
                     *
                     * چرا لینکِ روکش و نه onClick روی خودِ کارت: یک <a>ی واقعی
                     * با کیبورد قابلِ فوکوس است، در تبِ جدید باز می‌شود، و در
                     * منوی راست‌کلیک «کپیِ نشانی» دارد. کارتِ کلیک‌پذیر هیچ‌کدام
                     * را ندارد. لینک هم نمی‌تواند *دورِ* محتوا بپیچد، چون
                     * محتوا عناصرِ بلوکی و یک motion.div دارد و رفتنشان داخلِ
                     * <a> هم HTML نامعتبر می‌ساخت و هم درگیرِ درگِ بومیِ لینک
                     * می‌شد.
                     *
                     * آخرین فرزند + z-10: باید روی گرادیانِ پرامپت هم بیفتد،
                     * وگرنه پایینِ کارت (جایی که چشم اول می‌رود) کلیک‌ناپذیر
                     * می‌ماند.
                     *
                     * scroll={false} از همان دلیلِ گرید: /image/[id] به‌صورت
                     * مودالِ رهگیری‌شده روی همین صفحه باز می‌شود و پرشِ صفحه به
                     * بالا یعنی کاربر بعد از بستنِ مودال جای خودش را گم کند.
                     */}
                    {isFront ? (
                      <Link
                        href={imageHref(card.id)}
                        scroll={false}
                        // درگِ بومیِ مرورگر روی لینک، یک «شبحِ» تصویر می‌سازد و
                        // کشیدنِ کارت را نصفه رها می‌کند.
                        draggable={false}
                        aria-label={`دیدنِ پرامپت${card.title_fa ? `: ${card.title_fa}` : ""}`}
                        className="absolute inset-0 z-10 rounded-card"
                        onClick={(event) => {
                          const start = pointerStart.current;
                          // detail === 0 یعنی این کلیک از کیبورد آمده (Enter)؛
                          // آن‌جا clientX معنایی ندارد و نباید لغو شود.
                          if (
                            start &&
                            event.detail > 0 &&
                            Math.abs(event.clientX - start.x) > CLICK_SLOP
                          ) {
                            // Link مقدارِ defaultPrevented را پیش از ناوبری
                            // بررسی می‌کند، پس همین یک خط ناوبری را لغو می‌کند.
                            event.preventDefault();
                          }
                        }}
                      />
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── نقطه‌ها ──────────────────────────────────────────────────
          در ماک span بودند. اینجا button شده‌اند تا ورق‌زدنِ دست یک راهِ
          کیبوردی هم داشته باشد؛ کشیدنِ کارت با کیبورد ممکن نیست. */}
      {count > 1 ? (
        <div className="flex items-center justify-center px-5">
          <div className="flex items-center gap-[6px]" dir="ltr">
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => setTop(i)}
                aria-label={`کارتِ ${i + 1} از ${count}`}
                aria-current={i === top}
                className="block rounded-full"
                style={{ height: 5 }}
                animate={{
                  width: i === top ? 15 : 5,
                  backgroundColor: i === top ? ACCENT : DOT_IDLE,
                }}
                transition={reduced ? STILL : { type: "spring", stiffness: 420, damping: 32 }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── مشاهده این دسته‌بندی ─────────────────────────────────── */}
      <div className="flex justify-center pb-3 pt-[14px]">
        {/**
         * ⚠️ #gallery از این لینک برداشته شد و این پاک‌سازی نیست، اصلاح است:
         * وقتی مقصد «/?category=x» بود، کاربر روی *همان* صفحه می‌ماند و بی آن
         * لنگر، هیرو را می‌دید در حالی که گرید پایینِ کادر عوض شده بود. حالا
         * مقصد یک سندِ دیگر است که خودش از بالا باز می‌شود و <h1> خودش را دارد،
         * پس لنگر فقط یک #‌ِ اضافه به آدرسِ اشتراک‌گذاری‌شده می‌چسباند.
         *
         * (لنگرِ «دسته‌بندی‌ها ←» بالای همین فایل سرِ جایش می‌ماند؛ آن هنوز یک
         * پرشِ درون‌صفحه‌ای روی «/» است.)
         */}
        <Link
          href={galleryHref({ category: active.slug })}
          className="rounded-pill border border-accent bg-canvas px-5 py-2 text-sm leading-[21px] text-accent-strong shadow-pill transition-transform active:scale-[0.97]"
        >
          مشاهده این دسته‌بندی
        </Link>
      </div>
    </section>
  );
}
