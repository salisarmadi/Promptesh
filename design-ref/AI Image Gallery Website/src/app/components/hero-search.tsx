import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, ArrowLeft, Sparkles } from "lucide-react";

const ACCENT = "#2563EB";
const INK = "#14132B";
const FAINT = "#A5A4B6";
const LINE = "#EDECF4";


/** Placeholder hints that cycle while the field is empty and unfocused. */
const HINTS = [
  "پرتره سینمایی با نور نرم…",
  "عکس کاپل در غروب…",
  "تبلیغ عطر لوکس…",
  "منظرهٔ کوهستان طلایی…",
];

const SUGGESTIONS = ["پرتره", "کاپل", "تبلیغات", "سه‌بعدی", "مینیمال"];

export function HeroSearch({ onSubmit }: { onSubmit: (query: string) => void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // rotate the placeholder hint only while idle
  useEffect(() => {
    if (focused || value) return;
    const id = window.setInterval(() => setHint(h => (h + 1) % HINTS.length), 2600);
    return () => window.clearInterval(id);
  }, [focused, value]);

  const submit = (q: string) => {
    const query = q.trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    onSubmit(query);
  };

  return (
    <div>
      <motion.div
        className="relative rounded-[16px] bg-white"
        animate={{
          boxShadow: focused
            ? "0px 10px 15px 0px rgba(0,72,255,0.09), 0px 4px 11.9px 0px rgba(0,72,255,0.22)"
            : "0px 10px 15px 0px rgba(0,72,255,0.05), 0px 4px 11.9px 0px rgba(0,72,255,0.15)",
        }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        <motion.div
          className="relative flex items-center rounded-[16px] overflow-hidden bg-white"
          animate={{ borderColor: focused ? ACCENT : "#DBEAFE" }}
          transition={{ duration: 0.2 }}
          style={{ border: "1px solid", height: 52 }}
        >
          {/* search icon (right, RTL leading edge) */}
          <motion.span
            className="pr-[16px] pl-[4px] flex-shrink-0"
            animate={{ color: focused ? ACCENT : "#A5A4B6", scale: focused ? 1.08 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
          >
            <Search size={16} />
          </motion.span>

          <div className="relative flex-1 min-w-0">
            <input
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => { if (e.key === "Enter") submit(value); }}
              dir="rtl"
              className="w-full bg-transparent text-[13px] focus:outline-none"
              style={{ color: INK, padding: "14px 0", lineHeight: "19.5px" }}
            />
            {/* animated placeholder — swaps with a soft slide while idle */}
            {!value && (
              <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={focused ? "focused" : hint}
                    className="text-[13px] whitespace-nowrap"
                    style={{ color: FAINT, lineHeight: "19.5px" }}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    {focused ? "چه تصویری در ذهنت داری؟" : HINTS[hint]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </div>

          <AnimatePresence>
            {value && (
              <motion.button
                key="clear"
                onClick={() => { setValue(""); inputRef.current?.focus(); }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 22, height: 22, backgroundColor: "#EDECF4", color: "#6E6D85" }}
              >
                <X size={12} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* submit (left edge) */}
          <div className="pl-[6px] pr-[4px] flex-shrink-0">
            <motion.button
              onClick={() => submit(value)}
              whileTap={{ scale: 0.92 }}
              animate={{
                backgroundColor: value ? ACCENT : "rgba(79,127,232,0.10)",
                color: value ? "#FFFFFF" : ACCENT,
              }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center rounded-[20px]"
              style={{ width: 38, height: 38 }}
              aria-label="جستجو"
            >
              <ArrowLeft size={16} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* suggestion chips — reveal when the field is engaged */}
      <AnimatePresence initial={false}>
        {(focused || value) && (
          <motion.div
            key="chips"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 flex-wrap pt-3" dir="rtl">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.2 }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setValue(s); submit(s); }}
                  className="flex items-center gap-1 rounded-full text-[11px] font-medium px-3 py-1.5 active:scale-95 transition-transform"
                  style={{ backgroundColor: "rgba(79,127,232,0.10)", color: ACCENT }}
                >
                  <Sparkles size={9} />
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
