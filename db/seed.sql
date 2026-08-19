-- ===========================================================================
--  گالری پرامپت — داده نمونه (seed) برای تست گرید
--  مبنا: بخش ۷ و ۵.۱ سند PRD
-- ===========================================================================
--
--  اجرا (بعد از اجرای schema.sql):
--    psql "$DATABASE_URL" -f db/seed.sql
--  یا در پنل Liara → دیتابیس → کنسول SQL، محتوای این فایل را paste کن.
--
--  چرا SQL و نه یک اسکریپت Node؟ چون دقیقاً با همان ابزاری اجرا می‌شود که
--  schema.sql را اجرا می‌کنی — نه پکیج تازه‌ای لازم است نه اجرای Node.
--
--  idempotent است: هر ID صریح داده شده و با ON CONFLICT (id) DO NOTHING
--  درج می‌شود، پس چند بار اجرا کردنش رکورد تکراری نمی‌سازد و خطا نمی‌دهد.
--  چون IDها را دستی می‌دهیم، سکانس IDENTITY جلو نمی‌رود؛ برای همین در انتهای
--  فایل با setval سکانس‌ها را تا آخرین ID موجود جلو می‌کشیم تا درج‌های واقعیِ
--  بعدی (بدون ID) به تضاد کلید اصلی نخورند.
--
--  چند نکته که عمداً در داده گنجانده‌ام تا تست گرید معنادار باشد:
--   • created_at به‌صورت «ضربدری» بین دسته‌ها پخش شده، نه دسته‌به‌دسته. پس در
--     مرتب‌سازی «جدیدترین»، بالای گرید ترکیبی از هر پنج دسته دیده می‌شود؛ اگر
--     همه‌ی بالایی‌ها یک‌دست از یک دسته بودند، یعنی سورت اشتباه گروه‌بندی کرده.
--   • likes_count با تازگی هم‌بستگی ندارد. محبوب‌ترین‌ها (۵۱۲، ۴۷۶، ۴۲۰)
--     جدیدترین‌ها نیستند، پس «محبوب‌ترین» و «جدیدترین» باید دو ترتیب متفاوت
--     نشان بدهند — راه ساده‌ی تشخیص اینکه سورت واقعاً کار می‌کند.
--   • هر تصویر placeholder رنگ دسته + شماره + نسبت‌تصویر متفاوت دارد، پس
--     فیلتر دسته و چیدمان ارتفاع‌های نابرابر هر دو چشمی قابل‌بررسی‌اند.
--   • چند عکس عمداً در بیش از یک دسته‌اند (رابطه چند‌به‌چند از طریق جدول
--     image_categories)، تا فیلتر دسته را در حالت واقعی «یک عکس، چند تب» تست کنی.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- دسته‌بندی‌ها (۵ تب گالری طبق بخش ۵.۱)
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, name_fa, slug) VALUES
    (1, 'کاپل',   'couple'),
    (2, 'پروفایل', 'profile'),
    (3, 'هنری',   'artistic'),
    (4, 'فانتزی', 'fantasy'),
    (5, 'طبیعت',  'nature')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- تصاویر (۶ در هر دسته = ۳۰ رکورد)
