import { describe, expect, it } from "vitest";
import { recipeEditPath, recipePath } from "./recipe-url";

describe("recipePath", () => {
  it("builds the shareable address from code and slug", () => {
    expect(recipePath({ code: "aB3xK9pQ", slug: "pancakes" })).toBe("/r/aB3xK9pQ/pancakes");
  });

  it("uses the code as the identifying segment, whatever the slug", () => {
    const a = recipePath({ code: "aB3xK9pQ", slug: "pancakes" });
    const b = recipePath({ code: "aB3xK9pQ", slug: "pancakes-1" });
    expect(a.split("/")[2]).toBe(b.split("/")[2]);
  });

  it("ignores other properties on the recipe", () => {
    const recipe = { code: "c0de", slug: "soup", title: "Soup", id: "1" };
    expect(recipePath(recipe)).toBe("/r/c0de/soup");
  });
});

describe("recipeEditPath", () => {
  it("builds the owner-scoped edit route from the slug", () => {
    expect(recipeEditPath({ slug: "pancakes" })).toBe("/recipes/pancakes/edit");
  });

  it("does not need the code", () => {
    expect(recipeEditPath({ slug: "creme-brulee-2" })).toBe("/recipes/creme-brulee-2/edit");
  });
});
