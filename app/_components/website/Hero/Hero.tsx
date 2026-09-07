import Link from "next/link";
import type { HeroDeck } from "@/lib/gallery";
import { CategoryDeck } from "@/app/_components/website/CategoryDeck";
import { PromptSearch } from "@/app/_components/website/PromptSearch";
import { ArrowLeft } from "@/app/_components/ui/Icons";

/**
 * بالای صفحه — تیتر، دستِ کارت‌ها، جستجو، و دکمه‌ی ورود به گالری.
 *
 * ستونِ این بخش عمداً از گالریِ پایین باریک‌تر است (۶۴۰ و در دسکتاپ ۷۶۰ پیکسل،
 * در برابر max-w-6xl گرید). دلیلش این است که همه‌ی محتوای اینجا یک ستونِ
 * وسط‌چین است؛ کشیدنش تا عرضِ گرید، تیتر را به یک خطِ بسیار بلند و دستِ
 * کارت‌ها را به یک جزیره‌ی کوچک در وسطِ فضای خالی تبدیل می‌کرد.
 *
 * فقط در نمای بدون فیلتر رندر می‌شود. کاربری که جستجو کرده یا دسته زده دنبالِ
 * نتیجه‌ی خودش است و یک بلوکِ بزرگِ متحرکِ بی‌ربط نتایجش را از صفحه بیرون
 * می‌راند؛ در آن حالت جستجو به بالای گرید منتقل می‌شود، پس در هر دو حالت
 * دقیقاً یک نوارِ جستجو روی صفحه هست.
 */

export function Hero({ decks }: { decks: HeroDeck[] }) {
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col px-5 md:max-w-[760px] md:px-8">
      {/* ── تیتر ─────────────────────────────────────────────────────
          ⚠️ کشیده (ـ) فقط در «هرچــــی» به کار رفته و عمداً در نامِ برند نیامده.
          کشیده یک نویسه‌ی واقعی است، پس «پرامپتـِـش» با جستجوی «پرامپتش» تطبیق
          پیدا نمی‌کند — و تیترِ صفحه‌ی اصلی مهم‌ترین جای سایت برای جستجوی نامِ
          برند است. کسره (ِ) اما یک نشانه‌ی ترکیبی است که موتورهای جستجو
          نرمال‌سازی می‌کنند، پس هم می‌ماند و هم تلفظِ درست را می‌رساند. */}
      
      <h1 className="pb-2 pt-6 text-center leading-[1.53] text-ink-title md:pt-10">
        <span className="block text-[28px] font-medium md:text-[38px]">
        هرچــــی که لازم داری،
       </span>

       <span
        className="block text-[36px] font-extrabold md:text-[48px]"
         style={{
         backgroundImage:
        "linear-gradient(to bottom, #0066FF 0%, #0054D3 50%, #6DA8FF 93.75%)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    }}
  >
    پرامپتِش
    <span className="text-[28px] font-medium text-ink-title md:text-[38px]">
      {" "}اینجاس
      </span>
     </span>
       </h1> 
      
      {/* <h1 className="pb-2 pt-6 text-center leading-[1.53] text-ink-title md:pt-10">
        <span className="text-[28px] font-medium md:text-[38px]">هرچــــی که لازم داری، </span>
        <span
          className="text-[36px] font-extrabold md:text-[47px]"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, #0066FF 0%, #0054D3 50%, #6DA8FF 93.75%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          پرامپتِش
        </span>
          <span className="text-[28px] font-medium md:text-[38px]">
          {" "}اینجاس
          </span>
      </h1> */}

      {/* ── ریل و دستِ کارت‌ها ───────────────────────────────────────
          مقیاسِ ۱٫۲ در دسکتاپ با transform انجام می‌شود و نه با بزرگ‌کردنِ
          اندازه‌ها: این‌طور تمامِ نسبت‌های داخلیِ دست (جابه‌جاییِ جایگاه‌ها،
          چرخش، سایه) دست‌نخورده می‌مانند. mb-16 فضایی است که همین مقیاس
          می‌گیرد، وگرنه پایینِ دست روی نوارِ جستجو می‌افتاد. */}
      {decks.length > 0 ? (
        <div className="md:mb-16 md:origin-top md:scale-[1.2]">
          <CategoryDeck decks={decks} />
        </div>
      ) : null}

      <div className="pb-8 pt-5">
        <PromptSearch query="" category={null} />

        <Link
          href="#gallery"
          className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-field bg-accent text-[14px] font-bold text-white shadow-cta transition-transform active:scale-[0.98] md:h-[58px] md:text-[16px]"
        >
          <ArrowLeft size={16} />
          مشاهده گالری پرامپت
        </Link>
      </div>
    </section>
  );
}
