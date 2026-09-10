import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function scrypt(password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => error ? reject(error) : resolve(key));
  });
}

function normalized(value: string): string {
  return value.normalize("NFKC");
}

export async function hashUserPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(normalized(password), salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyUserPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map((part) => Number.parseInt(part, 10));
  if (![n, r, p].every(Number.isFinite)) return false;
  const expected = Buffer.from(parts[5], "base64url");
  const key = await scrypt(normalized(password), Buffer.from(parts[4], "base64url"), expected.length, { N: n, r, p });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
