import { describe, expect, it } from "vitest";
import { FALLBACK_SLUG, generateSlug, generateUniqueSlug } from "./slug";

describe("generateSlug", () => {
  it("lowercases and hyphenates words", () => {
    expect(generateSlug("Grandma's Apple Pie")).toBe("grandmas-apple-pie");
  });

  it("transliterates accented letters instead of dropping them", () => {
    expect(generateSlug("Ragù alla Bolognese")).toBe("ragu-alla-bolognese");
    expect(generateSlug("Crème Brûlée")).toBe("creme-brulee");
    expect(generateSlug("Kip à la Normande")).toBe("kip-a-la-normande");
  });

  it("never returns an empty slug, even for non-Latin titles", () => {
    expect(generateSlug("麻婆豆腐")).toBe(FALLBACK_SLUG);
  });
});

describe("generateUniqueSlug", () => {
  it("keeps the base slug when it is free", () => {
    expect(generateUniqueSlug("Pasta", ["brownies"])).toBe("pasta");
  });

  it("adds the next free counter when the slug is taken", () => {
    expect(generateUniqueSlug("Pasta", ["pasta", "pasta-1"])).toBe("pasta-2");
  });
});