--   url به فایل‌های محلی public/placeholders/ اشاره می‌کند.
--   created_at با interval نسبت به now() ساخته می‌شود تا ترتیب واقعی داشته باشیم.
-- ---------------------------------------------------------------------------
INSERT INTO images (id, url, title_fa, model_used, likes_count, created_at) VALUES
    -- کاپل
    ( 1, '/placeholders/couple-01.png',   'زوج در غروب طلایی',         'Midjourney v6.1',    128, now() - interval '43 minutes'),
    ( 2, '/placeholders/couple-02.png',   'قدم‌زدن در باران توکیو',     'Stable Diffusion XL', 342, now() - interval '258 minutes'),
    ( 3, '/placeholders/couple-03.png',   'رقص در آشپزخانه آفتابی',     'DALL·E 3',            47, now() - interval '473 minutes'),
    ( 4, '/placeholders/couple-04.png',   'سایه عاشقان کنار دریا',      'Flux.1',             210, now() - interval '688 minutes'),
    ( 5, '/placeholders/couple-05.png',   'دستان گره‌خورده',            'Midjourney v6',        5, now() - interval '903 minutes'),
    ( 6, '/placeholders/couple-06.png',   'پیک‌نیک در مزرعه اسطوخودوس',  'Leonardo AI',         89, now() - interval '1118 minutes'),
    -- پروفایل
    ( 7, '/placeholders/profile-01.png',  'پرتره حرفه‌ای بانو',         'Midjourney v6.1',    512, now() - interval '86 minutes'),
    ( 8, '/placeholders/profile-02.png',  'آواتار سه‌بعدی',             'DALL·E 3',            76, now() - interval '301 minutes'),
    ( 9, '/placeholders/profile-03.png',  'پرتره تک‌خطی',               'Flux.1',              23, now() - interval '516 minutes'),
    (10, '/placeholders/profile-04.png',  'آواتار سایبرپانک',           'Stable Diffusion XL', 301, now() - interval '731 minutes'),
    (11, '/placeholders/profile-05.png',  'پرتره آبرنگ',                'Midjourney v6',      154, now() - interval '946 minutes'),
    (12, '/placeholders/profile-06.png',  'پرتره سیاه‌وسفید دراماتیک',   'Leonardo AI',          8, now() - interval '1161 minutes'),
    -- هنری
    (13, '/placeholders/artistic-01.png', 'هنر انتزاعی طلایی',          'Flux.1',             267, now() - interval '129 minutes'),
    (14, '/placeholders/artistic-02.png', 'کلاژ سوررئال',               'DALL·E 3',            33, now() - interval '344 minutes'),
    (15, '/placeholders/artistic-03.png', 'نقاشی امپرسیونیستی کافه',    'Midjourney v6.1',    420, now() - interval '559 minutes'),
    (16, '/placeholders/artistic-04.png', 'نوردهی مضاعف جنگل',          'Stable Diffusion XL',  91, now() - interval '774 minutes'),
    (17, '/placeholders/artistic-05.png', 'پرتره پاپ‌آرت',              'DALL·E 3',            12, now() - interval '989 minutes'),
    (18, '/placeholders/artistic-06.png', 'نقاشی مرکب ژاپنی',           'Midjourney v6',      188, now() - interval '1204 minutes'),
    -- فانتزی
    (19, '/placeholders/fantasy-01.png',  'جزایر شناور',                'Midjourney v6.1',    476, now() - interval '172 minutes'),
    (20, '/placeholders/fantasy-02.png',  'جنگل جادویی',                'Flux.1',             205, now() - interval '387 minutes'),
    (21, '/placeholders/fantasy-03.png',  'شوالیه و ویرانه باستانی',    'Stable Diffusion XL',  61, now() - interval '602 minutes'),
    (22, '/placeholders/fantasy-04.png',  'جادوگر افسونگر',             'Midjourney v6',      349, now() - interval '817 minutes'),
    (23, '/placeholders/fantasy-05.png',  'شهر شناور آینده',            'DALL·E 3',            17, now() - interval '1032 minutes'),
    (24, '/placeholders/fantasy-06.png',  'ققنوس در آتش',               'Leonardo AI',        233, now() - interval '1247 minutes'),
    -- طبیعت
    (25, '/placeholders/nature-01.png',   'طلوع کوهستان مه‌آلود',       'Flux.1',             398, now() - interval '215 minutes'),
    (26, '/placeholders/nature-02.png',   'شبنم روی تار عنکبوت',        'Midjourney v6.1',     52, now() - interval '430 minutes'),
    (27, '/placeholders/nature-03.png',   'مسیر جنگل پاییزی',           'Stable Diffusion XL', 144, now() - interval '645 minutes'),
    (28, '/placeholders/nature-04.png',   'آبشار استوایی',              'DALL·E 3',           279, now() - interval '860 minutes'),
    (29, '/placeholders/nature-05.png',   'آسمان پرستاره کوهستان',      'Midjourney v6',        6, now() - interval '1075 minutes'),
    (30, '/placeholders/nature-06.png',   'مزرعه شقایق',                'Leonardo AI',        167, now() - interval '1290 minutes')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- پرامپت‌ها (یک‌به‌یک با تصویر — قید UNIQUE روی image_id)
