import { describe, expect, it } from "vitest";
import { galleryHref, parseCategorySlug, parseImageId, parsePage } from "./urls";

describe("galleryHref", () => {
  it("creates one canonical URL for the unfiltered first page", () => {
    expect(galleryHref()).toBe("/");
    expect(galleryHref({ category: "portrait", page: 1 })).toBe("/category/portrait");
  });

  it("keeps the query-string order stable for filtered pages", () => {
    expect(galleryHref({ category: "portrait", q: "soft light", page: 3 })).toBe(
      "/category/portrait?q=soft+light&page=3"
    );
  });
});

describe("parseCategorySlug", () => {
  it("normalizes case, whitespace, and Persian digits", () => {
    expect(parseCategorySlug(" Portrait-۳ ")).toBe("portrait-3");
  });

  it("rejects malformed or repeated route segments", () => {
    expect(parseCategorySlug("not valid")).toBeNull();
    expect(parseCategorySlug(["portrait"])).toBeNull();
  });
});

describe("parseImageId", () => {
  it("normalizes localized digits and leading zeroes", () => {
    expect(parseImageId("۰۰۰۱۲۳")).toBe("123");
    expect(parseImageId("٤٢")).toBe("42");
  });

  it("rejects non-numeric and out-of-range IDs", () => {
    expect(parseImageId("12a")).toBeNull();
    expect(parseImageId("9223372036854775808")).toBeNull();
  });
});

describe("parsePage", () => {
  it("supports localized integer page numbers and caps large values", () => {
    expect(parsePage("۳")).toBe(3);
    expect(parsePage("۱۰۰۱")).toBe(1000);
  });

  it("rejects fractional, scientific, repeated, and invalid page values", () => {
    expect(parsePage("2.7")).toBe(1);
    expect(parsePage("1e9")).toBe(1);
    expect(parsePage(["2", "3"])).toBe(1);
    expect(parsePage("-")).toBe(1);
  });
});
