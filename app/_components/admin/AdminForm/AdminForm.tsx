import type { ReactNode } from "react";

/**
 * قطعه‌های فرمِ پنل: برچسب، خطا، راهنما، و کلاس‌های ورودی.
 *
 * ⚠️ این فایل "use client" ندارد ولی *از داخلِ* کامپوننت‌های کلاینتی مصرف
 *    می‌شود، پس عملاً در باندلِ مرورگر می‌نشیند. یعنی هیچ‌وقت نباید چیزی از
 *    @/lib/db، pg، یا هر ماژولِ سمت‌سروری import کند. اگر روزی به قالب‌بندیِ
 *    تاریخ اینجا نیاز شد، رشته‌ی آماده را از سرور پاس بده، نه تابعِ فرمت را.
 *
 * چرا کلاس‌ها ثابتِ رشته‌ای‌اند و نه کامپوننت: همان استدلالِ btn* در admin-ui —
 * ورودی گاهی <input> است، گاهی <textarea>، گاهی <select>، و هر سه پراپ‌های
 * بومیِ متفاوتی می‌گیرند. یک کامپوننتِ Input که همه را بپوشاند ناچار بود
 * پراپ‌های HTML را دوباره تایپ کند.
 */

/** ارتفاعِ یکسان و حالتِ فوکوسِ shadow-field — همان زبانِ بصریِ فرمِ ورود. */
const FIELD_BASE =
  "w-full rounded-field bg-canvas px-3.5 py-2.5 text-[12.5px] text-ink shadow-field outline-none transition-shadow placeholder:text-faint focus:shadow-field-focus disabled:cursor-not-allowed disabled:opacity-60";

export const inputClass = FIELD_BASE;
export const textareaClass = `${FIELD_BASE} min-h-32 resize-y leading-relaxed`;

/**
 * appearance-none روی select لازم است چون فلشِ بومیِ مرورگر در RTL سمتِ اشتباه
 * می‌نشیند و با padding هم درست نمی‌شود؛ فلش را خودمان با pe- جا می‌گذاریم.
 */
export const selectClass = `${FIELD_BASE} cursor-pointer appearance-none pe-9`;

/** ورودیِ محتوای لاتین/ماشین‌خوان (URL، نامِ مدل). قاعده‌ی ثابتِ سایت: LTR + مونو. */
export const inputClassMono = `${FIELD_BASE} text-left font-mono text-[12px]`;
export const textareaClassMono = `${FIELD_BASE} min-h-40 resize-y text-left font-mono text-[12px] leading-relaxed`;

/**
 * یک فیلد با برچسب، راهنما و خطا — و مهم‌تر، با گره‌های دسترسی‌پذیریِ درست.
 *
 * ⚠️ نکته‌ی اصلیِ این کامپوننت همان چیزی است که دیده نمی‌شود: id باید به
 *    htmlFor برچسب، به aria-describedby ورودی، و به id پاراگرافِ خطا وصل باشد.
 *    نوشتنِ دستیِ این سه‌گانه در هر فیلد یعنی دیر یا زود یکی‌شان جا می‌افتد و
 *    کاربرِ اسکرین‌ریدر فیلدی می‌شنود که نه نام دارد و نه می‌فهمد چرا رد شد.
 *
 * فرزند به‌صورتِ تابع گرفته می‌شود و نه ReactNode: تنها راهِ تضمینیِ اینکه
 * ورودی همان idهایی را بگیرد که برچسب و خطا استفاده می‌کنند. با ReactNode
 * می‌شد فیلدی ساخت که برچسبش به هیچ ورودی وصل نیست و TypeScript ساکت بماند.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  /** یک جمله‌ی کوتاه زیرِ فیلد. جای توضیحِ «چرا» است، نه تکرارِ برچسب. */
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
    required: boolean | undefined;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11.5px] font-bold text-muted">
        {label}
        {required ? (
          <>
            {" "}
            {/* ستاره تنها نشانه‌ی الزامی‌بودن نیست: خودِ ورودی required هم
                می‌گیرد. ستاره برای دیدن است و aria-hidden می‌شود تا «ستاره»
                خوانده نشود. */}
            <span aria-hidden className="text-alert">
              *
            </span>
          </>
        ) : null}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required: required || undefined,
      })}

      {error ? (
        <p id={errorId ?? undefined} role="alert" className="text-[11px] font-medium text-alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId ?? undefined} className="text-[11px] leading-relaxed text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * ردیفِ دو-ستونی برای فیلدهای کوتاهِ جفتی (عرض/ارتفاع).
 *
 * روی موبایل یک‌ستونی می‌شود: دو فیلدِ عددی در عرضِ ۳۲۰ پیکسل هر کدام ۱۴۰
 * پیکسل جا می‌گیرند که برای صفحه‌کلیدِ عددی و برچسب کافی نیست.
 */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/**
 * ناحیه‌ی دکمه‌های پایینِ فرم.
 *
 * چسبیده به پایینِ کارت با یک خطِ جداکننده — تا در فرمِ بلند، «ذخیره» با آخرین
 * فیلد اشتباه نشود.
 */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-line px-5 py-4">
      {children}
    </div>
  );
}

/**
 * بخشِ فرم با تیترِ کوچک.
 *
 * <fieldset> و <legend> واقعی و نه div+span: برای گروهِ چک‌باکس‌های دسته، تنها
 * چیزی است که به اسکرین‌ریدر می‌گوید این ده چک‌باکس یک سؤال‌اند.
 */
export function FieldGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-[11.5px] font-bold text-muted">{legend}</legend>
      {hint ? <p className="text-[11px] leading-relaxed text-faint">{hint}</p> : null}
      {children}
    </fieldset>
  );
}
