import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db";
import { buildFilter, whereClause } from "@/lib/gallery";
import type { ImageListQuery, ImageListSort, MissingField } from "@/lib/admin/image-list";

/**
 * لایه‌ی SQL فهرست و ویرایشِ تصاویر در پنل.
 *
 * ⚠️ فقط سمتِ سرور (به pg وابسته است). هر تابعِ اینجا باید از جایی صدا زده شود
 *    که قبلش requireAdmin() اجرا شده باشد — این فایل خودش مجوز نمی‌سنجد.
 *
 * ── چه چیزی از گالری قرض گرفته شده و چرا ──
 * buildFilter و whereClause از lib/gallery.ts می‌آیند، دوباره نوشته نشده‌اند.
 * یعنی جستجوی «پرتره» در پنل دقیقاً همان‌قدر نتیجه می‌دهد که در سایتِ عمومی:
 * همان یکسان‌سازیِ «ي/ك/نیم‌فاصله»، همان escapeِ % و _، همان فیلترِ دسته با
 * EXISTS. اگر پنل تعریفِ خودش را داشت، مدیر عددی می‌دید که با سایت نمی‌خواند و
 * هیچ‌کدام هم غلط به نظر نمی‌رسید.
 *
 * پنل روی آن‌ها فقط *می‌افزاید*: محورِ missing و ترتیب‌های تازه.
 *
 * ── وابستگیِ آگاهانه به مهاجرت ۰۰۲ ──
 * این فایل i.updated_at را می‌خواند و می‌نویسد، پس بدونِ مهاجرت ۰۰۲ خطای ۴۲۷۰۳
 * می‌دهد. این عمدی است و پوشانده نشده: صفحه خطا را با classifyDbError به کارتِ
 * «مهاجرت را اجرا کن» تبدیل می‌کند. مسیرِ نوشتن هم بی مهاجرت ۰۰۲ ناقص است (چون
 * باید updated_at را خودش ست کند)، پس پنهان‌کردنِ ستون فقط خطا را به بعد
 * می‌انداخت. داشبورد تنها استثناست و باید بی‌مهاجرت هم کار کند — چون همان
 * صفحه‌ای است که *می‌گوید* مهاجرت را اجرا کن.
 */

/**
 * تعدادِ ردیفِ هر صفحه در پنل.
 *
 * ۲۴ و نه ۶۰ مثل گالری: ردیفِ پنل بلندتر است (تصویرِ بندانگشتی + عنوان +
 * برچسب‌ها + تاریخ + دکمه‌ها) و مدیر اینجا «کار می‌کند» نه «مرور». صفحه‌ی
 * ۶۰-ردیفی یعنی چند بار اسکرول تا رسیدن به نوارِ صفحه‌بندی، و در انتخابِ
 * چندتایی هم انتخابِ ۶۰ ردیف با یک تیک خطرناک است.
 */
export const ADMIN_PAGE_SIZE = 24;

/**
 * سقفِ متنِ پرامپت در فهرست.
 *
 * ردیف دو خط جا دارد. فرستادنِ پرامپتِ کاملِ ~۱۲۰۰ کاراکتری برای ۲۴ ردیف
 * ۲۹ کیلوبایت HTML است که بیشترش دیده نمی‌شود. متنِ کامل در صفحه‌ی ویرایش است.
 */
const PROMPT_EXCERPT = 150;

/**
 * سقفِ شناسه در عملیاتِ گروهی.
 *
 * چرا لازم است: شناسه‌ها از فیلدهای checkbox فرم می‌آیند و فرم را می‌توان دستی
 * ساخت. بی سقف، یک درخواست می‌تواند آرایه‌ای با صدها هزار عضو بفرستد و کوئری را
 * از پا بیندازد. ۲۰۰ از ADMIN_PAGE_SIZE بزرگ‌تر است، پس «انتخابِ همه‌ی این
 * صفحه» هیچ‌وقت به سقف نمی‌خورد.
 */
const MAX_BULK_IDS = 200;

// ---------------------------------------------------------------------------
// شرط‌های «پر نشده»
// ---------------------------------------------------------------------------

