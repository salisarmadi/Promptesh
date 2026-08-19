import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { GalleryItem, HeroCategory } from "./data";

const ACCENT = "#2563EB";

/** Visual slot of a card inside the stack — index 0 is the front card. */
const SLOTS = [
  { y: 0, x: 0, scale: 1, rot: 0, opacity: 1, blur: 0 },
  { y: -14, x: 13, scale: 0.94, rot: 3, opacity: 0.9, blur: 0.8 },
  { y: -25, x: 24, scale: 0.88, rot: 6, opacity: 0.6, blur: 2 },
  { y: -33, x: 32, scale: 0.83, rot: 8.5, opacity: 0, blur: 3 },
];

const SPRING = { type: "spring" as const, stiffness: 250, damping: 28, mass: 0.9 };

function CardStack({
  items,
  onSelect,
  onTopChange,
}: {
  items: GalleryItem[];
  onSelect: (item: GalleryItem) => void;
  onTopChange: (index: number) => void;
}) {
  const [top, setTop] = useState(0);
  const topRef = useRef(0);

  useEffect(() => {
    topRef.current = 0;
    setTop(0);
    onTopChange(0);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const retreat = () => {
    const next = (topRef.current - 1 + items.length) % items.length;
    topRef.current = next;
    setTop(next);
    onTopChange(next);
  };

  const advance = () => {
    const next = (topRef.current + 1) % items.length;
    topRef.current = next;
    setTop(next);
    onTopChange(next);
  };

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(advance, 4400);
    return () => window.clearInterval(id);
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative mx-auto" style={{ width: 188.65, height: 240 }}>
      {/* soft accent glow behind the deck */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: "18% -22% -14% -22%",
          background:
            "radial-gradient(ellipse at 50% 60%, rgba(79,150,232,0.16) 0%, rgba(79,222,232,0) 68%)",
          filter: "blur(8px)",
        }}
      />

      {items.map((item, i) => {
        const slot = (i - top + items.length) % items.length;
        const s = SLOTS[Math.min(slot, SLOTS.length - 1)];
        const isFront = slot === 0;
        return (
          <motion.div
            key={item.id}
            className="absolute inset-0 rounded-[21.767px] overflow-hidden bg-[#F3F2FA]"
            style={{
              zIndex: SLOTS.length - Math.min(slot, SLOTS.length - 1),
              cursor: isFront ? "pointer" : "default",
              pointerEvents: isFront ? "auto" : "none",
              transformOrigin: "50% 100%",
            }}
            initial={{ opacity: 0, y: 34, scale: 0.9, rotate: s.rot, filter: `blur(${s.blur}px)` }}
            animate={{
              x: s.x,
              y: s.y,
              scale: s.scale,
              rotate: s.rot,
              opacity: s.opacity,
              filter: `blur(${s.blur}px)`,
              boxShadow: isFront
                ? "0px 21.767px 48.977px -10.884px rgba(60,48,160,0.32), 0px 5.442px 14.512px 0px rgba(17,16,40,0.08)"
                : "0px 10.231px 22.167px -8.526px rgba(60,48,160,0.20)",
            }}
            exit={{ opacity: 0, scale: 0.9, y: -26 }}
            transition={SPRING}
            drag={isFront && items.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            whileTap={isFront ? { scale: 0.975 } : undefined}
            onDragEnd={(_, info) => {
              if (info.offset.x < -55) advance();
              else if (info.offset.x > 55) retreat();
            }}
            onClick={() => isFront && onSelect(item)}
          >
            <img
              src={item.imageUrl}
              alt={item.category}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
            {/* hairline inner border keeps the card crisp on white */}
            <div
              className="absolute inset-0 rounded-[21.767px] pointer-events-none"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)" }}
            />
            {isFront && (
              <motion.div
                className="absolute bottom-0 inset-x-0 px-[11px] pb-[11px] pt-[43px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.28 }}
                style={{
                  background:
                    "linear-gradient(to top, rgba(10,9,26,0.86) 0%, rgba(10,9,26,0.42) 46%, rgba(10,9,26,0) 100%)",
                }}
              ><p
                  className="text-[7.7px] leading-[11.5px] mb-[7px] line-clamp-2"
                  dir="ltr"
                  style={{ fontFamily: "var(--font-mono-custom)", color: "rgba(255,255,255,0.85)" }}
                >{item.prompt}</p><span
                  className="inline-flex items-center text-[7.3px] leading-[10.9px] text-white/95 px-[7px] py-[2.7px] rounded-[12.7px]"
                  style={{
                    backgroundColor: "rgba(91,79,232,0.92)",
                    fontFamily: "var(--font-mono-custom)",
                  }}
                >{item.model}</span></motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export function CategoryHero({
  categories,
  itemsByCategory,
  onSelectItem,
  onSeeCategory,
}: {
  categories: HeroCategory[];
  itemsByCategory: Record<string, GalleryItem[]>;
  onSelectItem: (item: GalleryItem) => void;
  onSeeCategory: (category: string) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [topIdx, setTopIdx] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const active = categories[activeIdx];
  const items = itemsByCategory[active.id] ?? [];

  const select = (i: number) => {
    if (i === activeIdx) return;
    setDirection(i > activeIdx ? 1 : -1);
    setActiveIdx(i);
  };

  // keep the selected thumbnail centred in the rail
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.children[activeIdx] as HTMLElement | undefined;
    if (!rail || !el) return;
    rail.scrollTo({
      left: el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2,
      behavior: "smooth",
    });
  }, [activeIdx]);

  return (
    <section className="pt-1">
      {/* ── Category rail + دسته‌بندی‌ها shortcut ── */}
      <div dir="rtl" className="flex items-center w-full">
        <div
          ref={railRef}
          dir="rtl"
          className="flex-1 min-w-0 flex gap-[9.5px] items-center overflow-x-auto no-scrollbar pr-5 pt-[12px] pb-[2px]"
        >
          {categories.map((cat, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={cat.id}
                onClick={() => select(i)}
                className="flex-shrink-0 flex flex-col items-center gap-[8px]"
                style={{ width: 58, height: 76 }}
              >
                <motion.div
                  className="relative overflow-hidden"
                  animate={{
                    scale: isActive ? 1.06 : 1,
                    borderRadius: isActive ? 20.14 : 19,
                    boxShadow: isActive
                      ? "0px 10.6px 23.32px -8.48px rgba(0,19,47,0.55)"
                      : "0px 2px 6px 0px rgba(17,16,40,0.06)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  style={{ width: 54, height: 54, backgroundColor: "#F3F2FA" }}
                >
                  <img
                    src={cat.thumb}
                    alt={cat.label}
                    className="w-full h-full object-cover"
                    draggable={false}
                    loading="lazy"
                  />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: isActive ? 0 : 1 }}
                    transition={{ duration: 0.24 }}
                    style={{ background: "rgba(243,242,250,0.5)" }}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="cat-ring"
                      className="absolute inset-0"
                      style={{ border: `3px solid ${ACCENT}`, borderRadius: 20.14 }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </motion.div>
                <motion.span
                  className="text-[10px] leading-none text-center w-full truncate font-[Kalameh(FaNum)]"
                  animate={{ color: isActive ? ACCENT : "#A1A1AF" }}
                  style={{ fontWeight: isActive ? 700 : 500 }}
                >
                  {cat.label}
                </motion.span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onSeeCategory("همه")}
          className="flex-shrink-0 order-first text-[10px] px-[14px] text-right font-[Kalameh(FaNum)]"
          style={{ color: "#A1A1AF" }}
        >
          دسته‌بندی‌ها ←
        </button>
      </div>

      {/* ── Stacked cards of the active category ── */}
      <div className="relative pt-[14px] pb-[9px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 24 * direction, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18 * direction, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 290, damping: 28 }}
          >
            <CardStack items={items} onSelect={onSelectItem} onTopChange={setTopIdx} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Dot pagination ── */}
      <div className="flex items-center justify-center px-5">
        <div className="flex items-center gap-[6px]" dir="ltr">
          {items.map((item, i) => (
            <motion.span
              key={item.id}
              className="rounded-full block"
              animate={{
                width: i === topIdx ? 15 : 5,
                backgroundColor: i === topIdx ? ACCENT : "#989898",
              }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{ height: 5 }}
            />
          ))}
        </div>
      </div>

      {/* ── مشاهده این دسته‌بندی ── */}
      <div className="flex justify-center px-[0px] pt-[14px] pb-[12px]">
        <motion.button
          onClick={() => onSeeCategory(active.id)}
          whileTap={{ scale: 0.97 }}
          className="rounded-[22px] bg-white font-[Kalameh(FaNum)]"
          style={{
            border: `1px solid ${ACCENT}`,
            boxShadow: "0px 6px 30px 0px rgba(79,127,232,0.25)",
            padding: "8px 20px",
            color: "#1E40AF",
            fontSize: 14,
            lineHeight: "21px",
          }}
        >
          مشاهده این دسته‌بندی
        </motion.button>
      </div>
    </section>
  );
}
