-- ---------------------------------------------------------------------------
-- migration 001 — افزودن ابعاد تصویر به جدول images
-- ---------------------------------------------------------------------------
--
-- چرا این فایل لازم است؟
--     db/schema.sql با CREATE TABLE IF NOT EXISTS نوشته شده. آن دستور روی
--     دیتابیسی که جدول‌هایش قبلاً ساخته شده «هیچ کاری نمی‌کند» — ستون جدید
--     اضافه نمی‌کند و هیچ خطایی هم نمی‌دهد. پس برای دیتابیسِ موجود باید
--     ALTER زد. schema.sql هم جدا آپدیت شده تا نصب‌های تازه از اول درست باشند.
--
-- چه چیزی را حل می‌کند؟
--     کامپوننت <Image> نکست برای جلوگیری از پرش چیدمان و ساخت srcset به
--     width/height نیاز دارد. تا الان این ابعاد در زمان رندر از روی فایل
--     خوانده می‌شد که دو مشکل داشت: فقط PNG را پارس می‌کرد (و محتوای واقعی
--     همه jpg است) و به ازای هر رندر کل فایل‌ها را از دیسک می‌خواند.
--
-- اجرا:
--     در کنسول SQL دیتابیس (Liara یا هر کلاینت دیگر) کل همین فایل را اجرا کن.
--     بی‌خطر و idempotent است: چند بار اجرا کردنش مشکلی ایجاد نمی‌کند.
--
-- بعد از این، محتوا را دوباره وارد کن تا ستون‌ها پر شوند:
--     node scripts/import-content.mjs --reset

BEGIN;

ALTER TABLE images ADD COLUMN IF NOT EXISTS width  INTEGER;
ALTER TABLE images ADD COLUMN IF NOT EXISTS height INTEGER;

-- CHECK را جدا اضافه می‌کنیم چون ADD COLUMN IF NOT EXISTS قید همراهش را
-- روی ستونِ از قبل موجود اعمال نمی‌کند. DO block برای idempotent بودن است:
-- اگر قید قبلاً هست، دوباره ساختنش خطای duplicate_object می‌دهد.
DO $$
BEGIN
    ALTER TABLE images ADD CONSTRAINT images_width_positive
        CHECK (width IS NULL OR width > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE images ADD CONSTRAINT images_height_positive
        CHECK (height IS NULL OR height > 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN images.width  IS 'عرض ذاتی تصویر به پیکسل؛ در زمان import از هدر فایل خوانده می‌شود';
COMMENT ON COLUMN images.height IS 'ارتفاع ذاتی تصویر به پیکسل؛ در زمان import از هدر فایل خوانده می‌شود';

COMMIT;

-- بررسی نتیجه (اختیاری):
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'images' AND column_name IN ('width','height');