--   متن پرامپت به‌صورت LTR/مونواسپیس در UI نمایش داده می‌شود (بخش ۸)، پس
--   نمونه‌ها را مثل پرامپت‌های واقعی AI به انگلیسی نوشته‌ام.
--   prompts.id را برابر image_id گذاشته‌ام تا نگاشت ذهنی ساده بماند.
-- ---------------------------------------------------------------------------
INSERT INTO prompts (id, image_id, prompt_text) VALUES
    ( 1,  1, 'cinematic portrait of a young couple embracing at golden hour, soft rim light, 85mm lens, shallow depth of field, warm tones, photorealistic --ar 3:4'),
    ( 2,  2, 'a couple walking hand in hand through a rainy Tokyo street at night, neon reflections on wet pavement, bokeh, moody cinematic lighting --ar 3:4'),
    ( 3,  3, 'vintage film photograph of a couple dancing in a sunlit kitchen, film grain, nostalgic warm palette, shot on Kodak Portra 400'),
    ( 4,  4, 'two lovers silhouetted against a sunset over the ocean, dramatic sky, expressive watercolor illustration style'),
    ( 5,  5, 'macro close-up of a couple''s hands intertwined with wedding rings, soft natural light, elegant, high detail'),
    ( 6,  6, 'romantic couple having a picnic in a lavender field in Provence, dreamy pastel tones, wide angle, warm summer afternoon'),
    ( 7,  7, 'professional studio headshot of a confident woman, softbox lighting, neutral gray background, sharp focus, corporate portrait --ar 1:1'),
    ( 8,  8, 'stylized 3D avatar of a young man with glasses, Pixar-inspired style, soft lighting, friendly expression, clean background'),
    ( 9,  9, 'minimalist single continuous line-art portrait for a profile picture, black ink on cream background'),
    (10, 10, 'cyberpunk avatar with glowing neon face paint, holographic accents, dark moody background, digital art, vibrant'),
    (11, 11, 'loose watercolor portrait of a smiling person, visible brushstrokes, soft pastel palette, artistic profile picture'),
    (12, 12, 'dramatic black and white portrait, Rembrandt lighting, intense gaze, high contrast, fine art photography'),
    (13, 13, 'abstract fluid art, swirling gold and deep blue, marbled texture, high resolution, elegant modern wall art'),
    (14, 14, 'surreal collage of floating geometric shapes in a vast desert, Salvador Dali inspired, dreamlike, vivid colors'),
    (15, 15, 'impressionist oil painting of a Parisian café at dusk, thick expressive brushstrokes, warm evening light, Monet style'),
    (16, 16, 'artistic double exposure blending a human profile with a misty forest, muted earthy tones, conceptual'),
    (17, 17, 'bold pop-art portrait in the style of Andy Warhol, four-panel color variations, high saturation'),
    (18, 18, 'minimalist Japanese sumi-e ink wash painting of a mountain, generous negative space, single red sun, zen aesthetic'),
    (19, 19, 'epic fantasy landscape with floating islands and cascading waterfalls, dragons in a dramatic sky, concept art, highly detailed --ar 3:4'),
    (20, 20, 'enchanted forest at night with glowing mushrooms and drifting fairy lights, ethereal fog, magical atmosphere, digital painting'),
    (21, 21, 'armored knight standing before a colossal ancient ruin, cinematic scale, volumetric god rays, dark fantasy'),
    (22, 22, 'mystical sorceress casting a spell, swirling arcane energy, intricate ornate robes, fantasy character design, trending on artstation'),
    (23, 23, 'futuristic floating city above the clouds at sunset, sleek sci-fi architecture, warm glow, detailed matte painting'),
    (24, 24, 'a majestic phoenix rising from flames, vibrant orange and gold feathers, dramatic dark background, fantasy illustration'),
    (25, 25, 'misty mountain range at sunrise, layered fading peaks, soft pastel sky, aerial landscape photography --ar 4:5'),
    (26, 26, 'macro close-up of dew drops on a spider web at dawn, morning light, creamy bokeh background, nature photography'),
    (27, 27, 'autumn forest path covered in golden fallen leaves, warm sunlight filtering through the trees, peaceful, 4k'),
    (28, 28, 'turquoise waterfall in a lush tropical rainforest, long exposure silky water, vibrant greenery, National Geographic style'),
    (29, 29, 'starry night sky over a calm alpine lake, Milky Way reflected in the water, long exposure astrophotography'),
    (30, 30, 'field of red poppies under a dramatic cloudy sky, wide angle, vivid saturated colors, spring landscape')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- رابطه عکس ↔ دسته (جدول واسط چند‌به‌چند)
