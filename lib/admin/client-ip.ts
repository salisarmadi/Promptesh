import { headers } from "next/headers";

/**
 * IP کاربر، برای کلیدِ محدودکننده‌ی تلاشِ ورود.
 *
 * ترتیبِ هدرها تصادفی نیست، از قابل‌اعتمادترین به کم‌اعتمادترین:
 *
 *   x-nf-client-connection-ip — خودِ Netlify می‌گذارد و درخواستِ ورودی نمی‌تواند
 *       بازنویسی‌اش کند. مقصدِ دیپلوی همین است، پس در محیطِ واقعی معمولاً همین
 *       جواب می‌دهد.
 *   x-real-ip — قراردادِ nginx و چند پروکسیِ دیگر. یک مقدار، نه فهرست.
 *   x-forwarded-for — فهرستی از IPها. اولین عضو، IP کاربر است طبق قرارداد، ولی
 *       اگر جلوی اپ پروکسیِ قابل‌اعتماد نباشد همین عضو دقیقاً همان چیزی است که
 *       مهاجم خودش نوشته. برای همین آخرین گزینه است.
 *
 * ⚠️ هیچ‌کدام تضمینِ صحت نیست و منطقِ امنیتی نباید به تنهایی به این مقدار
 *    تکیه کند. تنها مصرفش کلیدِ سبدِ نرخ است، و آن ماژول خودش یک سبدِ سراسریِ
 *    مستقل از IP هم دارد که همین جعل‌پذیری را جبران می‌کند.
 *
 * وقتی هیچ هدری نیست (مثلاً dev روی localhost) رشته‌ی "unknown" برمی‌گردد.
 * یعنی همه‌ی درخواست‌های بی‌هدر یک سبدِ مشترک دارند — که در dev دقیقاً همان
 * رفتارِ درست است.
 */
export async function getClientIp(): Promise<string> {
  const store = await headers();

  const direct = store.get("x-nf-client-connection-ip") ?? store.get("x-real-ip");
  if (direct) {
    const value = direct.trim();
    if (value) return value;
  }

  const forwarded = store.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
