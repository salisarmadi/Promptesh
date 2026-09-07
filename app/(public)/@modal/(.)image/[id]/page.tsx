import { Suspense } from "react";
import { connection } from "next/server";
import { getGalleryImage } from "@/lib/gallery";
import { parseImageId } from "@/lib/urls";
import { Modal } from "@/app/_components/website/Modal";
import { ImageDetail, IMAGE_TITLE_ID } from "@/app/_components/website/ImageDetail";

/**
 * مسیرِ رهگیرِ مودال.
 *
 * ── حسابِ مسیر، که راحت اشتباه می‌شود ──
 * این فایل در app/(public)/@modal/(.)image/[id] است و /image/[id] را رهگیری
 * می‌کند. علتِ (.) و نه (..): پیشوندها بر اساس *سگمنتِ مسیر* شمرده می‌شوند، و نه
 * (public) گروهِ مسیر است و نه @modal اسلات — هیچ‌کدام سگمنت نیستند. پس از دیدِ
 * روتر، این پوشه و app/(public)/image در یک سطح‌اند: «همان سطح» = (.).
 *
 * ── چه وقت این رندر می‌شود و چه وقت صفحه‌ی واقعی ──
 * ناوبریِ نرم از داخلِ گالری → این فایل، و اسلاتِ children (خودِ گالری) دست
 * نمی‌خورد؛ پس گرید و اسکرولش سرِ جایشان می‌مانند و مودال رویشان می‌آید.
 * بازکردنِ مستقیمِ آدرس یا رفرش → رهگیری اتفاق نمی‌افتد، [...catchAll] این اسلات
 * را null می‌کند و app/(public)/image/[id]/page.tsx صفحه‌ی کامل را می‌دهد.
 * بدنه‌ی هر دو ImageDetail است، پس محتوا نمی‌تواند بین دو مسیر واگرا شود.
 *
 * ── چرا Suspense داخلِ صفحه و نه فایلِ loading.tsx ──
 * loading.tsx مرزِ Suspense را *دورِ کلِ* این کامپوننت می‌گذارد. آن‌وقت <Modal>ی
 * که در حالتِ لودینگ رندر می‌شود و <Modal>ی که بعدش می‌آید دو نمونه‌ی جدا از
 * ری‌اکت‌اند (فرزندِ fallback و فرزندِ محتوا یک instance نیستند)، پس برگه دو بار
 * از پایین بالا می‌آید و در چشم می‌پرد. با این شکل، پوسته‌ی مودال یک بار mount
 * می‌شود و فقط محتوای درونش عوض می‌شود.
 *
 * هزینه‌اش را صریح بنویسم: مسیرهای dynamic بی loading.tsx اصلاً prefetch
 * نمی‌شوند. پس کلیک روی کارت یک رفت‌وبرگشت به سرور دارد که پیش‌تر (با مودالِ
 * کلاینتی) نداشت. در عوض پوسته‌ی مودال با اولین بایت‌های پاسخ می‌آید و اسکلت
 * جایش را پر می‌کند، و کوئریِ یک ردیف با کلیدِ اصلی چند میلی‌ثانیه است.
 */
export default function InterceptedImagePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Modal labelledBy={IMAGE_TITLE_ID}>
      <Suspense fallback={<DetailSkeleton />}>
        {/* params عمداً همین‌جا await نمی‌شود: خواندنش این کامپوننت را منتظر
            می‌کرد و پوسته‌ی مودال هم با آن عقب می‌افتاد. promise پاس داده می‌شود
            و پایینِ مرزِ Suspense باز می‌شود. */}
        <ModalBody params={params} />
      </Suspense>
    </Modal>
  );
}

async function ModalBody({ params }: { params: Promise<{ id: string }> }) {
  // prerender را متوقف می‌کند. زیرِ مرزِ Suspense است تا پوسته منتظرش نماند.
  // ⚠️ لازم است چون مستندِ مسیرهای موازی می‌گوید اسلات‌های یک سطح نمی‌توانند
  // یکی prerender و یکی dynamic باشند، و اسلاتِ children (گالری) dynamic است.
  await connection();

  const { id: rawId } = await params;
  const id = parseImageId(rawId);
  if (!id) return <ModalMessage title="این تصویر پیدا نشد" body="آدرس معتبر نیست." />;

  let img;
  try {
    img = await getGalleryImage(id);
  } catch {
    // ⚠️ اینجا عمداً DbNotice کاملِ صفحه‌ی گالری نمی‌آید: آن کارت با max-w-lg و
    // py-20 داخلِ برگه‌ی ۶۲۰ پیکسلی یک دیوارِ متن می‌شود. پیامِ کوتاه + راهِ
    // بیرون کافی است، و اگر کاربر واقعاً درگیرِ راه‌اندازی باشد، رفرشِ همین آدرس
    // صفحه‌ی کامل و پیامِ کاملش را می‌آورد.
    return (
      <ModalMessage
        title="الان نمی‌شود این تصویر را خواند"
        body="اتصال به دیتابیس برقرار نشد. چند لحظه بعد دوباره امتحان کن."
      />
    );
  }

  // ردیف بین رندرِ گرید و بازشدنِ مودال حذف شده — نادر ولی ممکن. notFound()
  // اینجا اشتباه است: کلِ صفحه (شاملِ گریدِ پشتِ مودال) به صفحه‌ی ۴۰۴ می‌رفت،
  // برای عکسی که کاربر فقط رویش کلیک کرده بود.
  if (!img) {
    return (
      <ModalMessage
        title="این تصویر پیدا نشد"
        body="شاید همین حالا حذف شده. بقیه‌ی گالری سرِ جایش است."
      />
    );
  }

  return <ImageDetail img={img} variant="modal" />;
}

/**
 * پیامِ کوتاهِ داخلِ مودال.
 *
 * تیتر همان IMAGE_TITLE_ID را می‌گیرد چون aria-labelledby مودال به آن اشاره
 * دارد؛ بی این، در حالتِ خطا مودال برای اسکرین‌ریدر بی‌نام می‌شد.
 */
function ModalMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 pb-8 pt-4 text-center">
      <h2 id={IMAGE_TITLE_ID} className="text-[13px] font-bold text-ink">
        {title}
      </h2>
      <p className="text-[11.5px] leading-relaxed text-faint">{body}</p>
    </div>
  );
}

/**
 * اسکلتِ محتوا تا رسیدنِ داده.
 *
 * چیدمانش عیناً همان ImageDetail است (دو ستون در دسکتاپ، یک ستون در موبایل) تا
 * وقتی محتوا می‌نشیند، ارتفاع نپرد. تیتر هم اینجا هست و همان id را دارد، پس
 * مودال در همین لحظه هم نامِ قابلِ اعلام دارد.
 */
function DetailSkeleton() {
  return (
    <div className="md:grid md:grid-cols-2">
      <div className="px-4 md:py-4">
        <div className="aspect-[4/5] w-full animate-pulse rounded-[20px] bg-surface" />
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <p id={IMAGE_TITLE_ID} className="sr-only">
          در حال بارگذاریِ تصویر
        </p>
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface" aria-hidden />
        <div className="flex gap-1.5" aria-hidden>
          <div className="h-6 w-16 animate-pulse rounded-full bg-surface" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-surface" />
        </div>
        <div className="h-40 w-full animate-pulse rounded-field bg-surface" aria-hidden />
        <div className="h-12 w-full animate-pulse rounded-field bg-surface" aria-hidden />
      </div>
    </div>
  );
}