-- ---------------------------------------------------------------------------
-- هر عکس حداقل یک دسته دارد. عمداً چند عکس را چنددسته‌ای گذاشته‌ام تا وقتی
-- فیلتر گالری را تست می‌کنی حالت واقعی «یک عکس در چند تب» را ببینی:
--   • ۴ «سایه عاشقان کنار دریا»  → کاپل + طبیعت
--   • ۶ «پیک‌نیک مزرعه اسطوخودوس» → کاپل + طبیعت
--   • ۱۰ «آواتار سایبرپانک»       → پروفایل + هنری
--   • ۱۶ «نوردهی مضاعف جنگل»      → هنری + طبیعت
--   • ۱۹ «جزایر شناور»            → فانتزی + هنری + طبیعت  (سه‌دسته‌ای)
--   • ۲۴ «ققنوس در آتش»           → فانتزی + هنری
-- بقیه دقیقاً یک دسته دارند. (اگر بعداً «دستهٔ اصلی/کاور» خواستی، یک ستون
-- is_primary BOOLEAN به همین جدول اضافه می‌شود؛ الان لازم نیست.)
INSERT INTO image_categories (image_id, category_id) VALUES
    ( 1, 1),
    ( 2, 1),
    ( 3, 1),
    ( 4, 1), ( 4, 5),
    ( 5, 1),
    ( 6, 1), ( 6, 5),
    ( 7, 2),
    ( 8, 2),
    ( 9, 2),
    (10, 2), (10, 3),
    (11, 2),
    (12, 2),
    (13, 3),
    (14, 3),
    (15, 3),
    (16, 3), (16, 5),
    (17, 3),
    (18, 3),
    (19, 4), (19, 3), (19, 5),
    (20, 4),
    (21, 4),
    (22, 4),
    (23, 4),
    (24, 4), (24, 3),
    (25, 5),
    (26, 5),
    (27, 5),
    (28, 5),
    (29, 5),
    (30, 5)
ON CONFLICT (image_id, category_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- جلو کشیدن سکانس‌ها بعد از درج IDهای صریح.
-- بدون این، اولین درج واقعیِ بعدی (بدون id) دوباره از ۱ شروع می‌کند و به
-- تضاد کلید اصلی می‌خورد. GREATEST(...,1) برای وقتی است که جدول خالی بماند.
-- ---------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('categories', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('images',     'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM images),     1));
SELECT setval(pg_get_serial_sequence('prompts',    'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM prompts),    1));

COMMIT;

-- بررسی سریع بعد از اجرا (اختیاری):
--   -- تعداد عکس در هر دسته (چون چند‌به‌چند است، مجموع می‌تواند از ۳۰ بیشتر شود):
--   SELECT c.name_fa, count(*)
--     FROM image_categories ic JOIN categories c ON c.id = ic.category_id
--    GROUP BY c.name_fa ORDER BY c.name_fa;
--   -- عکس‌های چنددسته‌ای:
--   SELECT image_id, count(*) AS n FROM image_categories GROUP BY image_id HAVING count(*) > 1 ORDER BY image_id;
--   -- باید ۴، ۶، ۱۰، ۱۶، ۱۹ (=۳)، ۲۴ را برگرداند.
