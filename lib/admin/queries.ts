import { query, isUndefinedTableError } from "@/lib/db";
import { MISSING_CONDITION } from "@/lib/admin/images";

/**
 * لایه‌ی داده‌ی پنل مدیریت.
 *
 * جدا از lib/gallery.ts و عمداً: آن فایل کوئری‌های *خواندنِ عمومی* را دارد و
 * قرارداد ثابتی با سایتِ عمومی. کوئری‌های پنل شکلِ دیگری دارند (شمارش‌های
 * سلامتِ داده، ردیف‌های ویرایش‌پذیر با id) و نباید هیچ‌کدام از توابعِ گالری را
 * برای نیازِ پنل عوض کنیم — همان جایی است که سایتِ عمومی بی‌صدا می‌شکند.
 *
 * ⚠️ فقط سمتِ سرور. هر تابعِ اینجا باید از داخلِ کدی صدا زده شود که قبلش
 *    requireAdmin() را صدا زده است.
 *
 * قاعده‌ی پرهیز از رفت‌وبرگشت: دیتابیس دور است و هر کوئری یک رفت‌وبرگشتِ شبکه.
 * پس شمارش‌ها در یک کوئریِ واحد با زیرپرس‌وجو جمع شده‌اند، نه ده کوئریِ جدا.
 */

/** pg برای BIGINT رشته می‌دهد تا دقت از دست نرود؛ count::int را عدد می‌کند. */
type CountRow = { [key: string]: number | null };

export type DashboardStats = {
  imageCount: number;
  promptCount: number;
  categoryCount: number;
  /** تصاویری که پرامپت ندارند — کارِ ناتمامِ محتوایی، نه خطا. */
  imagesWithoutPrompt: number;
  /** بدونِ عنوانِ فارسی: هم متنِ alt ندارند هم در پنل سخت شناسایی می‌شوند. */
  imagesWithoutTitle: number;
  /** بدونِ width/height: گالری برایشان به نسبت‌تصویرِ پیش‌فرض برمی‌گردد. */
  imagesWithoutDimensions: number;
  /** بی‌دسته: در هیچ تبی دیده نمی‌شوند. */
  imagesWithoutCategory: number;
  /** صفِ بازبینیِ n8n. */
  pendingReviewCount: number;
  /** افزوده‌شده در ۷ روزِ گذشته. */
  addedLast7Days: number;
  /** تازه‌ترین و قدیمی‌ترین تاریخِ محتوا — بی این دو، عددِ بالا قابلِ تفسیر نیست. */
  newestImageAt: Date | null;
  oldestImageAt: Date | null;
  totalLikes: number;
};

export type CategoryAdminRow = {
  id: string;
  name_fa: string;
  slug: string;
  description: string | null;
  image_count: number;
};

export type PendingPromptRow = {
  id: string;
  image_url: string;
  raw_caption: string | null;
  prompt_text: string | null;
  source_channel: string | null;
  posted_at: Date | null;
  created_at: Date;
};

export type ModelStatsRow = {
  label: string;
  image_count: number;
};

