/**
 * قواعدِ خالصِ ساخت نوار صفحه‌بندی.
 *
 * این ماژول دربارهٔ URL، React یا ظاهر دکمه‌ها چیزی نمی‌داند. مسئولیتش فقط
 * انتخاب شماره‌صفحه‌ها و فاصله‌هاست؛ بنابراین هر صفحه‌ای که به pagination نیاز
 * داشته باشد، دقیقاً همین رفتارِ مرزی را خواهد داشت.
 */

export type PaginationSlot = number | "gap";

/** چند صفحه از هر طرفِ صفحهٔ فعلی دیده شود. */
const NEIGHBORS = 1;
/** تا این تعداد صفحه، همهٔ شماره‌ها بدون فاصله نشان داده می‌شوند. */
const COMPACT_UNTIL = 7;

/**
 * فهرستِ اسلات‌های نوار: شماره‌صفحه‌ها و جای‌خالی‌های «…».
 *
 * صفحهٔ اول و آخر همیشه حاضرند، همراه صفحهٔ فعلی و همسایه‌هایش. اگر میان دو
 * شماره فقط یک صفحه جا افتاده باشد، همان شماره نمایش داده می‌شود؛ در غیر این
 * صورت یک gap تولید می‌شود.
 */
export function getPaginationSlots(current: number, total: number): PaginationSlot[] {
  if (total <= COMPACT_UNTIL) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const wanted = new Set<number>([1, total]);
  for (let page = current - NEIGHBORS; page <= current + NEIGHBORS; page += 1) {
    if (page >= 1 && page <= total) wanted.add(page);
  }

  const sorted = [...wanted].sort((left, right) => left - right);
  const slots: PaginationSlot[] = [];
  let previous = 0;

  for (const page of sorted) {
    if (page - previous === 2) slots.push(page - 1);
    else if (page - previous > 2) slots.push("gap");

    slots.push(page);
    previous = page;
  }

  return slots;
}
