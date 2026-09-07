"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check, Eye, Trash } from "@/app/_components/ui/Icons";
import { btnDanger, btnGhost, btnPrimary, codeBox } from "@/app/_components/admin/AdminUi";
import {
  Field,
  FieldGroup,
  FieldRow,
  FormActions,
  inputClass,
  inputClassMono,
  textareaClassMono,
} from "@/app/_components/admin/AdminForm";
import {
  deleteImageAction,
  saveImageAction,
} from "@/app/admin/_actions/images";
import { IMAGE_FORM_INITIAL_STATE } from "@/app/admin/_actions/image-state";
import { ADMIN_IMAGES_PATH } from "@/lib/admin/image-list";

/**
 * فرمِ ساخت و ویرایشِ تصویر.
 *
 * یک کامپوننت برای هر دو حالت. تفاوتشان فقط وجودِ mode.image است؛ خودِ فیلدها،
 * اعتبارسنجی و اکشن یکی است. دو نسخه یعنی دو جا برای فراموش‌کردنِ یک قاعده.
 *
 * ── چرا useActionState و نه یک <form action> ساده ──
 * ذخیره می‌تواند شکست بخورد و مدیر باید *خطای هر فیلد را کنارِ خودش* ببیند، بی
 * آنکه متنی که تایپ کرده از دست برود. useActionState دقیقاً همین را می‌دهد:
 * حالتِ برگشتی از سرور + حفظِ مقدارهای فرم.
 *
 * ⚠️ فرمِ حذف *بیرونِ* فرمِ ذخیره است و نه داخلش. فرمِ تودرتو در HTML نامعتبر
 *    است؛ مرورگر بی‌صدا فرمِ داخلی را برمی‌دارد و دکمه‌ی حذف عملاً به فرمِ ذخیره
 *    وصل می‌شود — یعنی «حذف» ذخیره می‌کرد.
 */

export type ImageFormValues = {
  id: string;
  url: string;
  titleFa: string;
  modelUsed: string;
  width: string;
  height: string;
  promptText: string;
  categoryIds: string[];
  /** قالب‌بندی‌شده در سرور. */
  likes: string;
  createdAt: string;
  updatedAt: string | null;
};

