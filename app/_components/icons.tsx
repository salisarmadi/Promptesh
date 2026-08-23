/**
 * آیکن‌های سایت.
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
