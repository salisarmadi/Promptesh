#!/usr/bin/env node
/**
 * ساختِ ADMIN_PASSWORD_HASH و ADMIN_SESSION_SECRET برای پنل مدیریت.
 *
 * اجرا:
 *     node scripts/hash-password.mjs
 *
 * چرا رمز را به‌عنوان آرگومان نمی‌گیرد؟
 *     چون آرگومانِ خط فرمان در history پوسته می‌ماند و در لیستِ پراسس‌ها
 *     (ps) برای هر کاربرِ دیگرِ همان ماشین دیدنی است. رمز فقط تایپ می‌شود، بدون
 *     echo، و هیچ‌جا نوشته نمی‌شود.
 *
 * ⚠️ قالبِ هش باید با lib/admin/session.ts یکی بماند.
 *    این ۲۰ خط عمداً تکرار شده و از آن فایل ایمپورت نشده، چون آن TypeScript
 *    است و این اسکریپت باید با یک «node ...» ساده و بدون هیچ مرحله‌ی بیلد اجرا
 *    شود. (همان کاری که scripts/import-content.mjs با تنظیماتِ pg کرده.)
 *    اگر پارامترهای زیر را عوض کردی، هر دو فایل را عوض کن.
 */

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

// ── باید با lib/admin/session.ts یکسان باشد ──
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_SALT_BYTES = 16;

/** کوتاه‌تر از این را قبول نمی‌کنیم؛ تنها درِ ورودِ پنل همین یک رمز است. */
const MIN_PASSWORD_LENGTH = 12;

/** طولِ کلیدِ امضا. ۴۸ بایتِ تصادفی → ۶۴ کاراکترِ base64url. */
const SECRET_BYTES = 48;

/**
 * خواندنِ ورودی بدون نمایش‌دادنش روی صفحه.
 *
 * راهِ معمول (readline) کاراکترها را echo می‌کند و رمز روی ترمینال می‌ماند —
 * روی صفحه، در اسکرین‌شات، و در ضبطِ صفحه. پس ترمینال به حالتِ raw می‌رود و
 * کلیدها یکی‌یکی خوانده می‌شوند بی‌آنکه چاپ شوند.
 */
function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;

    if (!stdin.isTTY) {
      reject(
        new Error(
          "ورودی ترمینالِ تعاملی نیست. این اسکریپت را مستقیم در ترمینال اجرا کن، نه با pipe یا از داخل ابزارِ دیگر."
        )
      );
      return;
    }

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (chunk) => {
      // Array.from و نه حلقه روی ایندکس: رمزِ فارسی یا ایموجی می‌تواند
      // جفت‌جانشین (surrogate pair) باشد و بریدنِ بایتی خرابش می‌کند.
      for (const ch of Array.from(chunk)) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          cleanup();
          stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        // بقیه‌ی کاراکترهای کنترلی (کلیدهای جهت، Tab، ...) نادیده گرفته می‌شوند
        // تا داخلِ رمز بایتِ ناخواسته نرود.
        if (ch >= " ") value += ch;
      }
    };

    stdin.on("data", onData);
  });
}

async function hashPassword(plain) {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  // normalize("NFKC") — دقیقاً مثل سمتِ بررسی. بدونش، رمزی که با «ی» عربی
  // تایپ شده و رمزی که با «ی» فارسی تایپ شده دو رمزِ متفاوت می‌شوند، در حالی
  // که روی صفحه یکسان‌اند.
  const key = await scrypt(plain.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

async function main() {
  console.log("");
  console.log("ساختِ اطلاعاتِ ورودِ پنل مدیریت پرامپتش");
  console.log("─".repeat(52));
  console.log("رمز نمایش داده نمی‌شود. بعد از تایپ، Enter بزن.");
  console.log("");

  const password = await askHidden("رمزِ مدیر: ");

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `\n✗ رمز باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد (الان ${password.length} کاراکتر است).`
    );
    process.exit(1);
  }

  const confirm = await askHidden("تکرارِ رمز: ");

  // مقایسه‌ی بعد از نرمال‌سازی: اگر بارِ اول با یک شکلِ یونیکد و بارِ دوم با
  // شکلِ دیگر تایپ شده باشد، رمز عملاً یکی است و نباید ردش کنیم.
  if (password.normalize("NFKC") !== confirm.normalize("NFKC")) {
    console.error("\n✗ دو رمز یکی نیستند. دوباره اجرا کن.");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const secret = randomBytes(SECRET_BYTES).toString("base64url");

  console.log("");
  console.log("✓ آماده شد. دو خطِ زیر را در فایل .env.local بگذار:");
  console.log("");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`ADMIN_SESSION_SECRET=${secret}`);
  console.log("");
  console.log("─".repeat(52));
  console.log("نکته‌ها:");
  console.log("  • .env.local در .gitignore هست و کامیت نمی‌شود. همین‌طور بماند.");
  console.log("  • بعد از ویرایشِ .env.local سرورِ dev را ری‌استارت کن.");
  console.log("  • برای دیپلوی، همین دو متغیر را در تنظیماتِ محیطیِ Netlify هم بگذار.");
  console.log("  • ADMIN_SESSION_SECRET را عوض کنی، همه‌ی نشست‌ها باطل می‌شوند.");
  console.log("  • رمز را عوض کنی هم همین‌طور — این عمدی است.");
  console.log("");
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