export function ImageForm({
  image,
  categories,
}: {
  /** null یعنی حالتِ ساخت. */
  image: ImageFormValues | null;
  categories: { id: string; name_fa: string; slug: string }[];
}) {
  const [state, formAction] = useActionState(saveImageAction, IMAGE_FORM_INITIAL_STATE);
  const errors = state.fieldErrors;
  const editing = image !== null;

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <div className="flex flex-col gap-4 xl:col-span-3">
        {/*
          noValidate: اعتبارسنجیِ بومیِ مرورگر پیام‌هایش انگلیسی و خارج از زبانِ
          بصریِ سایت است، و مهم‌تر، قواعدِ ما (مثلاً «عرض و ارتفاع با هم») را
          نمی‌شناسد. سرور تنها مرجعِ اعتبارسنجی است؛ required روی فیلدها فقط
          برای اسکرین‌ریدر می‌ماند.
        */}
        <form action={formAction} noValidate className="contents">
          {editing ? <input type="hidden" name="id" value={image.id} /> : null}

          {state.status !== "idle" ? <FormBanner state={state} /> : null}

          <section className="rounded-card border border-line bg-canvas shadow-card">
            <div className="flex flex-col gap-5 p-5">
              <Field
                id="image-url"
                label="نشانیِ تصویر"
                required
                error={errors.url}
                hint={
                  <>
                    یا مسیرِ داخلی مثلِ <code className="font-mono">/gallery/name.jpg</code>، یا یک
                    آدرسِ کاملِ https. هیچ تغییری روی مقدار انجام نمی‌شود — همان چیزی ذخیره
                    می‌شود که اینجا می‌نویسی، چون سایتِ عمومی با همین شکل کار می‌کند.
                  </>
                }
              >
                {(props) => (
                  <input
                    {...props}
                    name="url"
                    type="text"
                    dir="ltr"
                    defaultValue={image?.url ?? ""}
                    placeholder="/gallery/example.jpg"
                    autoComplete="off"
                    spellCheck={false}
                    className={inputClassMono}
                  />
                )}
              </Field>

              <Field
                id="image-title"
                label="عنوانِ فارسی"
                error={errors.title}
                hint="در گالری به‌عنوانِ متنِ alt و تیترِ کارت استفاده می‌شود؛ برای سئوی فارسی مهم است."
              >
                {(props) => (
                  <input
                    {...props}
                    name="title_fa"
                    type="text"
                    defaultValue={image?.titleFa ?? ""}
                    placeholder="مثلاً: پرتره‌ی نئون در شب"
                    autoComplete="off"
                    className={inputClass}
                  />
                )}
              </Field>

              <Field
                id="image-model"
                label="مدلِ سازنده"
                error={errors.model}
                hint="نامِ مدلی که تصویر با آن ساخته شده. اختیاری."
              >
                {(props) => (
                  <input
                    {...props}
                    name="model_used"
                    type="text"
                    dir="ltr"
                    defaultValue={image?.modelUsed ?? ""}
                    placeholder="Midjourney v6"
                    autoComplete="off"
                    className={inputClassMono}
                  />
                )}
              </Field>

              <FieldRow>
                {/*
                  ⚠️ عرض و ارتفاع یک جفت‌اند و یکی‌شان به‌تنهایی بی‌فایده است:
                  <Image> نکست هر دو را می‌خواهد تا نسبت‌تصویر را رزرو کند. سرور
                  همین را اعتبارسنجی می‌کند و نیمه‌کاره را رد می‌کند.
                */}
                <Field id="image-width" label="عرض (پیکسل)" error={errors.width}>
                  {(props) => (
                    <input
                      {...props}
                      name="width"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      defaultValue={image?.width ?? ""}
                      placeholder="1024"
                      autoComplete="off"
                      className={inputClassMono}
                    />
                  )}
                </Field>
                <Field
                  id="image-height"
                  label="ارتفاع (پیکسل)"
                  error={errors.height}
                  hint="اگر یکی را پر کنی، دیگری هم لازم است."
                >
                  {(props) => (
                    <input
                      {...props}
                      name="height"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      defaultValue={image?.height ?? ""}
                      placeholder="1024"
                      autoComplete="off"
                      className={inputClassMono}
                    />
                  )}
                </Field>
              </FieldRow>

              <Field
                id="image-prompt"
                label="متنِ پرامپت"
                error={errors.prompt}
                hint="محصولِ اصلیِ سایت همین است. خالی گذاشتنش یعنی کارتِ گالری چیزی برای کپی ندارد."
              >
                {(props) => (
                  <textarea
                    {...props}
                    name="prompt_text"
                    dir="ltr"
                    defaultValue={image?.promptText ?? ""}
                    placeholder="a cinematic portrait, neon rim light, 85mm…"
                    spellCheck={false}
                    className={textareaClassMono}
                  />
                )}
              </Field>

              <CategoryPicker
                categories={categories}
                selected={image?.categoryIds ?? []}
              />
            </div>

            <FormActions>
              <SaveButton editing={editing} />
              <Link href={ADMIN_IMAGES_PATH} className={btnGhost}>
                بازگشت به فهرست
              </Link>
            </FormActions>
          </section>
        </form>

        {/* ⚠️ سیبلینگِ فرمِ ذخیره است و نه فرزندش — دلیلش بالای فایل. */}
        {editing ? <DeleteCard id={image.id} title={image.titleFa || image.url} /> : null}
      </div>

      <div className="xl:col-span-2">
        <SidePanel image={image} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// اجزا
// ---------------------------------------------------------------------------

/**
 * دکمه‌ی ذخیره با حالتِ در حالِ ارسال.
 *
 * useFormStatus فقط از *داخلِ* فرم کار می‌کند، پس ناچار یک کامپوننتِ جدا است و
 * نمی‌شود همان بالا با state خواند.
 */
function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "در حالِ ذخیره…" : editing ? "ذخیره‌ی تغییرات" : "افزودنِ تصویر"}
    </button>
  );
}