/**
 * همه‌ی شمارنده‌های داشبورد در یک رفت‌وبرگشت.
 *
 * ⚠️ هیچ‌کدام از این عددها نباید در رابط «گرد» یا «تقریبی» شود. کاربرِ این
 *    اعداد خودِ مالکِ محتواست و از رویشان تصمیم می‌گیرد کدام کارِ ناتمام را
 *    بردارد؛ «حدوداً ۷۰۰» به هیچ دردی نمی‌خورد.
 *
 * ⚠️ چهار شمارنده‌ی «پر نشده» شرطشان را از MISSING_CONDITION می‌گیرند و نباید
 *    اینجا دوباره نوشته شوند. دلیلش یک باگِ دیدنی است: کارتِ کامل‌بودنِ داده
 *    می‌گوید «۱۲ تصویر بدونِ پرامپت» و لینکش به /admin/images?missing=prompt
 *    می‌رود. اگر شرطِ آنجا و اینجا یکی نباشد، مدیر روی «۱۲» کلیک می‌کند و ۹
 *    ردیف می‌بیند، و هیچ نشانه‌ای نیست که کدام‌یک دروغ می‌گوید.
 *
 * به همین دلیل هر چهار زیرپرس‌وجو `FROM images i` است (و نه `FROM images`):
 * شرط‌های مشترک به نامِ مستعارِ `i` وابسته‌اند.
 *
 * چرا هیچ جدولِ مهاجرتِ ۰۰۲ اینجا نیست: این کوئری باید روی نصبی که مهاجرت را
 * نزده هم کار کند، وگرنه داشبورد به‌جای گفتنِ «مهاجرت را اجرا کن» با خطای
 * ۴۲P01 سفید می‌شد. جدولِ لاگ در تابعِ جداگانه‌ی پایین خوانده می‌شود.
 * (پس اینجا به i.updated_at هم دست نمی‌زنیم، هرچند فهرستِ تصاویر می‌زند.)
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await query<CountRow>(
    `SELECT
       (SELECT count(*)::int FROM images)                             AS image_count,
       (SELECT count(*)::int FROM prompts)                            AS prompt_count,
       (SELECT count(*)::int FROM categories)                         AS category_count,
       (SELECT count(*)::int FROM images i
          WHERE ${MISSING_CONDITION.prompt})                          AS images_without_prompt,
       (SELECT count(*)::int FROM images i
          WHERE ${MISSING_CONDITION.title})                           AS images_without_title,
       (SELECT count(*)::int FROM images i
          WHERE ${MISSING_CONDITION.dimensions})                      AS images_without_dimensions,
       (SELECT count(*)::int FROM images i
          WHERE ${MISSING_CONDITION.category})                        AS images_without_category,
       (SELECT count(*)::int FROM pending_prompts
          WHERE status = 'pending_review')                            AS pending_review_count,
       (SELECT count(*)::int FROM images
          WHERE created_at >= now() - interval '7 days')              AS added_last_7_days,
       (SELECT max(created_at) FROM images)                           AS newest_image_at,
       (SELECT min(created_at) FROM images)                           AS oldest_image_at,
       (SELECT coalesce(sum(likes_count), 0)::int FROM images)        AS total_likes`
  );

  const row = (rows[0] ?? {}) as Record<string, unknown>;
  const num = (key: string): number => {
    const value = row[key];
    return typeof value === "number" ? value : 0;
  };
  const date = (key: string): Date | null => {
    const value = row[key];
    return value instanceof Date ? value : null;
  };

  return {
    imageCount: num("image_count"),
    promptCount: num("prompt_count"),
    categoryCount: num("category_count"),
    imagesWithoutPrompt: num("images_without_prompt"),
    imagesWithoutTitle: num("images_without_title"),
    imagesWithoutDimensions: num("images_without_dimensions"),
    imagesWithoutCategory: num("images_without_category"),
    pendingReviewCount: num("pending_review_count"),
    addedLast7Days: num("added_last_7_days"),
    newestImageAt: date("newest_image_at"),
    oldestImageAt: date("oldest_image_at"),
    totalLikes: num("total_likes"),
  };
}

export async function listAdminCategories(): Promise<CategoryAdminRow[]> {
  return query<CategoryAdminRow>(
    `SELECT c.id::text AS id,
            c.name_fa,
            c.slug,
            c.description,
            count(ic.image_id)::int AS image_count
       FROM categories c
       LEFT JOIN image_categories ic ON ic.category_id = c.id
      GROUP BY c.id, c.name_fa, c.slug, c.description
      ORDER BY count(ic.image_id) DESC, c.name_fa`
  );
}

export async function listPendingPrompts(limit = 30): Promise<PendingPromptRow[]> {
  return query<PendingPromptRow>(
    `SELECT id::text AS id,
            image_url,
            raw_caption,
            prompt_text,
            source_channel,
            posted_at,
            created_at
       FROM pending_prompts
      WHERE status = 'pending_review'
      ORDER BY created_at DESC, id DESC
      LIMIT $1`,
    [limit]
  );
}

export type UserSubmissionReviewRow = {
  id: string;
  image_url: string;
  prompt_text: string;
  model_used: string | null;
  category_id: string | null;
  display_name: string;
  created_at: Date;
};

/** ارسال‌های کاربران جدا از ورودی n8n هستند تا مالک و مسیر انتشارشان گم نشود. */
export async function listUserSubmissionsForReview(limit = 30): Promise<UserSubmissionReviewRow[]> {
  return query<UserSubmissionReviewRow>(
    `SELECT s.id::text, s.image_url, s.prompt_text, s.model_used, s.category_id::text,
            u.display_name, s.created_at
       FROM user_submissions s JOIN user_accounts u ON u.id = s.user_id
      WHERE s.status = 'pending_review'
      ORDER BY s.created_at DESC, s.id DESC LIMIT $1`,
    [limit]
  );
}

