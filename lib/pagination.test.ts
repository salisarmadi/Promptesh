import { describe, expect, it } from "vitest";
import { getPaginationSlots } from "./pagination";

describe("getPaginationSlots", () => {
  it("shows every page for compact result sets", () => {
    expect(getPaginationSlots(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the first, current, neighbouring, and final pages for longer result sets", () => {
    expect(getPaginationSlots(4, 8)).toEqual([1, 2, 3, 4, 5, "gap", 8]);
  });

  it("uses a gap when several pages are omitted", () => {
    expect(getPaginationSlots(1, 8)).toEqual([1, 2, "gap", 8]);
  });

  it("shows a skipped single page instead of an unnecessary gap", () => {
    expect(getPaginationSlots(7, 10)).toEqual([1, "gap", 6, 7, 8, 9, 10]);
  });
});
