import { describe, expect, it } from "vitest";
import { buildRecipeCopy, canLinkToOriginal, type CopySource } from "./recipe-copy";

const source: CopySource = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "author",
  title: "Lasagne",
  description: "Layers",
  ingredients: [{ id: "i1", text: "pasta", amount: "500", unit: "g" }],
  instructions: [{ id: "s1", step: 1, text: "Bake" }],
  prepTimeMinutes: 20,
  cookTimeMinutes: 45,
  servings: 4,
  difficulty: "medium",
  imageUrl: "https://example.supabase.co/storage/v1/object/public/recipe-images/author/1.jpg",
  nutrition: { calories: 600 },
};

describe("buildRecipeCopy", () => {
  it("copies the content for the new owner and points back at the original", () => {
    const copy = buildRecipeCopy(source, "copier", "lasagne-2");
    expect(copy).toEqual({
      userId: "copier",
      title: "Lasagne",
      slug: "lasagne-2",
      description: "Layers",
      ingredients: source.ingredients,
      instructions: source.instructions,
      prepTimeMinutes: 20,
      cookTimeMinutes: 45,
      servings: 4,
      difficulty: "medium",
      imageUrl: source.imageUrl,
      nutrition: { calories: 600 },
      isPublic: false,
      copiedFromId: source.id,
    });
  });

  it("is always private, even if the original was public", () => {
    expect(buildRecipeCopy(source, "copier", "x").isPublic).toBe(false);
  });

  it("never carries over the original's id, code or share token", () => {
    const copy = buildRecipeCopy(
      { ...source, code: "secret", shareToken: "tok" } as CopySource,
      "copier",
      "x"
    );
    expect(copy).not.toHaveProperty("id");
    expect(copy).not.toHaveProperty("code");
    expect(copy).not.toHaveProperty("shareToken");
  });

  it("fills missing lists with empty arrays and nutrition with null", () => {
    const copy = buildRecipeCopy(
      { ...source, ingredients: null, instructions: undefined, nutrition: undefined },
      "copier",
      "x"
    );
    expect(copy.ingredients).toEqual([]);
    expect(copy.instructions).toEqual([]);
    expect(copy.nutrition).toBeNull();
  });
});

describe("canLinkToOriginal", () => {
  it("links public originals for everyone, signed in or not", () => {
    expect(canLinkToOriginal({ isPublic: true, userId: "author" }, undefined)).toBe(true);
    expect(canLinkToOriginal({ isPublic: true, userId: "author" }, "someone")).toBe(true);
  });

  it("links a private original only for its own author", () => {
    const original = { isPublic: false, userId: "author" };
    expect(canLinkToOriginal(original, "author")).toBe(true);
    expect(canLinkToOriginal(original, "copier")).toBe(false);
    expect(canLinkToOriginal(original, null)).toBe(false);
  });

  it("has nothing to link once the original is gone", () => {
    expect(canLinkToOriginal(null, "author")).toBe(false);
  });
});
