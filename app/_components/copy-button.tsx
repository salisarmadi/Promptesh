"use client";

import { useCallback, useState } from "react";
import { Copy, Check } from "./icons";

/**
 * دکمه‌ی کپیِ متنِ پرامپت.
 *
 * از داخل گرید بیرون کشیده شد چون در چند جای مستقل لازم است و دو نسخه‌ی جدا
 * یعنی دو رفتارِ کپی که با هم فرق می‌کنند.
 *
 * نکته‌ی مهمِ نوشتار: نامِ کنش در تمام مسیر ثابت می‌ماند — «کپی پرامپت» بعد از
 * انجام می‌شود «کپی شد»، نه یک پیامِ دیگر. کاربر نباید حدس بزند چه شد.
 *
 * در ماک این دکمه تمام‌عرض و در پایینِ مودال است، نه یک دکمه‌ی کوچک در ردیفِ
 * عنوان. همان درست است: این تنها کنشِ اصلیِ کلِ محصول است و باید بزرگ‌ترین
 * هدفِ لمسیِ صفحه باشد. پس اندازه‌ی block اضافه شد و مودال از آن استفاده می‌کند.
 */

/** حداکثر زمانِ نمایشِ حالتِ «کپی شد» (میلی‌ثانیه). */
const FEEDBACK_MS = 2000;

/**
 * سایه‌ی دکمه در دو حالت. هر دو از ماک.
 * پخشِ منفی (‎-12px) یعنی سایه از خودِ دکمه کوچک‌تر است و مثل یک هاله زیرش
 * می‌نشیند، نه مثل یک قابِ تار دورش.
 */
const SHADOW = {
  idle: "0 10px 24px -12px rgba(37,99,235,0.95)",
  done: "0 10px 24px -12px rgba(22,163,74,0.9)",
} as const;

export function CopyButton({
  text,
  size = "sm",
}: {
  text: string;
  /** sm برای ردیف‌های فشرده، block برای کنشِ اصلیِ مودال. */
  size?: "sm" | "block";
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // بسترِ ناامن (http) یا مرورگر قدیمی: کلیپ‌بورد API در دسترس نیست.
        // این fallback با یک textarea موقت کار می‌کند. برای بازدیدکننده‌ای که
        // سایت را روی http باز کرده (یا از پروکسی می‌آید) تفاوتِ «کار می‌کند»
        // و «کار نمی‌کند» است، پس حذفش نکن.
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
      window.setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      // اگر کپی نشد بی‌سر‌و‌صدا بگذر: متن روی صفحه هست و کاربر می‌تواند دستی
      // انتخاب کند. نمایشِ خطا اینجا فقط سر‌و‌صدا است، چون راهِ‌حلی ندارد.
    }
  }, [text]);

  const isBlock = size === "block";

  return (
    <button
      type="button"
      onClick={onCopy}
      // aria-live روی خودِ دکمه: تغییرِ متن برای کاربرِ اسکرین‌ریدر اعلام شود،
      // وگرنه بازخوردِ «کپی شد» فقط بصری است.
      aria-live="polite"
      /* سایه با style و نه کلاس: دو حالت دارد و توکنِ تِیلویند برای هرکدام
         ساختن، دو توکن برای یک دکمه است. مقدارها بالا در SHADOW‌اند. */
      style={{ boxShadow: copied ? SHADOW.done : SHADOW.idle }}
      className={`flex shrink-0 items-center justify-center gap-2 font-bold text-white transition-colors active:scale-[0.98] ${
        isBlock
          ? "min-h-12 w-full rounded-field text-[13px]"
          : "rounded-full px-3.5 py-1.5 text-xs"
      } ${copied ? "bg-affirm" : "bg-accent"}`}
    >
      {copied ? (
        <>
          <Check size={isBlock ? 15 : 13} />
          کپی شد
        </>
      ) : (
        <>
          <Copy size={isBlock ? 15 : 13} />
          کپی پرامپت
        </>
      )}
    </button>
  );
}
