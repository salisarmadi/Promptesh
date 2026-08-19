import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Copy,
  Check,
  X,
  Heart,
  Sparkles,
  Instagram,
  ArrowLeft,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import { CategoryHero } from "./components/category-hero";
import { HeroSearch } from "./components/hero-search";
import {
  ALL_ITEMS,
  CATEGORIES,
  HERO_CATEGORIES,
  MODELS,
  ITEMS_BY_CATEGORY,
  type GalleryItem,
} from "./components/data";

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT = "#2563EB";
const ACCENT_SOFT = "rgba(79,127,232,0.10)";
const INK = "#14132B";
const MUTED = "#6E6D85";
const FAINT = "#A5A4B6";
const LINE = "#EDECF4";
const SURFACE = "#F6F5FB";

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PillFilter({
  options,
  active,
  onSelect,
  small = false,
  wrap = false,
}: {
  options: string[];
  active: string;
  onSelect: (v: string) => void;
  small?: boolean;
  wrap?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 no-scrollbar px-5 md:px-0 ${wrap ? "flex-wrap" : "overflow-x-auto"}`}
      dir="rtl"
      style={{ paddingTop: 4, paddingBottom: 4 }}
    >
      {options.map(opt => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className="flex-shrink-0 rounded-full border transition-all duration-200 active:scale-[0.96]"
            style={{
              fontSize: small ? 11 : 12,
              fontWeight: isActive ? 700 : 500,
              padding: small ? "5px 12px" : "7px 15px",
              minHeight: small ? 30 : 34,
              backgroundColor: isActive ? ACCENT : "#fff",
              color: isActive ? "#fff" : MUTED,
              borderColor: isActive ? ACCENT : LINE,
              boxShadow: isActive ? "0 6px 16px -8px rgba(37,99,235,0.7)" : "none",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder = "جستجو در پرامپت‌ها…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative mx-5 md:mx-0">
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: FAINT }}>
        <Search size={15} />
      </div>
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
          style={{ width: 22, height: 22, backgroundColor: LINE, color: MUTED }}
        >
          <X size={12} />
        </button>
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        className="w-full rounded-2xl text-[13px] focus:outline-none transition-all"
        style={{
          padding: "11px 42px 11px 34px",
          minHeight: 46,
          backgroundColor: SURFACE,
          border: `1px solid ${LINE}`,
          color: INK,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = ACCENT;
          e.currentTarget.style.backgroundColor = "#fff";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = LINE;
          e.currentTarget.style.backgroundColor = SURFACE;
        }}
      />
    </div>
  );
}

function SectionHeading({
  title,
  caption,
  action,
  onAction,
}: {
  title: string;
  caption?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between px-5 md:px-0 mb-3">
      <div>
        <h2 className="font-extrabold leading-tight" style={{ fontSize: 15, lineHeight: "18.75px", fontWeight: 800, color: INK }}>
          {title}
        </h2>
        {caption && (
          <p className="mt-0.5 text-[11px]" style={{ color: FAINT }}>
            {caption}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={onAction}
          className="text-[11px] font-bold flex items-center gap-0.5"
          style={{ color: ACCENT }}
        >
          <ArrowLeft size={13} />
          {action}
        </button>
      )}
    </div>
  );
}

function GalleryCard({ item, onSelect }: { item: GalleryItem; onSelect: () => void }) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.965 }}
      className="relative w-full rounded-[20px] overflow-hidden"
      style={{
        aspectRatio: item.tall ? "3/4" : "4/3",
        backgroundColor: SURFACE,
        boxShadow: "0 8px 20px -14px rgba(20,19,43,0.5)",
      }}
    >
      <img
        src={item.imageUrl}
        alt={item.category}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(10,9,26,0.62) 0%, rgba(10,9,26,0) 100%)",
        }}
      />
      <div className="absolute top-2 left-2">
        <span
          className="flex items-center gap-1 rounded-full px-2 py-[3px] backdrop-blur-md"
          style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
        >
          <Sparkles size={8} style={{ color: ACCENT }} />
          <span
            className="text-[8px] leading-none"
            style={{ color: ACCENT, fontFamily: "var(--font-mono-custom)" }}
          >
            {item.model}
          </span>
        </span>
      </div>
      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between">
        <span className="text-white text-[9.5px] font-bold" style={{ lineHeight: "14.25px" }}>{item.category}</span>
        <span className="flex items-center gap-1">
          <Heart size={9} style={{ color: "#FFA1AD", fill: "#FFA1AD" }} />
          <span className="text-[9px] leading-none" style={{ color: "rgba(255,255,255,0.9)" }}>
            {item.likes.toLocaleString("fa-IR")}
          </span>
        </span>
      </div>
    </motion.button>
  );
}

function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center" dir="rtl">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: ACCENT_SOFT }}
      >
        <Search size={20} style={{ color: ACCENT }} />
      </div>
      <p className="text-[13px] font-bold mb-1" style={{ color: INK }}>
        چیزی با این مشخصات پیدا نشد
      </p>
      <p className="text-[11.5px] mb-4" style={{ color: FAINT }}>
        فیلترها را تغییر بده یا عبارت دیگری جستجو کن
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="text-[12px] font-bold rounded-full px-4 py-2"
          style={{ color: ACCENT, backgroundColor: ACCENT_SOFT }}
        >
          حذف فیلترها
        </button>
      )}
    </div>
  );
}

function ImageModal({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.prompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "rgba(14,13,32,0.55)", backdropFilter: "blur(2px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      {/* Mobile: slide from bottom. Desktop: centered. */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
        <motion.div
          className="w-[calc(100%-24px)] max-w-[351px] md:max-w-[580px] bg-white rounded-[28px] pointer-events-auto overflow-hidden mb-3 md:mb-0"
          style={{ maxHeight: "86vh", boxShadow: "0 -18px 60px -20px rgba(20,19,43,0.5)" }}
          initial={{ y: 130, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 130, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.22 }}
          onDragEnd={(_, info) => { if (info.offset.y > 90) onClose(); }}
          onClick={e => e.stopPropagation()}
        >
          <div className="relative flex justify-center items-center pt-3 pb-2">
            <div className="w-9 h-[5px] rounded-full" style={{ backgroundColor: LINE }} />
            <button
              className="absolute right-3 top-2 flex items-center justify-center rounded-full active:scale-95 transition-transform"
              onClick={onClose}
              style={{ width: 30, height: 30, backgroundColor: SURFACE, color: MUTED }}
            >
              <X size={15} />
            </button>
          </div>

          <div className="overflow-y-auto no-scrollbar md:grid md:grid-cols-2 md:gap-0" style={{ maxHeight: "calc(86vh - 46px)" }}>
            {/* Image */}
            <div className="px-4 md:px-4 md:py-4">
              <div
                className="relative w-full overflow-hidden rounded-[20px]"
                style={{ aspectRatio: item.tall ? "4/5" : "16/10", backgroundColor: SURFACE }}
              >
                <img src={item.imageUrl} alt={item.category} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3.5 md:overflow-y-auto md:no-scrollbar" dir="rtl">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[11px] px-2.5 py-[5px] rounded-full font-bold"
                  style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}
                >
                  {item.category}
                </span>
                <span
                  className="text-[10.5px] px-2.5 py-[5px] rounded-full font-medium"
                  style={{ backgroundColor: SURFACE, color: MUTED, fontFamily: "var(--font-mono-custom)" }}
                >
                  {item.model}
                </span>
                <span className="text-[10.5px] px-2.5 py-[5px] rounded-full bg-rose-50 text-rose-500 flex items-center gap-1 font-medium">
                  <Heart size={10} className="fill-rose-400 text-rose-400" />
                  {item.likes.toLocaleString("fa-IR")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold" style={{ color: FAINT }}>
                  متن پرامپت
                </p>
                <p className="text-[10px]" style={{ color: FAINT }}>
                  {item.prompt.length.toLocaleString("fa-IR")} کاراکتر
                </p>
              </div>

              <div
                className="rounded-2xl overflow-y-auto no-scrollbar"
                style={{ maxHeight: 160, backgroundColor: SURFACE, border: `1px solid ${LINE}` }}
                dir="ltr"
              >
                <p
                  className="p-3.5 text-[11px] leading-[1.75]"
                  style={{ color: "#3B3A55", fontFamily: "var(--font-mono-custom)" }}
                >
                  {item.prompt}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="w-full rounded-2xl text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: copied ? "#16A34A" : ACCENT,
                  minHeight: 48,
                  boxShadow: copied
                    ? "0 10px 24px -12px rgba(22,163,74,0.9)"
                    : "0 10px 24px -12px rgba(37,99,235,0.95)",
                }}
              >
                {copied ? <><Check size={15} /> کپی شد</> : <><Copy size={15} /> کپی پرامپت</>}
              </button>
              <div className="h-1" />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function Footer() {
  return (
    <footer className="mt-10 pt-6 pb-9" style={{ borderTop: `1px solid ${LINE}` }} dir="rtl">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-extrabold" style={{ color: ACCENT }}>
            پرامپتا
          </span>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11.5px] rounded-full px-3 py-2"
            style={{ color: ACCENT, backgroundColor: ACCENT_SOFT }}
          >
            <Instagram size={14} />
            اینستاگرام
          </a>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5">
          {HERO_CATEGORIES.map(cat => (
            <span key={cat.id} className="text-[11px]" style={{ color: FAINT }}>
              {cat.label}
            </span>
          ))}
        </div>
        <p className="text-[10.5px]" style={{ color: "#C9C8D6" }}>
          © ۱۴۰۴ پرامپتا · همه حقوق محفوظ است
        </p>
      </div>
    </footer>
  );
}

function Header({ onBack, showBack = false }: { onBack?: () => void; showBack?: boolean }) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 py-3" dir="rtl">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={onBack}
              className="md:hidden flex items-center justify-center rounded-full active:scale-95 transition-transform"
              style={{ width: 36, height: 36, color: MUTED }}
            >
              <ChevronRight size={21} />
            </button>
          )}
          <span
            className="text-[16px]"
            style={{ color: INK, fontWeight: 500, letterSpacing: "-0.4px", lineHeight: "24px" }}
          >پرامپتِش</span>
          <span
            className="rounded-[20px] flex items-center justify-center"
            style={{ width: 28, height: 28, backgroundColor: ACCENT }}
          >
            <Sparkles size={14} className="text-white" />
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {showBack && (
            <button
              onClick={onBack}
              className="text-[13px] font-medium flex items-center gap-1.5"
              style={{ color: MUTED }}
            >
              <ChevronRight size={15} />
              بازگشت به خانه
            </button>
          )}
        </nav>

        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-full"
          style={{ width: 38, height: 38, color: MUTED, backgroundColor: SURFACE }}
        >
          <Instagram size={17} />
        </a>
      </div>
    </header>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function HomePage({
  onNavigateToGallery,
  onSelectItem,
}: {
  onNavigateToGallery: (category?: string) => void;
  onSelectItem: (item: GalleryItem) => void;
}) {
  const trending = useMemo(
    () => [...ALL_ITEMS].sort((a, b) => b.likes - a.likes).slice(0, 12),
    []
  );

  return (
    <div className="min-h-screen pb-4" dir="rtl">
      <Header />

      {/* ── Hero: centered column, max-w-[640px] ── */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-[640px] md:max-w-[760px] px-5 md:px-8">

          {/* Headline */}
          <div className="pt-6 md:pt-10 pb-2">
            <h1 className="text-center" style={{ color: "#0A0A0A" }}>
              <span
                className="block text-[24.8px] md:text-[34px] leading-[1.53]"
                style={{ fontWeight: 500 }}
              >هرچــــی که لازم داری،</span>
              <span className="block text-[24.8px] md:text-[34px] leading-[1.53]">
                <span
                  className="text-[31.8px] md:text-[44px]"
                  style={{
                    fontWeight: 800,
                    backgroundImage: "linear-gradient(to bottom, #0066FF 0%, #0054D3 50%, #6DA8FF 93.75%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  پرامپتـِـش
                </span>
                <span style={{ fontWeight: 500 }}> اینجاس</span>
              </span>
            </h1>
          </div>

          {/* Category rail + card stack */}
          <div className="md:scale-[1.2] md:origin-top md:mb-16">
            <CategoryHero
              categories={HERO_CATEGORIES}
              itemsByCategory={ITEMS_BY_CATEGORY}
              onSelectItem={onSelectItem}
              onSeeCategory={cat => onNavigateToGallery(cat)}
            />
          </div>

          {/* Search + CTA */}
          <div className="pt-5 pb-8">
            <div className="mb-3">
              <HeroSearch onSubmit={() => onNavigateToGallery()} />
            </div>
            <button
              onClick={() => onNavigateToGallery()}
              className="w-full rounded-[16px] text-white font-bold text-[14px] md:text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform h-[50px] md:h-[58px]"
              style={{
                backgroundColor: ACCENT,
                boxShadow: "0px 6px 15px rgba(79,127,232,0.25)",
              }}
            >
              <ArrowLeft size={16} />
              مشاهده گالری پرامپت
            </button>
          </div>
        </div>
      </div>

      {/* ── Trending: full width below hero ── */}
      <div
        className="w-full pt-8 pb-4"
        style={{ borderTop: `1px solid ${LINE}` }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <SectionHeading
            title="محبوب‌ترین‌های این هفته"
            caption="بیشترین پرامپت‌های کپی‌شده"
            action="همه"
            onAction={() => onNavigateToGallery()}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {trending.map(item => (
              <GalleryCard key={item.id} item={item} onSelect={() => onSelectItem(item)} />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function GalleryPage({
  initialCategory,
  onBack,
  onSelectItem,
}: {
  initialCategory: string;
  onBack: () => void;
  onSelectItem: (item: GalleryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeModel, setActiveModel] = useState("همه مدل‌ها");
  const [sortOrder, setSortOrder] = useState<"newest" | "popular">("popular");
  const [displayCount, setDisplayCount] = useState(12);

  const filtered = useMemo(() => {
    const base = ALL_ITEMS.filter(item => {
      if (activeCategory !== "همه" && item.category !== activeCategory) return false;
      if (activeModel !== "همه مدل‌ها" && item.model !== activeModel) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (
          !item.prompt.toLowerCase().includes(q) &&
          !item.category.includes(search.trim()) &&
          !item.model.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    return sortOrder === "popular"
      ? [...base].sort((a, b) => b.likes - a.likes)
      : [...base].sort((a, b) => b.id - a.id);
  }, [activeCategory, activeModel, search, sortOrder]);

  const displayed = filtered.slice(0, displayCount);
  const hasMore = displayCount < filtered.length;

  useEffect(() => { setDisplayCount(12); }, [activeCategory, activeModel, search, sortOrder]);

  const resetFilters = () => {
    setSearch("");
    setActiveCategory("همه");
    setActiveModel("همه مدل‌ها");
  };

  const sortBtn = (key: "newest" | "popular", label: string, Icon: typeof Clock) => {
    const isActive = sortOrder === key;
    return (
      <button
        onClick={() => setSortOrder(key)}
        className="flex items-center gap-1 rounded-full transition-all active:scale-95"
        style={{
          fontSize: 10.5,
          fontWeight: isActive ? 700 : 500,
          padding: "6px 11px",
          minHeight: 30,
          backgroundColor: isActive ? ACCENT_SOFT : "transparent",
          color: isActive ? ACCENT : FAINT,
          border: `1px solid ${isActive ? "rgba(37,99,235,0.25)" : LINE}`,
        }}
      >
        <Icon size={10} /> {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen pb-4" dir="rtl">
      <Header showBack onBack={onBack} />

      {/* ── Desktop: sidebar + main. Mobile: sticky filter strip + grid ── */}
      <div className="max-w-6xl mx-auto md:flex md:items-start md:gap-8 md:px-8 md:pt-6">

        {/* ── Sidebar (desktop only) ── */}
        <aside
          className="hidden md:block md:w-64 md:shrink-0 md:sticky md:top-[65px] md:pt-2 md:pb-8"
          style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 24 }}
          dir="rtl"
        >
          <p className="text-[11px] font-bold mb-2" style={{ color: FAINT }}>جستجو</p>
          <SearchBar value={search} onChange={setSearch} placeholder="دنبال چه سبکی هستی؟" />

          <p className="text-[11px] font-bold mt-5 mb-2" style={{ color: FAINT }}>دسته‌بندی</p>
          <PillFilter options={CATEGORIES} active={activeCategory} onSelect={setActiveCategory} wrap />

          <p className="text-[11px] font-bold mt-4 mb-2" style={{ color: FAINT }}>مدل</p>
          <PillFilter options={MODELS} active={activeModel} onSelect={setActiveModel} small wrap />

          <p className="text-[11px] font-bold mt-4 mb-2" style={{ color: FAINT }}>مرتب‌سازی</p>
          <div className="flex gap-1.5 flex-wrap">
            {sortBtn("popular", "محبوب", TrendingUp)}
            {sortBtn("newest", "جدید", Clock)}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile sticky filter strip */}
          <div
            className="md:hidden sticky top-0 z-40"
            style={{
              backgroundColor: "rgba(255,255,255,0.93)",
              backdropFilter: "blur(14px)",
              borderBottom: `1px solid ${LINE}`,
            }}
          >
            <SearchBar value={search} onChange={setSearch} placeholder="دنبال چه سبکی هستی؟" />
            <div className="pt-2.5">
              <PillFilter options={CATEGORIES} active={activeCategory} onSelect={setActiveCategory} />
            </div>
            <div className="pt-1 pb-2">
              <PillFilter options={MODELS} active={activeModel} onSelect={setActiveModel} small />
            </div>
          </div>

          {/* Result count + sort (mobile only sort; desktop uses sidebar) */}
          <div className="flex items-center justify-between px-5 md:px-0 py-3">
            <span className="text-[11.5px]" style={{ color: FAINT }}>
              {filtered.length.toLocaleString("fa-IR")} نتیجه
            </span>
            <div className="flex gap-1.5 md:hidden">
              {sortBtn("popular", "محبوب", TrendingUp)}
              {sortBtn("newest", "جدید", Clock)}
            </div>
          </div>

          <section className="px-5 md:px-0">
            {filtered.length === 0 ? (
              <EmptyState onReset={resetFilters} />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayed.map(item => (
                    <GalleryCard key={item.id} item={item} onSelect={() => onSelectItem(item)} />
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={() => setDisplayCount(prev => prev + 8)}
                    className="mt-5 w-full rounded-2xl text-[12.5px] font-bold active:scale-[0.98] transition-transform"
                    style={{ minHeight: 46, color: ACCENT, backgroundColor: ACCENT_SOFT }}
                  >
                    نمایش بیشتر
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<"home" | "gallery">("home");
  const [galleryCategory, setGalleryCategory] = useState("همه");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const handleSelectItem = useCallback((item: GalleryItem) => setSelectedItem(item), []);
  const handleCloseModal = useCallback(() => setSelectedItem(null), []);

  const goToGallery = useCallback((category?: string) => {
    setGalleryCategory(category ?? "همه");
    setPage("gallery");
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedItem ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedItem]);

  return (
    <div className="min-h-screen bg-white">
      {/* Dot-grid + lavender wash */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 88% -4%, rgba(222,236,250,0.85) 0%, transparent 46%),
            radial-gradient(ellipse at 6% 32%, rgba(236,242,252,0.6) 0%, transparent 40%),
            radial-gradient(circle, rgba(20,19,43,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 22px 22px",
        }}
      />

      <div className="relative min-h-screen">
        <AnimatePresence mode="wait">
          {page === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.16, ease: "easeInOut" }}
            >
              <HomePage onNavigateToGallery={goToGallery} onSelectItem={handleSelectItem} />
            </motion.div>
          ) : (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeInOut" }}
            >
              <GalleryPage
                initialCategory={galleryCategory}
                onBack={() => setPage("home")}
                onSelectItem={handleSelectItem}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedItem && (
            <ImageModal key="modal" item={selectedItem} onClose={handleCloseModal} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
