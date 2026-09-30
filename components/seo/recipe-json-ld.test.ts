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

describe("RecipeJsonLd author", () => {
  const baseRecipe = {
    id: "1",
    userId: "u1",
    title: "Bread",
    slug: "bread",
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
    code: "abc123",
    createdAt: null,
    updatedAt: null,
    authorName: "Jille",
  };

  function authorOf(recipe: typeof baseRecipe & { authorHandle?: string | null }) {
    const element = RecipeJsonLd({ recipe, url: "https://example.com/r/abc123/bread" });
    const html = (element.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    return JSON.parse(html).author;
  }

  it("links the Person to the public profile when the author has a handle", () => {
    expect(authorOf({ ...baseRecipe, authorHandle: "jille" })).toEqual({
      "@type": "Person",
      name: "Jille",
      url: expect.stringMatching(/^https:\/\/.+\/u\/jille$/),
    });
  });

  it("leaves url out without a handle", () => {
    expect(authorOf({ ...baseRecipe, authorHandle: null })).toEqual({
      "@type": "Person",
      name: "Jille",
    });
  });
});
