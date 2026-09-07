/**
 * آیکن‌های مشترک رابط کاربری.
 *
 * چرا دستی و نه lucide-react: کل سایت به هشت آیکن احتیاج دارد. یک بسته‌ی کاملِ
 * آیکن برای هشت شکل، هم یک وابستگیِ اضافه است و هم — مهم‌تر — هر آیکن را به یک
 * کامپوننتِ ری‌اکت تبدیل می‌کند که باید در باندلِ کلاینت برود. این شکل‌ها
 * SVGِ خالص‌اند و در کامپوننت‌های سروری هم بدون هیچ جاوااسکریپتی رندر می‌شوند.
 *
 * شکل‌ها از lucide (نسخه‌ی ۰٫۳۸۳، همان که ماک استفاده کرده) نسخه‌برداری شده‌اند
 * تا هندسه‌شان با ماک یکی باشد.
 *
 * قاعده‌ها:
 *   • size به‌جای width/height جدا — هیچ‌وقت آیکنِ کشیده نداریم.
 *   • stroke="currentColor" — رنگ از متنِ والد می‌آید، پس با animate کردنِ
 *     color در motion، آیکن هم با آن عوض می‌شود (همین در نوارِ جستجو لازم است).
 *   • aria-hidden — همه‌شان تزئینی‌اند؛ متنِ جایگزین جای خودش را در
 *     aria-label دکمه یا لینک دارد، نه اینجا. (در دکمه‌ی کپی، خودِ متنِ دکمه
 *     «کپی پرامپت»/«کپی شد» را می‌گوید، پس آیکن آنجا هم تزئینی است.)
 */

type IconProps = {
  size?: number;
  className?: string;
};

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    className,
  };
}

export function Sparkles({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

export function Instagram({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Search({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function X({ size = 12, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * فلشِ چپ. در صفحه‌ی RTL «چپ» یعنی «به جلو»، پس این فلشِ پیشرَوی است و
 * نباید با dir برگردد — به همین دلیل SVG است و نه کاراکترِ «←».
 */
export function ArrowLeft({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

/**
 * فلشِ راست — در RTL یعنی «به عقب» (صفحه‌ی قبل). جفتِ ArrowLeft است.
 *
 * ⚠️ هر دو فلش عمداً SVGِ ثابت‌اند و با dir برنمی‌گردند. اگر روزی نسخه‌ی
 * انگلیسی/LTR اضافه شد، جای این دو در نوارِ صفحه‌بندی باید عوض شود، نه شکلشان.
 */
export function ArrowRight({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m12 5 7 7-7 7" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** دکمه‌ی کپیِ پرامپت — حالتِ عادی. */
export function Copy({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

/** همان دکمه پس از کپی. جفتِ Copy است و باید همان اندازه بماند، وگرنه دکمه می‌پرد. */
export function Check({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* ===========================================================================
   آیکن‌های پنل مدیریت
   ===========================================================================

   چرا در همین ماژول مشترک و نه در یک ماژول جدا برای پنل مدیریت؟
       تنها چیزی که واقعاً باید یکی بماند base() است — viewBox، ضخامتِ خط،
       شکلِ سرِ خط، و aria-hidden. اگر پنل فایلِ آیکنِ خودش را داشت، آن هشت خط
       کپی می‌شد و اولین باری که ضخامتِ خط را عوض می‌کردیم، دو نیمه‌ی سایت از
       هم درمی‌رفتند. هزینه‌اش این است که فایل بلندتر شده؛ در عوض هیچ آیکنی با
       هندسه‌ی متفاوت وجود ندارد.

   نکته‌ی باندل: این‌ها همه SVGِ ایستا در کامپوننتِ سروری‌اند، پس ایمپورت‌کردنِ
   یکی‌شان بقیه را به مرورگر نمی‌فرستد — tree shaking کارش را می‌کند.
   =========================================================================== */

/** داشبورد. */
export function LayoutDashboard({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

/** تصاویر. نامش ImageIcon است و نه Image، تا با next/image قاطی نشود. */
export function ImageIcon({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

/** پرامپت‌ها — سندِ متنی. */
export function FileText({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

/** دسته‌بندی‌ها. */
export function Tag({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** آمار و گزارش‌ها. */
export function ChartBar({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 16v-3" />
      <path d="M12 16V8" />
      <path d="M17 16v-6" />
    </svg>
  );
}

/** تنظیمات. */
export function Settings({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** خروج از حساب. */
export function LogOut({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/** حسابِ مدیر. */
export function User({ size = 17, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/** دکمه‌ی کشوی موبایل. */
export function Menu({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

/**
 * جفتِ شِورون برای جمع/بازکردنِ سایدبار و منوهای بازشو.
 *
 * ⚠️ مثل ArrowLeft/ArrowRight این‌ها هم با dir برنمی‌گردند. در سایدبارِ RTL که
 * سمتِ راست می‌نشیند، «جمع‌کردن» یعنی شِورونِ راست و «بازکردن» یعنی چپ — یعنی
 * درست برعکسِ شهودِ کسی که با LTR کد می‌زند. جای استفاده‌شان را عوض نکن.
 */
export function ChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ChevronLeft({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

/** شِورونِ پایین — سلکت و منوی بازشو. */
export function ChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** افزودن. */
export function Plus({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

/** ویرایش. */
export function Pencil({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

/** حذف. */
export function Trash({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** آپلود فایل. */
export function Upload({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

/** دیدن روی سایت. */
export function Eye({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** هشدار و خطا. */
export function AlertTriangle({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** قفل — صفحه‌ی ورود. */
export function Lock({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
