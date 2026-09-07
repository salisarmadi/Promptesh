/**
 * قالب‌بندیِ عدد و تاریخِ فارسی برای پنل.
 *
 * چرا جدا از صفحه‌ی گالری که همین کار را می‌کند: آن فایل نمونه‌های Intl خودش را
 * محلی می‌سازد و دست‌زدن به آن یعنی ریسک روی سایتِ عمومی، بی هیچ سودی. اینجا
 * نسخه‌ی پنل زندگی می‌کند و مستقل است.
 *
 * ⚠️ timeZone در همه‌ی نمونه‌ها صریح است و باید بماند. بدونش خروجی به منطقه‌ی
 *    زمانیِ ماشینِ سرور گره می‌خورد؛ روی Netlify آن UTC است و تاریخِ رکوردهای
 *    نزدیکِ نیمه‌شب یک روز عقب نشان داده می‌شد.
 *
 * ⚠️ همه‌ی این توابع باید سمتِ *سرور* صدا زده شوند و خروجیِ رشته‌ای‌شان پایین
 *    برود. اگر کامپوننتِ کلاینتی خودش تاریخ را فرمت کند، منطقه‌ی زمانیِ مرورگر
 *    با سرور یکی نیست و HTMLِ دو طرف نمی‌خواند → خطای هیدریت.
 */

const TIME_ZONE = "Asia/Tehran";

const numberFormatter = new Intl.NumberFormat("fa-IR");

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const relativeFormatter = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });

/** ۷۰۰ → «۷۰۰» */
export function faNum(value: number): string {
  return numberFormatter.format(value);
}

/** «۱۴ مرداد ۱۴۰۵» */
export function faDate(value: Date): string {
  return dateFormatter.format(value);
}

/** «۱۴ مرداد ۱۴۰۵، ۲۳:۱۵» */
export function faDateTime(value: Date): string {
  return dateTimeFormatter.format(value);
}

/**
 * «۳ روز پیش» / «دیروز» / «هم‌اکنون».
 *
 * numeric: "auto" است تا برای ۱ و ۲ واحد واژه‌ی طبیعی بدهد («دیروز» نه «۱ روز
 * پیش»). واحد بر اساس فاصله انتخاب می‌شود و از هفته/ماه/سال بالاتر نمی‌رود:
 * برای چیزی که سال‌ها پیش بوده، تاریخِ دقیق مفیدتر از «۲ سال پیش» است و
 * فراخوان باید faDate را صدا بزند.
 */
export function faRelative(value: Date, now: number = Date.now()): string {
  const seconds = Math.round((value.getTime() - now) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 45) return "هم‌اکنون";
  if (abs < 60 * 60) return relativeFormatter.format(Math.round(seconds / 60), "minute");
  if (abs < 60 * 60 * 24) return relativeFormatter.format(Math.round(seconds / 3600), "hour");
  if (abs < 60 * 60 * 24 * 7) return relativeFormatter.format(Math.round(seconds / 86400), "day");
  if (abs < 60 * 60 * 24 * 30)
    return relativeFormatter.format(Math.round(seconds / (86400 * 7)), "week");
  if (abs < 60 * 60 * 24 * 365)
    return relativeFormatter.format(Math.round(seconds / (86400 * 30)), "month");
  return relativeFormatter.format(Math.round(seconds / (86400 * 365)), "year");
}

/**
 * درصدِ صحیح، برای نوارهای پیشرفت.
 *
 * مخرجِ صفر → صفر و نه NaN: در پنلِ خالی، «NaN%» روی صفحه یک باگِ دیدنی است.
 * جلوی ۱۰۰٪ شدنِ گِردشده هم گرفته می‌شود تا نوارِ «تقریباً کامل» با «کامل»
 * اشتباه نشود.
 */
export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  const raw = (part / total) * 100;
  if (raw > 0 && raw < 1) return 1;
  if (raw < 100 && raw > 99) return 99;
  return Math.round(raw);
}