export async function listModelStats(limit = 8): Promise<ModelStatsRow[]> {
  return query<ModelStatsRow>(
    `SELECT coalesce(nullif(btrim(model_used), ''), 'نامشخص') AS label,
            count(*)::int AS image_count
       FROM images
      GROUP BY coalesce(nullif(btrim(model_used), ''), 'نامشخص')
      ORDER BY count(*) DESC, label
      LIMIT $1`,
    [limit]
  );
}

// ---------------------------------------------------------------------------
// گزارشِ فعالیت
// ---------------------------------------------------------------------------

export type ActivityAction = "create" | "update" | "delete";
export type ActivityEntity = "image" | "category" | "prompt";

export type ActivityRow = {
  id: string;
  action: ActivityAction;
  entity_type: ActivityEntity;
  entity_id: string | null;
  summary: string | null;
  created_at: Date;
};

/**
 * آخرین رویدادهای پنل، یا null اگر جدولش وجود نداشته باشد.
 *
 * null یعنی «مهاجرت ۰۰۲ اجرا نشده»، نه «رویدادی نیست». صفحه باید این دو را
 * جدا نشان دهد: اولی یک کارِ باقی‌مانده برای مدیر است و دومی وضعیتِ طبیعیِ
 * یک پنلِ تازه.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityRow[] | null> {
  try {
    return await query<ActivityRow>(
      `SELECT id, action, entity_type, entity_id, summary, created_at
         FROM admin_activity
        ORDER BY created_at DESC, id DESC
        LIMIT $1`,
      [limit]
    );
  } catch (err) {
    if (isUndefinedTableError(err)) return null;
    throw err;
  }
}

/**
 * ثبتِ یک رویداد.
 *
 * ⚠️ عمداً هیچ خطایی به بیرون نمی‌دهد. دلیلش ترتیبِ اولویت است: اگر مدیر یک
 *    تصویر را با موفقیت حذف کرد ولی نوشتنِ لاگ شکست خورد، نباید پیامِ خطا
 *    ببیند و فکر کند حذف انجام نشده. لاگ یک دفترِ کنارِ کار است، نه بخشی از
 *    خودِ کار.
 *
 * به همین دلیل هم *بیرونِ* تراکنشِ اصلی صدا زده می‌شود: اگر داخلش بود،
 * نبودنِ جدول (نصبِ بدونِ مهاجرت ۰۰۲) کلِ عملیاتِ نوشتن را rollback می‌کرد.
 */
export async function logActivity(entry: {
  action: ActivityAction;
  entityType: ActivityEntity;
  entityId?: string | number | null;
  summary?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_activity (action, entity_type, entity_id, summary)
       VALUES ($1, $2, $3, $4)`,
      [
        entry.action,
        entry.entityType,
        entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
        entry.summary ?? null,
      ]
    );
  } catch (err) {
    if (isUndefinedTableError(err)) return;
    // هر خطای دیگری هم بلعیده می‌شود، ولی بی‌صدا نه: در لاگِ سرور می‌ماند تا
    // اگر لاگ‌نویسی خراب بود بشود فهمید.
    console.error("[admin] ثبت رویداد در admin_activity ناموفق بود:", err);
  }
}
