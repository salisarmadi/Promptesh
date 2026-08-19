import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * خواندن ابعاد ذاتی یک تصویرِ محلی از روی فایل — مرحله‌ی placeholder.
 *
 * چرا لازم است؟ کامپوننت <Image> نکست برای جلوگیری از پرش چیدمان (CLS) و ساخت
 * srcset درست به width/height نیاز دارد. عکس‌های واقعی این ابعاد را موقع آپلود
 * در دیتابیس ذخیره می‌کنند، ولی placeholderهای فعلی فقط با url در دیتابیس‌اند،
 * پس ابعاد را همین‌جا از سرآیند خود فایل می‌خوانیم.
 *
 * ⚠️ موقتی و فقط سمت سرور: از فایل‌سیستم (public/) می‌خواند. وقتی تصاویر به
 * استوریج/CDN منتقل شدند، این فایل حذف می‌شود و به‌جایش ستون‌های width/height
 * روی جدول images (که pipeline آپلود/n8n پر می‌کند) خوانده خواهد شد.
 *
 * فقط PNG را پارس می‌کند (همه‌ی placeholderها PNG هستند). برای هر فرمت دیگر یا
 * خطای خواندن، null برمی‌گرداند و صفحه به نسبت‌تصویرِ پیش‌فرض برمی‌گردد.
 */

export type ImageSize = { width: number; height: number };

// امضای ۸‌بایتی PNG؛ چهار بایت اولش این عدد است.
const PNG_MAGIC = 0x89504e47;

export const getLocalImageSize = cache(async function getLocalImageSize(
  publicUrl: string
): Promise<ImageSize | null> {
  try {
    // url مثل «/placeholders/couple-01.png» → مسیر فایل زیر public/.
    // اسلش‌های ابتدایی را می‌گیریم تا join درست بماند؛ join خودش traversal را
    // عادی می‌کند و چون ورودی از دیتابیسِ خودمان است نه کاربر، ریسک مسیر نداریم.
    const relative = publicUrl.replace(/^\/+/, "");
    const absolute = path.join(process.cwd(), "public", relative);
    const buf = await readFile(absolute);

    // PNG: بعد از امضا، chunkِ IHDR است؛ width در آفست ۱۶ و height در ۲۰ (big-endian).
    if (buf.length >= 24 && buf.readUInt32BE(0) === PNG_MAGIC) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    return null;
  } catch {
    // فایل نبود یا خوانده نشد — بگذار صفحه با نسبت پیش‌فرض ادامه دهد.
    return null;
  }
});
