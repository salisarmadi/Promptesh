import Link from "next/link";
import { getPaginationSlots } from "@/lib/pagination";
import { ArrowLeft, ArrowRight } from "@/app/_components/ui/Icons";

/**
 * نوارِ صفحه‌بندی — کامپوننتِ سروری، بدون هیچ جاوااسکریپتی در مرورگر.
 *
 * ── چرا صفحه‌بندیِ شماره‌دار و نه «بیشتر بارگذاری کن» یا اسکرولِ بی‌نهایت ──
 * مسئله‌ای که این کامپوننت حل می‌کند فقط راحتیِ کاربر نیست؛ تا پیش از این، با
 * سقفِ ۶۰ عکس در هر درخواست، ۹۱٪ از ۷۰۰ عکسِ گالری هیچ آدرسی نداشت که گوگل
 * بتواند به آن برسد. یعنی ۶۴۰ عکس عملاً وجود نداشتند.
 *
 *   • اسکرولِ بی‌نهایت این را حل نمی‌کند: محتوایی که فقط با جاوااسکریپت و بعد
 *     از چند اسکرول می‌آید آدرسِ خودش را ندارد، و فوترِ سایت هم هیچ‌وقت در
 *     دسترس نمی‌ماند.
 *   • دکمه‌ی «بیشتر» هم همان مشکل را دارد، مگر آنکه لینکِ واقعی باشد — که در آن
 *     صورت دیگر همین صفحه‌بندی است، فقط بدونِ امکانِ پریدن به صفحه‌ی دلخواه.
 *
 * پس: هر صفحه یک <a href> واقعی است. بدونِ جاوااسکریپت هم کار می‌کند، دکمه‌ی
 * بازگشتِ مرورگر درست عمل می‌کند، و هر ۱۲ صفحه برای خزنده قابل‌پیمایش است.
 *
 * ── رفتارِ واکنشی ──
 * روی موبایل جای ۱۲ چیپِ عددی نیست، پس آنجا فقط «قبلی / صفحه‌ی ۳ از ۱۲ / بعدی»
 * دیده می‌شود. عددها با hidden پنهان می‌شوند و نه با حذف از خروجی — پس لینک‌ها
 * در HTML هستند و پوششِ خزنده روی موبایل هم دست‌نخورده می‌ماند.
 *
 * ⚠️ ولی hidden برای کاربرِ اسکرین‌ریدر پنهان‌کردنِ واقعی است: display:none
 * عنصر را از درختِ دسترسی‌پذیری هم بیرون می‌برد. یعنی خزنده لینک‌ها را می‌بیند و
 * کاربرِ AT نمی‌بیند. به همین دلیل خطِ «صفحه‌ی ۳ از ۱۲» روی موبایل باید برای AT
 * خوانا بماند — تنها منبعِ موقعیت در آن عرض همان است.
 *
 * ── جهت ──
 * در RTL، «قبلی» سمتِ راست می‌نشیند. ترتیبِ DOM همان ترتیبِ منطقی است (قبلی،
 * عددها، بعدی) و خودِ dir=rtl جای‌گیری را برمی‌گرداند؛ هیچ row-reverse لازم
 * نیست. فلش‌ها اما SVGِ ثابت‌اند: در RTL فلشِ «جلو» به چپ اشاره می‌کند.
 */

const numFa = new Intl.NumberFormat("fa-IR");

/**
 * ── چرا href یک تابع است و نه فیلترهای گالری ──
 * نسخه‌ی اولِ این کامپوننت پراپِ `filters: GalleryFilters` می‌گرفت و خودش
 * galleryHref را صدا می‌زد. با آمدنِ فهرستِ تصاویرِ پنل — که محورهای فیلترِ
 * دیگری دارد (missing، sort) و مسیرِ دیگری — دو راه بود: یا الگوریتمِ
 * pageSlots دوباره نوشته شود، یا این کامپوننت از «کجا لینک بدهد» بی‌خبر شود.
 * دومی انتخاب شد: منطقِ واقعیِ اینجا همان چیدنِ اسلات‌ها و حالت‌های مرزی‌اش
 * است، و آن هیچ ربطی به شکلِ آدرس ندارد.
 *
 * تابع‌بودنِ پراپ اشکالی ندارد چون هر دو طرف کامپوننتِ سروری‌اند؛ هیچ تابعی از
 * مرزِ سرور/کلاینت عبور نمی‌کند.
 */
