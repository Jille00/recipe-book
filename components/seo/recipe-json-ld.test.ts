import { describe, expect, it } from "vitest";
import { RecipeJsonLd, serializeJsonLd } from "./recipe-json-ld";

describe("serializeJsonLd", () => {
  it("cannot close the surrounding script tag", () => {
    const title = "</script><img src=x onerror=alert(1)>";
    const out = serializeJsonLd({ name: title });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({ name: title });
  });

  it("escapes ampersands and line separators without changing the data", () => {
    const value = { a: "salt & pepper", b: "x\u2028y\u2029z" };
    const out = serializeJsonLd(value);
    expect(out).not.toMatch(/[&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(value);
  });

  it("drops undefined values", () => {
    expect(serializeJsonLd({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("RecipeJsonLd", () => {
  const recipe = {
    id: "r1",
    userId: "u1",
    title: "Apple Pie",
    slug: "apple-pie",
    description: null,
    ingredients: [],
    instructions: [],
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    servings: null,
    difficulty: null,
    imageUrl: null,
    nutrition: null,
    isPublic: true,
    code: "abc",
    createdAt: null,
    updatedAt: null,
  };

  function render(tags?: string[]) {
    const element = RecipeJsonLd({ recipe, url: "https://example.test/r", tags });
    return JSON.parse(element.props.dangerouslySetInnerHTML.__html);
  }

  it("emits tags as keywords and categories", () => {
    const data = render(["Dessert", "Baking"]);
    expect(data.keywords).toBe("Dessert, Baking");
    expect(data.recipeCategory).toEqual(["Dessert", "Baking"]);
  });

  it("leaves both out for an untagged recipe", () => {
    const data = render();
    expect(data).not.toHaveProperty("keywords");
    expect(data).not.toHaveProperty("recipeCategory");
  });
});