/**
 * تعریفِ *یگانه‌ی* «این فیلد پر نشده».
 *
 * ⚠️ این ثابت را lib/admin/queries.ts (شمارنده‌های داشبورد) هم مصرف می‌کند و
 *    باید بکند. دلیلش یک باگِ خیلی مشخص است: کارتِ «کامل‌بودنِ داده» در داشبورد
 *    می‌گوید «۱۲ تصویر بدونِ پرامپت» و لینکش به ?missing=prompt می‌رود. اگر
 *    فهرست شرطِ خودش را داشت، آن لینک می‌توانست ۹ ردیف نشان دهد و هیچ‌کس
 *    نمی‌فهمید کدام عدد درست است.
 *
 * ⚠️ همه‌ی شرط‌ها به نامِ مستعارِ `i` برای images وابسته‌اند (مثلِ شرط‌های
 *    buildFilter). نام‌های مستعارِ زیرکوئری‌ها هم عمداً mp/mic هستند تا با
 *    f/fc/sp/sic/sc در lib/gallery.ts برخورد نکنند؛ در یک WHERE مشترک
 *    می‌نشینند.
 */
export const MISSING_CONDITION: Record<MissingField, string> = {
  prompt: "NOT EXISTS (SELECT 1 FROM prompts mp WHERE mp.image_id = i.id)",
  // فقط IS NULL کافی نیست: رشته‌ی خالی و رشته‌ی پرفاصله هم «بی‌عنوان»اند و در
  // فهرست همان‌قدر بی‌استفاده. btrim هر دو را یکی می‌کند.
  title: "(i.title_fa IS NULL OR length(btrim(i.title_fa)) = 0)",
  category: "NOT EXISTS (SELECT 1 FROM image_categories mic WHERE mic.image_id = i.id)",
  // یکی از دو بعد هم که نباشد، <Image> نکست بی‌فایده است و نسبت‌تصویر نداریم.
  dimensions: "(i.width IS NULL OR i.height IS NULL)",
};

/**
 * نگاشتِ ثابتِ ترتیب → SQL.
 *
 * مهم (امنیت): ورودی کاربر هرگز در SQL درج نمی‌شود؛ فقط می‌تواند کلیدِ همین شیء
 * باشد و parseImageListQuery هم قبلش هر مقدارِ ناشناخته را به پیش‌فرض برگردانده.
 *
 * tie-breakerِ i.id در همه‌شان هست تا ترتیب قطعی باشد. بی آن، دو ردیف با
 * created_at یکسان می‌توانند بین صفحه‌ی ۱ و ۲ جابه‌جا شوند و یکی دو بار دیده شود
 * و یکی هیچ‌وقت.
 *
 * NULLS LAST در updated و title عمدی است: ردیفِ ویرایش‌نشده و ردیفِ بی‌عنوان
 * کم‌ترین اطلاعات را دارند و بالای فهرست جایشان نیست.
 */
const ORDER_BY: Record<ImageListSort, string> = {
  newest: "i.created_at DESC, i.id DESC",
  oldest: "i.created_at ASC, i.id ASC",
  updated: "i.updated_at DESC NULLS LAST, i.created_at DESC, i.id DESC",
  title: "i.title_fa ASC NULLS LAST, i.id DESC",
};

// ---------------------------------------------------------------------------
// نوع‌ها
// ---------------------------------------------------------------------------

/**
 * دسته، این‌بار با id.
 *
 * چرا برخلافِ GalleryCategory که فقط slug دارد: فرمِ ویرایش با id کار می‌کند نه
 * slug — چون slug قابلِ تغییر است و اگر مدیر در تبِ دیگری slug را عوض کند،
 * ذخیره‌ی فرم بی‌صدا دسته را از دست می‌داد.
 *
 * id رشته است چون BIGINT است و در SQL با ::text کست می‌شود (داخلِ
 * json_build_object بی این کست عدد می‌شد و با بقیه‌ی کد نمی‌خواند).
 */
export type AdminImageCategory = { id: string; slug: string; name_fa: string };

/** یک ردیفِ فهرست. */
export type AdminImageRow = {
  id: string;
  url: string;
  title_fa: string | null;
  model_used: string | null;
  likes_count: number;
  created_at: Date;
  /** null یعنی «از زمانِ مهاجرت دست نخورده»، نه «همین حالا ساخته شده». */
  updated_at: Date | null;
  width: number | null;
  height: number | null;
  /** طولِ کلِ پرامپت (نه طولِ چکیده). null یعنی پرامپتی ثبت نشده. */
  prompt_length: number | null;
  prompt_excerpt: string | null;
  categories: AdminImageCategory[];
};