/** پیامِ کلیِ بالای فرم. */
function FormBanner({
  state,
}: {
  state: { status: "idle" | "saved" | "error"; message: string };
}) {
  const ok = state.status === "saved";
  return (
    <div
      // status و نه alert: پس از ارسالِ فرم، فوکوس هنوز داخلِ فرم است و alert
      // حرفِ اسکرین‌ریدر را وسطِ کار قطع می‌کند.
      role="status"
      className={`flex items-center gap-2.5 rounded-card border px-4 py-3 text-[12px] font-bold ${
        ok
          ? "border-affirm/25 bg-affirm/10 text-affirm"
          : "border-alert/25 bg-alert-wash text-alert"
      }`}
    >
      <span aria-hidden className="shrink-0">
        {ok ? <Check size={14} /> : <AlertTriangle size={14} />}
      </span>
      {state.message}
    </div>
  );
}

/**
 * چک‌باکس‌های دسته.
 *
 * <fieldset>/<legend> واقعی است تا اسکرین‌ریدر بفهمد این چند چک‌باکس یک سؤال‌اند.
 * همه‌شان name="category_ids" دارند و مرورگر آرایه می‌فرستد — هیچ حالتِ کلاینتی
 * لازم نیست، پس بی‌جاوااسکریپت هم کار می‌کند.
 */
function CategoryPicker({
  categories,
  selected,
}: {
  categories: { id: string; name_fa: string; slug: string }[];
  selected: string[];
}) {
  if (categories.length === 0) {
    return (
      <FieldGroup legend="دسته‌بندی‌ها">
        <p className="text-[11.5px] leading-relaxed text-faint">
          هنوز دسته‌ای ساخته نشده.{" "}
          <Link href="/admin/categories" className="font-bold text-accent hover:text-accent-strong">
            ساختِ دسته
          </Link>
        </p>
      </FieldGroup>
    );
  }

  const chosen = new Set(selected);

  return (
    <FieldGroup
      legend="دسته‌بندی‌ها"
      hint="فیلترهای گالریِ عمومی از همین‌جا می‌آیند؛ تصویرِ بی‌دسته در هیچ فیلتری دیده نمی‌شود."
    >
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-canvas px-3 py-1.5 text-[11.5px] font-bold text-muted transition-colors hover:border-accent-line has-checked:border-accent-line has-checked:bg-accent-soft has-checked:text-accent"
          >
            <input
              type="checkbox"
              name="category_ids"
              value={c.id}
              defaultChecked={chosen.has(c.id)}
              className="size-3.5 cursor-pointer accent-accent"
            />
            {c.name_fa}
          </label>
        ))}
      </div>
    </FieldGroup>
  );
}

/**
 * حذفِ تکی، با تأییدِ دو‌مرحله‌ای.
 *
 * ⚠️ تأیید با <details> ساخته شده و نه دیالوگِ کلاینتی: دیالوگِ کلاینتی
 *    بی‌جاوااسکریپت باز نمی‌شود، و آن حالت یعنی یا حذفِ بی‌تأیید یا حذفِ ناممکن.
 *    <details> بومی است و در هر دو حالت دقیقاً دو مرحله می‌ماند.
 */
