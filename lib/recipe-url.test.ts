import { describe, it, expect } from "vitest";
import { recipePath, recipeEditPath } from "@/lib/recipe-url";

describe("recipePath", () => {
  it("builds /r/{code}/{slug}", () => {
    expect(recipePath({ code: "aB3xY9", slug: "pancakes" })).toBe("/r/aB3xY9/pancakes");
  });

  it("ignores extra fields on the recipe object", () => {
    const recipe = { code: "c0de", slug: "pasta-1", id: "x", title: "Pasta" };
    expect(recipePath(recipe)).toBe("/r/c0de/pasta-1");
  });
});

describe("recipeEditPath", () => {
  it("builds /recipes/{slug}/edit", () => {
    expect(recipeEditPath({ slug: "pancakes" })).toBe("/recipes/pancakes/edit");
  });
});
