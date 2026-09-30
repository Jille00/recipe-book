import { describe, it, expect } from "vitest";
import { generateSlug, generateUniqueSlug, FALLBACK_SLUG } from "./slug";

describe("generateSlug", () => {
  it.each([
    ["Chocolate Chip Cookies", "chocolate-chip-cookies"],
    ["  Spaced   Out  ", "spaced-out"],
    ["10-Minute Pasta!", "10-minute-pasta"],
    ["Pasta (Vegan)", "pasta-vegan"],
    ["Hello_World", "hello-world"],
    ["a -- b __ c", "a-b-c"],
    ["-leading and trailing-", "leading-and-trailing"],
    ["Mac & Cheese", "mac-and-cheese"],
    ["Salt&Pepper", "salt-and-pepper"],
    ["Mom's \"Best\" Pie", "moms-best-pie"],
    ["Line\nbreak\ttab", "line-break-tab"],
  ])("%j -> %j", (input, expected) => {
    expect(generateSlug(input)).toBe(expected);
  });

  it.each([
    ["Crème Brûlée", "creme-brulee"],
    ["Jalapeño Poppers", "jalapeno-poppers"],
    ["Pâté à choux", "pate-a-choux"],
    ["Café au lait", "cafe-au-lait"],
    ["Königsberger Klopse", "konigsberger-klopse"],
    ["Straße", "strasse"],
    ["GROẞE Brezel", "grosse-brezel"],
    ["Æbleskiver", "aebleskiver"],
    ["Smørrebrød", "smorrebrod"],
    ["Bœuf bourguignon", "boeuf-bourguignon"],
    ["Łódź pierogi", "lodz-pierogi"],
    ["Þorramatur", "thorramatur"],
    ["İstanbul simit", "istanbul-simit"],
    ["Ħobż", "hobz"],
  ])("transliterates %j -> %j", (input, expected) => {
    expect(generateSlug(input)).toBe(expected);
  });

  it("drops emoji and symbols", () => {
    expect(generateSlug("🍕 Pizza Night 🎉")).toBe("pizza-night");
    expect(generateSlug("Café ☕")).toBe("cafe");
    expect(generateSlug("100% Rye™")).toBe("100-rye");
  });

  it("falls back when nothing URL-safe remains", () => {
    expect(generateSlug("")).toBe(FALLBACK_SLUG);
    expect(generateSlug("   ")).toBe(FALLBACK_SLUG);
    expect(generateSlug("---")).toBe(FALLBACK_SLUG);
    expect(generateSlug("🍕🍔")).toBe(FALLBACK_SLUG);
    expect(generateSlug("寿司")).toBe(FALLBACK_SLUG);
    expect(generateSlug("Борщ")).toBe(FALLBACK_SLUG);
    expect(generateSlug("!!!")).toBe(FALLBACK_SLUG);
  });

  it("keeps the latin part of mixed-script titles", () => {
    expect(generateSlug("Ramen ラーメン")).toBe("ramen");
  });

  it("returns the fallback for non-string input", () => {
    expect(generateSlug(undefined as unknown as string)).toBe(FALLBACK_SLUG);
    expect(generateSlug(null as unknown as string)).toBe(FALLBACK_SLUG);
    expect(generateSlug(123 as unknown as string)).toBe(FALLBACK_SLUG);
  });

  it("produces only URL-safe characters for very long titles", () => {
    const title = "Très Long Titre ".repeat(50);
    const slug = generateSlug(title);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slug.startsWith("tres-long-titre-tres")).toBe(true);
    // No truncation is applied (titles are capped at 200 by the schema)
    expect(slug.length).toBe("tres-long-titre".length * 50 + 49);
  });

  it("is idempotent", () => {
    for (const title of ["Crème Brûlée", "Mac & Cheese", "a -- b"]) {
      const once = generateSlug(title);
      expect(generateSlug(once)).toBe(once);
    }
  });
});

describe("generateUniqueSlug", () => {
  it("returns the base slug when unused", () => {
    expect(generateUniqueSlug("Pasta", [])).toBe("pasta");
    expect(generateUniqueSlug("Pasta", ["pizza", "pasta-1"])).toBe("pasta");
  });

  it("appends the first free counter on collision", () => {
    expect(generateUniqueSlug("Pasta", ["pasta"])).toBe("pasta-1");
    expect(generateUniqueSlug("Pasta", ["pasta", "pasta-1", "pasta-2"])).toBe("pasta-3");
    expect(generateUniqueSlug("Pasta", ["pasta", "pasta-2"])).toBe("pasta-1");
  });

  it("keeps fallback slugs distinct", () => {
    expect(generateUniqueSlug("寿司", ["recipe"])).toBe("recipe-1");
    expect(generateUniqueSlug("🍕", ["recipe", "recipe-1"])).toBe("recipe-2");
  });

  it("handles titles that already end in a number", () => {
    expect(generateUniqueSlug("Pasta 1", ["pasta-1"])).toBe("pasta-1-1");
  });
});
