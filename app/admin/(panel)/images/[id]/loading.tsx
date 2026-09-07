/**
 * اسکلتِ بارگذاریِ صفحه‌ی ویرایش.
 * @see ./loading.tsx — همان فلسفه: فقط بخشِ در انتظارِ داده اسکلت می‌شود.
 */

const SKELETON = "animate-pulse rounded-card bg-surface";

export default function ImageEditLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className={`${SKELETON} h-6 w-40`} />
        <div className={`${SKELETON} h-3 w-64`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="flex flex-col gap-4 xl:col-span-3">
          <div className={`${SKELETON} h-96 w-full`} />
        </div>
        <div className="xl:col-span-2">
          <div className={`${SKELETON} h-80 w-full`} />
        </div>
      </div>
    </div>
  );
}
