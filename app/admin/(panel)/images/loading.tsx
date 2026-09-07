/**
 * اسکلتِ بارگذاریِ فهرستِ تصاویر.
 *
 * ⚠️ تزئینِ فنی نیست: بدونِ این فایل، بینِ کلیک و رندرِ صفحه‌ی اول، کلِ چیدمانِ
 *    پنل از صفحه می‌پرد و مدیر یک پرشِ خالی می‌بیند. با آن، فقط همان بخشِ در
 *    انتظارِ داده (فیلترها + فهرست) اسکلت می‌شود و بقیه‌ی صفحه سر جایش می‌ماند.
 */

const SKELETON = "animate-pulse rounded-card bg-surface";

export default function ImagesLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* سرِ صفحه */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className={`${SKELETON} h-6 w-32`} />
          <div className={`${SKELETON} h-3 w-52`} />
        </div>
        <div className={`${SKELETON} h-9 w-28 rounded-pill`} />
      </div>

      {/* نوارِ فیلتر */}
      <div className={`${SKELETON} h-24 w-full`} />

      {/* فهرست */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${SKELETON} h-20 w-full`} />
        ))}
      </div>
    </div>
  );
}
