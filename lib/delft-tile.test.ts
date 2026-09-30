import { describe, expect, it } from "vitest";
import { hashSeed, motifForTags, seededRandom, tileSpec } from "./delft-tile";

describe("seededRandom", () => {
  it("repeats for the same seed and differs between seeds", () => {
    const a = seededRandom("vqbjxsxze3jx");
    const b = seededRandom("vqbjxsxze3jx");
    const c = seededRandom("other-code");
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    for (const n of first) expect(n >= 0 && n < 1).toBe(true);
  });

  it("hashes to an unsigned 32-bit number", () => {
    expect(hashSeed("kookboek")).toBe(hashSeed("kookboek"));
    expect(hashSeed("")).toBeGreaterThanOrEqual(0);
  });
});

describe("motifForTags", () => {
  it.each([
    [["Desserts"], "tulip"],
    [["baking"], "wheat"],
    [["Breakfast"], "sun"],
    [["Seafood"], "fish"],
    [["soups-stews"], "bowl"],
    [["Drinks"], "cup"],
    [["Vegan"], "sprig"],
    [["Dinner"], "windmill"],
    [["poultry"], "hen"],
    [["meat"], "pot"],
  ])("maps %j to %s", (tags, motif) => {
    expect(motifForTags(tags)).toBe(motif);
  });

  it("prefers the most specific tag over the tag order", () => {
    expect(motifForTags(["dinner", "seafood"])).toBe("fish");
    expect(motifForTags(["dinner", "meat", "poultry"])).toBe("hen");
    expect(motifForTags(["dinner", "vegan", "vegetarian"])).toBe("sprig");
    expect(motifForTags(["baking", "desserts"])).toBe("tulip");
  });

  it("ignores tags it doesn't know", () => {
    expect(motifForTags(["Gluten-free"])).toBeNull();
    expect(motifForTags(undefined)).toBeNull();
  });
});

describe("tileSpec", () => {
  it("is stable per recipe and keeps values in range", () => {
    const spec = tileSpec("vqbjxsxze3jx", ["Desserts"]);
    expect(tileSpec("vqbjxsxze3jx", ["Desserts"])).toEqual(spec);
    expect(spec.motif).toBe("tulip");
    expect(spec.tilt).toBeGreaterThanOrEqual(-5);
    expect(spec.tilt).toBeLessThanOrEqual(5);
    expect(spec.wash).toBeGreaterThanOrEqual(0.1);
    expect(spec.wash).toBeLessThanOrEqual(0.24);
    expect(spec.stroke).toBeGreaterThanOrEqual(1.6);
    expect(spec.stroke).toBeLessThanOrEqual(2.2);
  });

  it("gives untagged recipes a motif from the seed", () => {
    expect(tileSpec("abc").motif).toMatch(/rosette|tulip|windmill|sprig/);
  });

  it("varies the corner style across recipes", () => {
    const corners = new Set(
      Array.from({ length: 40 }, (_, i) => tileSpec(`code-${i}`).corner)
    );
    expect(corners.size).toBeGreaterThan(2);
  });
});
