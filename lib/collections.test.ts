import { describe, expect, it } from "vitest";
import {
  COLLECTION_NAME_MAX_LENGTH,
  formatRecipeCount,
  isListableInCollection,
  parseCollectionName,
  setMembership,
} from "./collections";

describe("parseCollectionName", () => {
  it("trims and collapses whitespace", () => {
    expect(parseCollectionName("  Weeknight \n  dinners ")).toEqual({
      ok: true,
      name: "Weeknight dinners",
    });
  });

  it("rejects non-strings and blank names", () => {
    expect(parseCollectionName(undefined).ok).toBe(false);
    expect(parseCollectionName(42).ok).toBe(false);
    expect(parseCollectionName("   ").ok).toBe(false);
  });

  it("allows exactly the maximum length and rejects one more", () => {
    expect(parseCollectionName("a".repeat(COLLECTION_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(parseCollectionName("a".repeat(COLLECTION_NAME_MAX_LENGTH + 1)).ok).toBe(false);
  });

  it("counts an emoji as one character, like Postgres char_length", () => {
    const name = "🍝".repeat(COLLECTION_NAME_MAX_LENGTH);
    expect(parseCollectionName(name).ok).toBe(true);
  });
});

describe("isListableInCollection", () => {
  it("lists public recipes and the viewer's own", () => {
    expect(isListableInCollection({ isPublic: true, userId: "other" }, "me")).toBe(true);
    expect(isListableInCollection({ isPublic: false, userId: "me" }, "me")).toBe(true);
  });

  it("hides someone else's recipe that is not public", () => {
    expect(isListableInCollection({ isPublic: false, userId: "other" }, "me")).toBe(false);
    expect(isListableInCollection({ isPublic: null, userId: "other" }, "me")).toBe(false);
  });
});

describe("setMembership", () => {
  const list = [
    { id: "a", name: "A", containsRecipe: false, recipeCount: 2 },
    { id: "b", name: "B", containsRecipe: true, recipeCount: 1 },
  ];

  it("ticks a collection and bumps its count", () => {
    expect(setMembership(list, "a", true)[0]).toEqual({
      id: "a",
      name: "A",
      containsRecipe: true,
      recipeCount: 3,
    });
  });

  it("unticks a collection and lowers its count", () => {
    expect(setMembership(list, "b", false)[1].recipeCount).toBe(0);
  });

  it("is a no-op when the state already matches", () => {
    const next = setMembership(list, "b", true);
    expect(next[1]).toBe(list[1]);
  });

  it("round-trips, which is how a failed request rolls back", () => {
    expect(setMembership(setMembership(list, "a", true), "a", false)).toEqual(list);
  });

  it("never lets a count go negative", () => {
    const odd = [{ id: "x", name: "X", containsRecipe: true, recipeCount: 0 }];
    expect(setMembership(odd, "x", false)[0].recipeCount).toBe(0);
  });
});

describe("formatRecipeCount", () => {
  it("pluralises", () => {
    expect(formatRecipeCount(0)).toBe("0 recipes");
    expect(formatRecipeCount(1)).toBe("1 recipe");
    expect(formatRecipeCount(12)).toBe("12 recipes");
  });
});
