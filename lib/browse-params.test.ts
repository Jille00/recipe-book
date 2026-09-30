import { describe, expect, it } from "vitest";
import {
  hasActiveBrowseFilters,
  parseBrowseFilters,
  parseBrowsePage,
  parseBrowseSort,
} from "./browse-params";

const TAG_A = "11111111-1111-4111-8111-111111111111";
const TAG_B = "22222222-2222-4222-8222-222222222222";

describe("parseBrowseFilters", () => {
  it("returns no filters for an empty query string", () => {
    expect(parseBrowseFilters({})).toEqual({});
  });

  it("takes the first value of a repeated q and trims it", () => {
    expect(parseBrowseFilters({ q: ["  soup ", "cake"] })).toEqual({ query: "soup" });
  });

  it("caps the search text at 100 characters", () => {
    expect(parseBrowseFilters({ q: "a".repeat(500) }).query).toHaveLength(100);
  });

  it("keeps only uuid tags, de-duplicated", () => {
    expect(parseBrowseFilters({ tags: [TAG_A, "vegan", TAG_A, TAG_B] }).tagIds).toEqual([
      TAG_A,
      TAG_B,
    ]);
    expect(parseBrowseFilters({ tags: "vegan" }).tagIds).toBeUndefined();
  });

  it("caps the number of tags", () => {
    const tags = Array.from(
      { length: 30 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
    );
    expect(parseBrowseFilters({ tags }).tagIds).toHaveLength(20);
  });

  it("accepts only known difficulties", () => {
    expect(parseBrowseFilters({ difficulty: "hard" }).difficulty).toBe("hard");
    expect(parseBrowseFilters({ difficulty: "extreme" }).difficulty).toBeUndefined();
  });

  it("clamps numbers that would overflow a Postgres int", () => {
    const filters = parseBrowseFilters({
      prepTime: "3000000000",
      minServings: "99999999999",
    });
    expect(filters.maxPrepTime).toBe(100_000);
    expect(filters.minServings).toBe(100_000);
  });

  it.each(["0", "-5", "abc", "1.5", "", "1e3"])("ignores %j as a number", (raw) => {
    expect(parseBrowseFilters({ cookTime: raw }).maxCookTime).toBeUndefined();
  });
});

describe("parseBrowsePage", () => {
  it.each([
    [undefined, 1],
    ["abc", 1],
    ["-1", 1],
    ["3", 3],
    [["2", "5"], 2],
  ] as const)("parses %j as %d", (raw, expected) => {
    expect(parseBrowsePage(raw as string | string[] | undefined)).toBe(expected);
  });
});

describe("hasActiveBrowseFilters", () => {
  it("ignores params that parse to nothing", () => {
    expect(hasActiveBrowseFilters({ tags: "vegan", prepTime: "0" })).toBe(false);
    expect(hasActiveBrowseFilters({ q: "soup" })).toBe(true);
  });

  it("counts a sort only when it is not the default", () => {
    expect(hasActiveBrowseFilters({ sort: "newest" })).toBe(false);
    expect(hasActiveBrowseFilters({ sort: "bogus" })).toBe(false);
    expect(hasActiveBrowseFilters({ sort: "top-rated" })).toBe(true);
    expect(hasActiveBrowseFilters({ sort: "quickest" })).toBe(true);
  });
});

describe("parseBrowseSort", () => {
  it.each([
    [undefined, "newest"],
    ["", "newest"],
    ["newest", "newest"],
    ["top-rated", "top-rated"],
    ["quickest", "quickest"],
    ["Top-Rated", "newest"],
    ["oldest", "newest"],
    [["quickest", "top-rated"], "quickest"],
  ] as const)("parses %j as %s", (raw, expected) => {
    expect(parseBrowseSort(raw as string | string[] | undefined)).toBe(expected);
  });

  it("is not a search filter", () => {
    expect(parseBrowseFilters({ sort: "top-rated" })).toEqual({});
  });
});
