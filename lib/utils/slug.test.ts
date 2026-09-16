import { describe, expect, it } from "vitest";
import { FALLBACK_SLUG, generateSlug, generateUniqueSlug } from "./slug";

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("generateSlug", () => {
  it("lowercases and hyphenates words", () => {
    expect(generateSlug("Grandma's Apple Pie")).toBe("grandmas-apple-pie");
  });

  it("transliterates accented letters instead of dropping them", () => {
    expect(generateSlug("Ragù alla Bolognese")).toBe("ragu-alla-bolognese");
    expect(generateSlug("Crème Brûlée")).toBe("creme-brulee");
    expect(generateSlug("Kip à la Normande")).toBe("kip-a-la-normande");
  });

  it.each([
    ["Straße", "strasse"],
    ["Æbleskiver", "aebleskiver"],
    ["Œufs en meurette", "oeufs-en-meurette"],
    ["Smørrebrød", "smorrebrod"],
    ["Pierogi z Łodzi", "pierogi-z-lodzi"],
    ["Łódź", "lodz"],
    ["Þorramatur", "thorramatur"],
    ["Ćevapčići", "cevapcici"],
    ["Jalapeño Poppers", "jalapeno-poppers"],
  ])("transliterates ligatures and special letters: %j → %j", (input, expected) => {
    expect(generateSlug(input)).toBe(expected);
  });

  it("spells out & as and", () => {
    expect(generateSlug("Mac & Cheese")).toBe("mac-and-cheese");
    expect(generateSlug("Salt&Pepper Wings")).toBe("salt-and-pepper-wings");
  });

  it("drops punctuation", () => {
    expect(generateSlug("Hello, World! (Best?) Soup.")).toBe("hello-world-best-soup");
    expect(generateSlug("Mom's \"Famous\" Chili: v2")).toBe("moms-famous-chili-v2");
  });

  it("keeps digits", () => {
    expect(generateSlug("5-Minute Mug Cake")).toBe("5-minute-mug-cake");
  });

  it("collapses repeated spaces, hyphens and underscores into one hyphen", () => {
    expect(generateSlug("Pasta  --  al__forno")).toBe("pasta-al-forno");
    expect(generateSlug("tab\tand\nnewline")).toBe("tab-and-newline");
  });

  it("trims leading and trailing separators", () => {
    expect(generateSlug("  --Pasta--  ")).toBe("pasta");
    expect(generateSlug("!!!Pasta!!!")).toBe("pasta");
    expect(generateSlug("_pasta_")).toBe("pasta");
  });

  it("handles very long titles without breaking the slug shape", () => {
    const title = "Very Long Title ".repeat(500);
    const slug = generateSlug(title);
    expect(slug).toMatch(SLUG_SHAPE);
    expect(slug.startsWith("very-long-title-very-long-title")).toBe(true);
  });

  it("keeps the Latin part of a mixed-script title", () => {
    expect(generateSlug("Pad Thai ผัดไทย")).toBe("pad-thai");
  });

  it("never returns an empty slug, even for non-Latin titles", () => {
    expect(generateSlug("麻婆豆腐")).toBe(FALLBACK_SLUG);
    expect(generateSlug("Борщ")).toBe(FALLBACK_SLUG);
    expect(generateSlug("🍕🍝")).toBe(FALLBACK_SLUG);
    expect(generateSlug("!!! ???")).toBe(FALLBACK_SLUG);
  });

  it("falls back for empty and non-string input", () => {
    expect(generateSlug("")).toBe(FALLBACK_SLUG);
    expect(generateSlug("   ")).toBe(FALLBACK_SLUG);
    expect(generateSlug(undefined as unknown as string)).toBe(FALLBACK_SLUG);
    expect(generateSlug(42 as unknown as string)).toBe(FALLBACK_SLUG);
  });

  it.each(["Crème Brûlée & Friends!", "  ÆØÅ  ", "a_b-c d", "Łódź 2024 — best"])(
    "always produces a URL-safe slug for %j",
    (input) => {
      expect(generateSlug(input)).toMatch(SLUG_SHAPE);
    }
  );
});

describe("generateUniqueSlug", () => {
  it("keeps the base slug when it is free", () => {
    expect(generateUniqueSlug("Pasta", ["brownies"])).toBe("pasta");
    expect(generateUniqueSlug("Pasta", [])).toBe("pasta");
  });

  it("adds the next free counter when the slug is taken", () => {
    expect(generateUniqueSlug("Pasta", ["pasta", "pasta-1"])).toBe("pasta-2");
  });

  it("starts counting at 1", () => {
    expect(generateUniqueSlug("Pasta", ["pasta"])).toBe("pasta-1");
  });

  it("fills the first gap in the counters", () => {
    expect(generateUniqueSlug("Pasta", ["pasta", "pasta-2", "pasta-3"])).toBe("pasta-1");
  });

  it("keeps counting past 9", () => {
    const taken = ["pasta", ...Array.from({ length: 9 }, (_, i) => `pasta-${i + 1}`)];
    expect(generateUniqueSlug("Pasta", taken)).toBe("pasta-10");
  });

  it("compares against the slugified title", () => {
    expect(generateUniqueSlug("Pasta!", ["pasta"])).toBe("pasta-1");
    expect(generateUniqueSlug("Crème Brûlée", ["creme-brulee"])).toBe("creme-brulee-1");
  });

  it("does not treat a counter-suffixed slug as taking the base", () => {
    expect(generateUniqueSlug("Pasta", ["pasta-1"])).toBe("pasta");
  });

  it("numbers fallback slugs for non-Latin titles", () => {
    expect(generateUniqueSlug("麻婆豆腐", [FALLBACK_SLUG])).toBe(`${FALLBACK_SLUG}-1`);
    expect(generateUniqueSlug("Борщ", [FALLBACK_SLUG, `${FALLBACK_SLUG}-1`])).toBe(`${FALLBACK_SLUG}-2`);
  });
});
