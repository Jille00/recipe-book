import { describe, expect, it } from "vitest";
import { tagPath, tagsWithRecipes, topCategories } from "./tag-pages";

describe("tagPath", () => {
  it("leaves page 1 without a query string", () => {
    expect(tagPath("dessert")).toBe("/tags/dessert");
    expect(tagPath("dessert", 1)).toBe("/tags/dessert");
  });

  it("adds later pages", () => {
    expect(tagPath("dessert", 3)).toBe("/tags/dessert?page=3");
  });

  it("encodes a slug that is not URL-safe", () => {
    expect(tagPath("a/b c")).toBe("/tags/a%2Fb%20c");
  });
});

const tags = [
  { name: "Soup", recipeCount: 2 },
  { name: "Baking", recipeCount: 0 },
  { name: "Dessert", recipeCount: 5 },
  { name: "Breakfast", recipeCount: 2 },
  { name: "Vegan", recipeCount: 1 },
];

describe("tagsWithRecipes", () => {
  it("drops tags without public recipes", () => {
    expect(tagsWithRecipes(tags).map((t) => t.name)).toEqual([
      "Soup",
      "Dessert",
      "Breakfast",
      "Vegan",
    ]);
  });
});

describe("topCategories", () => {
  it("orders by recipe count, then name, and caps the list", () => {
    expect(topCategories(tags, 3).map((t) => t.name)).toEqual([
      "Dessert",
      "Breakfast",
      "Soup",
    ]);
  });

  it("does not reorder the caller's array", () => {
    const input = [...tags];
    topCategories(input, 2);
    expect(input).toEqual(tags);
  });
});