/** ردیفِ کاملِ صفحه‌ی ویرایش — با متنِ کاملِ پرامپت. */
export type AdminImageDetail = {
  id: string;
  url: string;
  title_fa: string | null;
  model_used: string | null;
  likes_count: number;
  created_at: Date;
  updated_at: Date | null;
  width: number | null;
  height: number | null;
  prompt_text: string | null;
  categories: AdminImageCategory[];
};

/** گزینه‌ی چک‌باکسِ دسته در فرم، با شمارِ فعلی‌اش. */
export type AdminCategoryOption = {
  id: string;
  slug: string;
  name_fa: string;
  image_count: number;
};

/** ورودیِ ساخت و ویرایش. همه‌ی پاک‌سازی قبلاً در Server Action انجام شده. */
export type AdminImageInput = {
  url: string;
  titleFa: string | null;
  modelUsed: string | null;
  width: number | null;
  height: number | null;
  /** null یا رشته‌ی خالی یعنی «پرامپت نداشته باش» → ردیفِ prompts حذف می‌شود. */
  promptText: string | null;
  categoryIds: string[];
};

// ---------------------------------------------------------------------------
// اعتبارسنجیِ شناسه
// ---------------------------------------------------------------------------

/**
 * شناسه‌ی BIGINT فقط رقم است.
 *
 * ⚠️ این بررسی اختیاری نیست. شناسه‌ها به‌صورتِ پارامتر می‌روند (پس تزریقِ SQL
 *    ممکن نیست) ولی کستِ '12a'::bigint خطای ۲۲P02 می‌دهد و صفحه را با خطای
 *    ۵۰۰ می‌اندازد. با فیلترِ قبلی، شناسه‌ی بی‌معنی صرفاً «پیدا نشد» می‌شود.
 *
 * سقفِ ۱۹ رقم چون BIGINT بیشتر از آن جا نمی‌شود (خطای سرریز، نه نتیجه‌ی خالی).
 */
const ID_PATTERN = /^[0-9]{1,19}$/;

export function isValidId(raw: unknown): raw is string {
  return typeof raw === "string" && ID_PATTERN.test(raw);
}

