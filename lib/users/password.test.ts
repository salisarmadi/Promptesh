import { describe, expect, it } from "vitest";
import { hashUserPassword, verifyUserPassword } from "./password";

describe("user password hashing", () => {
  it("verifies the original password and rejects a different one", async () => {
    const hash = await hashUserPassword("a-long-enough-password");
    await expect(verifyUserPassword("a-long-enough-password", hash)).resolves.toBe(true);
    await expect(verifyUserPassword("another-password", hash)).resolves.toBe(false);
  });

  it("normalizes equivalent unicode passwords", async () => {
    const hash = await hashUserPassword("کد۱۲۳۴۵۶۷۸۹");
    await expect(verifyUserPassword("کد۱۲۳۴۵۶۷۸۹", hash)).resolves.toBe(true);
  });
});