function DeleteCard({ id, title }: { id: string; title: string }) {
  return (
    <section className="rounded-card border border-alert/25 bg-canvas p-5 shadow-card">
      <h2 className="text-[13px] font-extrabold text-alert">حذفِ این تصویر</h2>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
        رکوردِ تصویر و متنِ پرامپتش از دیتابیس پاک می‌شوند و از گالریِ عمومی
        ناپدید می‌شود.
      </p>
      {/*
        ⚠️ صداقتِ لازم: خودِ فایل روی Supabase Storage باقی می‌ماند. پاک‌کردنش
        نیازِ کلیدِ سرویس است که هنوز به پروژه اضافه نشده (مرحله‌ی آپلود). این
        جمله عمداً اینجاست تا مدیر فکر نکند فضا آزاد شده.
      */}
      <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
        فایلِ تصویر روی فضای ذخیره‌سازی دست‌نخورده می‌ماند و باید جداگانه پاک شود.
      </p>

      <details className="mt-4">
        <summary className={`${btnDanger} cursor-pointer list-none marker:content-none`}>
          <Trash size={13} />
          حذفِ تصویر
        </summary>
        <form action={deleteImageAction} className="mt-3 flex flex-col gap-2.5">
          <input type="hidden" name="id" value={id} />
          <p className="flex items-start gap-2 rounded-plate border border-alert/30 bg-alert-wash p-3 text-[11px] leading-relaxed text-alert">
            <span className="mt-px shrink-0" aria-hidden>
              <AlertTriangle size={13} />
            </span>
            <span dir="auto">«{title}» برای همیشه حذف می‌شود. این کار برگشت‌پذیر نیست.</span>
          </p>
          <button
            type="submit"
            className={`${btnDanger} self-start bg-alert text-white hover:bg-alert`}
          >
            بله، حذف کن
          </button>
        </form>
      </details>
    </section>
  );
}

/**
 * ستونِ کناری: پیش‌نمایش و فراداده‌ی فقط-خواندنی.
 *
 * ⚠️ likes_count عمداً فیلدِ ویرایش‌پذیر نیست. دست‌کاریِ عددِ تعاملِ کاربران دقیقاً
 *    همان «آمارِ ساختگی» است که در قواعدِ پروژه ممنوع شده؛ این عدد باید فقط از
 *    رفتارِ واقعیِ بازدیدکننده بیاید.
 */
function SidePanel({ image }: { image: ImageFormValues | null }) {
  if (!image) {
    return (
      <section className="rounded-card border border-line bg-canvas p-5 shadow-card">
        <h2 className="text-[13px] font-extrabold text-ink">پیش‌نمایش</h2>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
          بعد از ذخیره، تصویر و فراداده‌اش اینجا نشان داده می‌شوند.
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          فعلاً باید نشانیِ تصویر را دستی وارد کنی. آپلودِ مستقیم به فضای
          ذخیره‌سازی در مرحله‌ی بعد اضافه می‌شود.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-line bg-canvas shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[13px] font-extrabold text-ink">پیش‌نمایش</h2>
      </div>

      <div className="p-5">
        {/*
          ⚠️ همان <Image> و همان src که گالریِ عمومی استفاده می‌کند — بی
          نرمال‌سازی و بی unoptimized. اگر اینجا درست دیده نشد، یعنی در گالری هم
          درست دیده نمی‌شود، و همین دقیقاً چیزی است که مدیر باید ببیند.
        */}
        <div className="relative overflow-hidden rounded-plate border border-line bg-surface-image">
          <Image
            src={image.url}
            alt={image.titleFa || ""}
            width={image.width ? Number(image.width) : 800}
            height={image.height ? Number(image.height) : 800}
            sizes="(min-width: 1280px) 380px, 100vw"
            className="h-auto w-full object-contain"
          />
        </div>

        <p dir="ltr" className={`${codeBox} mt-3 overflow-x-auto whitespace-nowrap`}>
          {image.url}
        </p>

        <dl className="mt-4 flex flex-col gap-2.5 text-[11.5px]">
          <MetaRow label="شناسه" value={image.id} mono />
          <MetaRow label="لایک" value={image.likes} />
          <MetaRow label="افزوده شده" value={image.createdAt} />
          <MetaRow label="آخرین ویرایش" value={image.updatedAt ?? "ویرایش نشده"} />
        </dl>

        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          شمارِ لایک از رفتارِ بازدیدکننده‌ها می‌آید و از پنل ویرایش نمی‌شود.
        </p>

        <Link href="/" target="_blank" className={`${btnGhost} mt-4 w-full`}>
          <Eye size={13} />
          دیدنِ گالریِ عمومی
        </Link>
      </div>
    </section>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-faint-label">{label}</dt>
      <dd
        dir={mono ? "ltr" : undefined}
        className={`truncate font-bold text-ink ${mono ? "font-mono text-[11px]" : "tabular-nums"}`}
      >
        {value}
      </dd>
    </div>
  );
}
