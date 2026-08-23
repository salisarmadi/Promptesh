import Link from "next/link";
import { Instagram } from "./icons";

/**
 * فوترِ سایت — عمداً کم‌حرف.
 *
 * ماک در فوتر فهرستِ ۱۱ دسته را به‌صورت <span>های غیرقابل‌کلیک گذاشته بود. آن
 * هم فرصتِ ناوبری و هم سئو را هدر می‌دهد، ولی لینکِ درستش به مسیرهای
 * /category/[slug] نیاز دارد که هنوز ساخته نشده‌اند؛ تا آن موقع چیزی که کار
 * نمی‌کند اینجا نمی‌گذاریم.
 */

const YEAR_FA = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(
  new Date(),
);

/** همان env هدر. اگر تنظیم نشده باشد، لینک اصلاً رندر نمی‌شود. */
const INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM_URL;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 md:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* نامِ برند در فوتر آبی است و نه مرکبی — تنها جایی که ماک اجازه‌ی
              رنگ به لوگوی متنی داده، همین‌جاست. */}
          <Link href="/" className="w-fit text-[15px] font-extrabold text-accent">
            پرامپتِش
          </Link>

          {INSTAGRAM ? (
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-2 text-[11.5px] text-accent"
            >
              <Instagram size={14} />
              اینستاگرام
            </a>
          ) : null}
        </div>

        <p className="max-w-md text-sm leading-relaxed text-muted">
          هر عکس با پرامپت دقیق خودش. متن را کپی کن و در ابزار خودت بزن.
        </p>
        <p className="mt-2 text-[10.5px] text-faint">{YEAR_FA} — پرامپتش</p>
      </div>
    </footer>
  );
}
