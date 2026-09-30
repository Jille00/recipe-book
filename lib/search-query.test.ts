import { describe, expect, it } from "vitest";
import { prefixTsQuery } from "./search-query";

describe("prefixTsQuery", () => {
  it("matches every word as a prefix", () => {
    expect(prefixTsQuery("Ricot cake")).toBe("ricot:* & cake:*");
  });

  it("keeps accented letters and digits", () => {
    expect(prefixTsQuery("Crème brûlée 2")).toBe("crème:* & brûlée:* & 2:*");
  });

  it("drops tsquery syntax so input can't change the query", () => {
    expect(prefixTsQuery("soup & !(cake) | 'x':A")).toBe("soup:* & cake:* & x:* & a:*");
  });

  it("de-duplicates and caps the number of words", () => {
    expect(prefixTsQuery("a a b")).toBe("a:* & b:*");
    expect(prefixTsQuery("a b c d e f g h i j")?.split(" & ")).toHaveLength(8);
  });

  it("returns null when there's nothing to search for", () => {
    expect(prefixTsQuery("   ")).toBeNull();
    expect(prefixTsQuery("%_&!")).toBeNull();
  });
});