/** شناسه‌های معتبر و یکتا، حداکثر MAX_BULK_IDS تا. */
function sanitizeIds(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    if (!isValidId(value)) continue;
    seen.add(value);
    if (seen.size >= MAX_BULK_IDS) break;
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// خواندن
// ---------------------------------------------------------------------------

type ListRow = AdminImageRow & { total_count: number };

/**
 * یک صفحه از فهرست، به‌همراهِ تعدادِ کلِ نتایجِ فیلتر.
 *
 * چرا total در همان کوئری با count(*) OVER () و نه یک کوئریِ شمارشِ جدا:
 * دیتابیس دور است و هر رفت‌وبرگشت هزینه دارد. تابعِ پنجره‌ای *بعد از* GROUP BY
 * و *قبل از* LIMIT ارزیابی می‌شود، پس با GROUP BY i.id عددش دقیقاً «تعدادِ
 * تصاویرِ منطبق پیش از صفحه‌بندی» است. اگر هیچ ردیفی منطبق نباشد، هیچ ردیفی
 * برنمی‌گردد و total طبیعتاً صفر می‌شود.
 *
 * ⚠️ صفحه‌ی خارج از محدوده اینجا خطا نیست و آرایه‌ی خالی با totalِ درست
 *    برمی‌گرداند. تصمیمِ «به صفحه‌ی آخر بفرست» کارِ خودِ صفحه است، چون فقط آن
 *    می‌تواند redirect کند.
 */
export async function listAdminImages(
  filters: ImageListQuery,
  pageSize: number = ADMIN_PAGE_SIZE
): Promise<{ rows: AdminImageRow[]; total: number }> {
  // همان معناهای فیلترِ سایتِ عمومی — دوباره نوشته نشده.
  const { conditions, params } = buildFilter({
    categorySlug: filters.category ?? undefined,
    search: filters.q.length > 0 ? filters.q : undefined,
  });

  // افزودنِ محورِ پنل. بی پارامتر است، پس شماره‌گذاری $n را به‌هم نمی‌زند.
  if (filters.missing) conditions.push(MISSING_CONDITION[filters.missing]);

  // ⚠️ شماره‌ی هر پارامترِ تازه از params.length گرفته می‌شود، نه عددِ ثابت —
  //    وگرنه با اضافه‌شدنِ یک فیلتر به buildFilter، جای $n اینجا می‌لنگد.
  params.push(PROMPT_EXCERPT);
  const excerptPos = params.length;
  params.push(pageSize);
  const limitPos = params.length;
  params.push(Math.max(0, (filters.page - 1) * pageSize));
  const offsetPos = params.length;

  const rows = await query<ListRow>(
    `SELECT i.id,
            i.url,
            i.title_fa,
            i.model_used,
            i.likes_count,
            i.created_at,
            i.updated_at,
            i.width,
            i.height,
            -- پرامپت ۱:۱ است، پس زیرکوئریِ اسکالر (همان الگوی lib/gallery.ts):
            -- فقط به i.id وابسته است و با GROUP BY سازگار می‌ماند، بی آنکه
            -- لازم باشد ستونِ متنیِ بلند در کلیدِ گروه‌بندی بنشیند.
            (SELECT length(p.prompt_text) FROM prompts p WHERE p.image_id = i.id)
              AS prompt_length,
            (SELECT left(p.prompt_text, $${excerptPos}::int) FROM prompts p WHERE p.image_id = i.id)
              AS prompt_excerpt,
            COALESCE(
              json_agg(
                json_build_object('id', c.id::text, 'slug', c.slug, 'name_fa', c.name_fa)
                ORDER BY c.name_fa
              ) FILTER (WHERE c.id IS NOT NULL),
              '[]'::json
            ) AS categories,
            -- تابعِ پنجره‌ای بعد از GROUP BY ارزیابی می‌شود ⇒ تعدادِ گروه‌ها،
            -- یعنی تعدادِ تصاویرِ منطبق، نه تعدادِ ردیف‌های JOIN.
            (count(*) OVER ())::int AS total_count
       FROM images i
       LEFT JOIN image_categories ic ON ic.image_id = i.id
       LEFT JOIN categories c ON c.id = ic.category_id${whereClause(conditions)}
      GROUP BY i.id
      ORDER BY ${ORDER_BY[filters.sort]}
      LIMIT $${limitPos} OFFSET $${offsetPos}`,
    params
  );

  return {
    rows: rows.map(({ total_count, ...row }) => {
      void total_count;
      return row;
    }),
    total: rows[0]?.total_count ?? 0,
  };
}

/**
 * یک تصویر با متنِ کاملِ پرامپت و شناسه‌ی دسته‌هایش.
 *
 * null یعنی «چنین تصویری نیست» — که فراخوان باید به notFound() تبدیلش کند،
 * ⚠️ اما بیرونِ هر try/catch، وگرنه استثنای مسیریابیِ نکست به‌عنوان خطای
 *    دیتابیس دسته‌بندی می‌شود و کارتِ خطای بی‌ربط نشان داده می‌شود.
 */
export async function getAdminImage(id: string): Promise<AdminImageDetail | null> {
  if (!isValidId(id)) return null;

  const rows = await query<AdminImageDetail>(
    `SELECT i.id,
            i.url,
            i.title_fa,
            i.model_used,
            i.likes_count,
            i.created_at,
            i.updated_at,
            i.width,
            i.height,
            (SELECT p.prompt_text FROM prompts p WHERE p.image_id = i.id) AS prompt_text,
            COALESCE(
              json_agg(
                json_build_object('id', c.id::text, 'slug', c.slug, 'name_fa', c.name_fa)
                ORDER BY c.name_fa
              ) FILTER (WHERE c.id IS NOT NULL),
              '[]'::json
            ) AS categories
       FROM images i
       LEFT JOIN image_categories ic ON ic.image_id = i.id
       LEFT JOIN categories c ON c.id = ic.category_id
      WHERE i.id = $1::bigint
      GROUP BY i.id`,
    [id]
  );

  return rows[0] ?? null;
}

/**
 * همه‌ی دسته‌ها برای چک‌باکس‌های فرم.
 *
 * ترتیب بر اساس شمارِ نزولی، همان ترتیبِ getCategories در سایتِ عمومی — تا مدیر
 * دو نظمِ متفاوت در دو جای پروژه نبیند. شمار هم نمایش داده می‌شود چون در انتخابِ
 * دسته کمک می‌کند بفهمی «پرتره» دسته‌ی اصلی است و «گروهی» حاشیه‌ای.
 *
 * دسته‌ی بی‌عکس هم می‌آید (LEFT JOIN): تازه ساخته شده و باید بتوان انتخابش کرد.
 */
export async function listCategoryOptions(): Promise<AdminCategoryOption[]> {
  return query<AdminCategoryOption>(
    `SELECT c.id::text AS id,
            c.slug,
            c.name_fa,
            count(ic.image_id)::int AS image_count
       FROM categories c
       LEFT JOIN image_categories ic ON ic.category_id = c.id
      GROUP BY c.id, c.slug, c.name_fa
      ORDER BY count(ic.image_id) DESC, c.name_fa`
  );
}

// ---------------------------------------------------------------------------
// نوشتن
// ---------------------------------------------------------------------------

/**
 * جایگزینیِ کاملِ دسته‌های یک تصویر.
 *
 * چرا «حذفِ آنچه نیست + درجِ آنچه نیست» و نه «همه را حذف کن، بعد درج کن»:
 * روشِ دوم برای تصویری که دسته‌هایش عوض نشده هم همه‌ی ردیف‌ها را دور می‌ریزد و
 * از نو می‌سازد؛ بی‌فایده و فقط قفل و WAL بیشتر.
 *
 * ⚠️ شناسه‌ی دسته‌ای که وجود ندارد بی‌صدا نادیده گرفته می‌شود (JOIN با categories
 *    و نه اتکا به کلیدِ خارجی). این عمدی است: اگر مدیر در تبِ دیگری دسته‌ای را
 *    حذف کرده باشد، ذخیره‌ی این فرم نباید با خطای ۲۳۵۰۳ شکست بخورد و کلِ
 *    ویرایشِ متن را از دست بدهد.
 */
async function replaceCategories(
  client: PoolClient,
  imageId: string,
  categoryIds: string[]
): Promise<void> {
  const ids = sanitizeIds(categoryIds);

  // آرایه‌ی خالی → همه حذف می‌شوند (<> ALL('{}') برابرِ TRUE است).
  await client.query(
    `DELETE FROM image_categories
      WHERE image_id = $1::bigint
        AND category_id <> ALL($2::bigint[])`,
    [imageId, ids]
  );

  if (ids.length === 0) return;

  await client.query(
    `INSERT INTO image_categories (image_id, category_id)
     SELECT $1::bigint, c.id
       FROM categories c
      WHERE c.id = ANY($2::bigint[])
     ON CONFLICT DO NOTHING`,
    [imageId, ids]
  );
}

/**
 * درج یا به‌روزرسانیِ پرامپت، یا حذفش اگر متن خالی شده باشد.
 *
 * ON CONFLICT (image_id) قید یکتای ستونی را استنباط می‌کند — همان UNIQUE که
 * رابطه‌ی ۱:۱ را در اسکیما تضمین می‌کند. پس دو ردیفِ پرامپت برای یک تصویر ممکن
 * نیست، حتی اگر دو ذخیره‌ی همزمان برسد.
 *
 * ⚠️ متنِ خالی به‌معنای «دست نزن» نیست، به‌معنای «پرامپت را بردار» است. اسکیما
 *    CHECK (length(btrim(prompt_text)) > 0) دارد، پس ذخیره‌ی رشته‌ی خالی خطای
 *    قید می‌داد؛ حذف تنها معنای درست است.
 */
async function upsertPrompt(
  client: PoolClient,
  imageId: string,
  promptText: string | null
): Promise<void> {
  const text = promptText?.trim() ?? "";

  if (text.length === 0) {
    await client.query(`DELETE FROM prompts WHERE image_id = $1::bigint`, [imageId]);
    return;
  }

  await client.query(
    `INSERT INTO prompts (image_id, prompt_text)
     VALUES ($1::bigint, $2)
     ON CONFLICT (image_id) DO UPDATE SET prompt_text = EXCLUDED.prompt_text`,
    [imageId, text]
  );
}

/**
 * ساختِ تصویرِ تازه. شناسه‌ی ردیفِ ساخته‌شده را برمی‌گرداند.
 *
 * ⚠️ updated_at عمداً ست *نمی‌شود*. مهاجرت ۰۰۲ این ستون را بی تریگر اضافه کرد و
 *    NULL در آن یعنی «هرگز ویرایش نشده». برای ردیفی که همین حالا ساخته شده،
 *    created_at همان اطلاعات را دقیق‌تر می‌دهد؛ پر کردنِ updated_at فقط ستونِ
 *    «آخرین ویرایش» را با «تاریخِ ساخت» یکی می‌کرد و بی‌معنا.
 *
 * ⚠️ url هیچ نرمال‌سازی‌ای نمی‌شود و همان‌طور که داده شده ذخیره می‌شود. شکلِ
 *    فعلیِ url در دیتابیس قرارداد سایتِ عمومی است و دست‌زدن به آن اینجا یعنی
 *    ریسکِ شکستنِ گالری. اتصال به Storage کارِ مرحله‌ی بعد است.
 */
export async function createAdminImage(input: AdminImageInput): Promise<string> {
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO images (url, title_fa, model_used, width, height)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text AS id`,
      [input.url, input.titleFa, input.modelUsed, input.width, input.height]
    );

    const id = result.rows[0]?.id;
    // نباید پیش بیاید (INSERT یا موفق است یا throw می‌کند) ولی ! نمی‌زنیم:
    // اگر روزی این کوئری عوض شد، خطای صریح بهتر از undefinedِ خزنده است.
    if (!id) throw new Error("درجِ تصویر شناسه‌ای برنگرداند.");

    await upsertPrompt(client, id, input.promptText);
    await replaceCategories(client, id, input.categoryIds);

    return id;
  });
}

/**
 * ویرایشِ تصویر. false یعنی چنین شناسه‌ای نبود.
 *
 * ⚠️ updated_at = now() اینجا دستی ست می‌شود و این تنها راهِ درست است: مهاجرت
 *    ۰۰۲ آگاهانه هیچ تریگری روی این ستون نگذاشت، چون تریگر با هر اجرای مجددِ
 *    اسکریپتِ import و هر UPDATE در کنسول هم شلیک می‌شد و هر ۷۰۰ ردیف
 *    «امروز ویرایش‌شده» خوانده می‌شدند. پس «ویرایش» یعنی «پنل ویرایش کرد».
 *
 * ترتیبِ کارها مهم است: اول UPDATE تا اگر شناسه وجود ندارد، پیش از دست‌زدن به
 * prompts و image_categories برگردیم.
 */
export async function updateAdminImage(id: string, input: AdminImageInput): Promise<boolean> {
  if (!isValidId(id)) return false;

  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `UPDATE images
          SET url        = $2,
              title_fa   = $3,
              model_used = $4,
              width      = $5,
              height     = $6,
              updated_at = now()
        WHERE id = $1::bigint
        RETURNING id::text AS id`,
      [id, input.url, input.titleFa, input.modelUsed, input.width, input.height]
    );

    if (result.rows.length === 0) return false;

    await upsertPrompt(client, id, input.promptText);
    await replaceCategories(client, id, input.categoryIds);

    return true;
  });
}

/** خلاصه‌ی تصویرِ حذف‌شده — برای پیامِ «چه چیزی حذف شد» و متنِ لاگ. */
export type DeletedImage = { id: string; title_fa: string | null; url: string };

/**
 * حذفِ یک یا چند تصویر. آنچه واقعاً حذف شد برمی‌گردد.
 *
 * پرامپت و عضویتِ دسته‌ها با ON DELETE CASCADE اسکیما خودشان می‌روند؛ حذفِ دستیِ
 * آن‌ها اینجا هم اضافه است و هم خطرِ ناهمگامی با اسکیما.
 *
 * چرا RETURNING و نه شمارِ ردیف: query در lib/db آرایه‌ی ردیف‌ها را می‌دهد و نه
 * rowCount. مهم‌تر اینکه عنوان و url را هم لازم داریم تا پیامِ تأیید بگوید
 * «"پرتره‌ی نئون" حذف شد» و نه «۱ ردیف حذف شد».
 *
 * ⚠️ حذفِ فایلِ تصویر در Storage اینجا انجام نمی‌شود. تا مرحله‌ی اتصال به
 *    Storage، فایل باقی می‌ماند و فقط ردیفِ دیتابیس می‌رود. این آگاهانه است:
 *    حذفِ فایلی که ممکن است جای دیگری هم استفاده شود، بی سازوکارِ ارجاع‌شماری
 *    خطرِ از‌دست‌رفتنِ داده دارد.
 */
export async function deleteAdminImages(ids: readonly string[]): Promise<DeletedImage[]> {
  const safe = sanitizeIds(ids);
  if (safe.length === 0) return [];

  return query<DeletedImage>(
    `DELETE FROM images
      WHERE id = ANY($1::bigint[])
      RETURNING id::text AS id, title_fa, url`,
    [safe]
  );
}

/**
 * افزودنِ یک دسته به چند تصویر. تعدادِ تصاویری که واقعاً عوض شدند برمی‌گردد.
 *
 * ON CONFLICT DO NOTHING یعنی تصویری که از قبل در این دسته بود شمرده نمی‌شود؛
 * پس پیامِ «۵ تصویر به دسته اضافه شد» راست است و نمی‌گوید ۱۲ در حالی که ۷ تای
 * آن‌ها از قبل عضو بودند.
 *
 * چرا CTE و نه دو کوئری: به‌روزرسانیِ updated_at باید *فقط* تصاویری را لمس کند
 * که واقعاً ردیفِ تازه گرفتند. با دو کوئریِ جدا، دومی نمی‌داند اولی چه کرد و
 * ناچار بود همه‌ی شناسه‌ها را لمس کند — یعنی ۱۲ تصویر «ویرایش‌شده» علامت
 * می‌خوردند در حالی که ۵ تا عوض شده بود.
 *
 * CTEهای داده‌نویس همیشه و کامل اجرا می‌شوند، حتی اگر خروجی‌شان خوانده نشود؛
 * پس touched حتماً اجرا می‌شود.
 */
export async function addCategoryToImages(
  ids: readonly string[],
  categoryId: string
): Promise<number> {
  const safe = sanitizeIds(ids);
  if (safe.length === 0 || !isValidId(categoryId)) return 0;

  const rows = await query<{ affected: number }>(
    `WITH added AS (
       INSERT INTO image_categories (image_id, category_id)
       SELECT i.id, c.id
         FROM images i
         CROSS JOIN categories c
        WHERE i.id = ANY($1::bigint[])
          AND c.id = $2::bigint
       ON CONFLICT DO NOTHING
       RETURNING image_id
     ), touched AS (
       UPDATE images
          SET updated_at = now()
        WHERE id IN (SELECT image_id FROM added)
        RETURNING id
     )
     SELECT count(*)::int AS affected FROM added`,
    [safe, categoryId]
  );

  return rows[0]?.affected ?? 0;
}

/**
 * برداشتنِ یک دسته از چند تصویر. تعدادِ تصاویری که واقعاً عوض شدند برمی‌گردد.
 *
 * همان منطقِ addCategoryToImages، برعکس: RETURNING فقط ردیف‌هایی را می‌دهد که
 * وجود داشتند، پس تصویری که عضوِ این دسته نبود نه شمرده می‌شود و نه
 * updated_atش لمس می‌شود.
 */
export async function removeCategoryFromImages(
  ids: readonly string[],
  categoryId: string
): Promise<number> {
  const safe = sanitizeIds(ids);
  if (safe.length === 0 || !isValidId(categoryId)) return 0;

  const rows = await query<{ affected: number }>(
    `WITH removed AS (
       DELETE FROM image_categories
        WHERE image_id = ANY($1::bigint[])
          AND category_id = $2::bigint
       RETURNING image_id
     ), touched AS (
       UPDATE images
          SET updated_at = now()
        WHERE id IN (SELECT image_id FROM removed)
        RETURNING id
     )
     SELECT count(*)::int AS affected FROM removed`,
    [safe, categoryId]
  );

  return rows[0]?.affected ?? 0;
}