export function Pagination({
  page,
  totalPages,
  href,
  label = "صفحه‌بندی گالری",
}: {
  /** صفحه‌ی فعلی، از ۱. */
  page: number;
  totalPages: number;
  /**
   * آدرسِ صفحه‌ی n.
   *
   * ⚠️ مسئولیتِ حفظِ فیلترهای فعال با خودِ این تابع است. اگر فیلترها را نبرد،
   *    صفحه‌ی ۲ کلِ فیلتر را می‌اندازد و کاربر بی‌آنکه بفهمد در فهرستِ کامل
   *    می‌افتد.
   */
  href: (page: number) => string;
  /** برچسبِ ناحیه‌ی ناوبری. دو نوارِ صفحه‌بندی در یک سایت نباید یک نام داشته باشند. */
  label?: string;
}) {
  // یک صفحه یعنی چیزی برای پیمایش نیست.
  if (totalPages <= 1) return null;

  const slots = getPaginationSlots(page, totalPages);

  return (
    <nav aria-label={label} className="mt-10 flex items-center justify-center gap-1.5">
      <Step
        href={page > 1 ? href(page - 1) : null}
        label="صفحه‌ی قبل"
        icon={<ArrowRight size={15} />}
      />

      {/* عددها — روی موبایل پنهان، ولی در HTML حاضر. */}
      <ul className="hidden items-center gap-1.5 sm:flex">
        {slots.map((slot, index) =>
          slot === "gap" ? (
            /* «…» عنصرِ ناوبری نیست، پس از دیدِ اسکرین‌ریدر پنهان می‌شود؛
               وگرنه بین شماره‌ها یک «نقطه نقطه نقطه» خوانده می‌شود. */
            <li
              key={`gap-${index}`}
              aria-hidden
              className="px-1 text-xs text-faint select-none"
            >
              …
            </li>
          ) : (
            <li key={slot}>
              <PageChip href={href(slot)} page={slot} isActive={slot === page} />
            </li>
          ),
        )}
      </ul>

      {/* جایگزینِ موبایل.
          ⚠️ aria-hidden ندارد و نباید داشته باشد. نسخه‌ی اولش داشت، با این
          استدلال که «aria-current روی چیپِ فعال همین را می‌گوید» — ولی آن چیپ
          زیرِ ۶۴۰ پیکسل display:none است، و display:none عنصر را از درختِ
          دسترسی‌پذیری هم بیرون می‌برد نه فقط از دید. یعنی روی موبایل هر دو منبعِ
          موقعیت خفه می‌شدند و کاربرِ اسکرین‌ریدر هیچ راهی نداشت بفهمد در صفحه‌ی
          چندم از چند است. روی دسکتاپ هم sm:hidden خودش این خط را حذف می‌کند،
          پس تکرارِ اعلام پیش نمی‌آید. */}
      <span className="px-2 text-xs font-medium text-muted sm:hidden">
        صفحه‌ی {numFa.format(page)} از {numFa.format(totalPages)}
      </span>

      <Step
        href={page < totalPages ? href(page + 1) : null}
        label="صفحه‌ی بعد"
        icon={<ArrowLeft size={15} />}
      />
    </nav>
  );
}

/**
 * دکمه‌ی «قبلی/بعدی».
 *
 * href = null یعنی سرِ فهرستیم یا تهِ آن. آن حالت به‌جای لینکِ غیرفعال، یک
 * <span> می‌شود: لینکی که کاری نمی‌کند هم برای کیبورد یک توقفِ بی‌فایده است و هم
 * خزنده را به آدرسِ تکراری می‌فرستد. ولی از صفحه هم حذف نمی‌شود، وگرنه با هر
 * صفحه جای عددها یک تکان می‌خورد.
 */
function Step({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  const shape =
    "flex size-10 items-center justify-center rounded-full border text-muted transition-colors";

  if (href === null) {
    return (
      <span aria-hidden className={`${shape} border-line bg-surface text-faint/60`}>
        {icon}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${shape} border-line bg-canvas hover:border-accent/40 hover:text-accent`}
    >
      {icon}
    </Link>
  );
}

/** یک شماره‌ی صفحه. اندازه و رنگ‌ها همان چیپ‌های دسته‌بندی است تا صفحه دو زبانِ بصری نداشته باشد. */
function PageChip({ href, page, isActive }: { href: string; page: number; isActive: boolean }) {
  return (
    <Link
      href={href}
      // برای صفحه‌ی فعال aria-current="page" — تنها راهی که کاربرِ اسکرین‌ریدر
      // بفهمد کجاست. لینک می‌ماند و <span> نمی‌شود تا رفرشِ همان صفحه ممکن باشد.
      aria-current={isActive ? "page" : undefined}
      aria-label={`صفحه‌ی ${numFa.format(page)}`}
      className={`flex min-w-9 items-center justify-center rounded-full border px-2.5 py-2 text-xs transition-colors ${
        isActive
          ? "border-accent bg-accent font-bold text-white shadow-chip"
          : "border-line bg-canvas font-medium text-muted hover:border-accent/40 hover:text-accent"
      }`}
    >
      {numFa.format(page)}
    </Link>
  );
}
