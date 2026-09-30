import { describe, expect, it } from "vitest";
import { recipeFormSnapshot, type RecipeFormSnapshotInput } from "./recipe-form-snapshot";

const base: RecipeFormSnapshotInput = {
  title: "Pancakes",
  description: "Fluffy",
  ingredients: [
    { text: "flour", amount: "200", unit: "g" },
    { text: "milk", amount: "250", unit: "ml" },
  ],
  instructions: [{ text: "Mix" }, { text: "Fry" }],
  prepTime: "10",
  cookTime: "15",
  servings: "4",
  difficulty: "easy",
  imageUrl: "",
  tagIds: ["a", "b"],
  isPublic: false,
  nutrition: null,
};

const snap = (patch: Partial<RecipeFormSnapshotInput>) => recipeFormSnapshot({ ...base, ...patch });

describe("recipeFormSnapshot", () => {
  const original = recipeFormSnapshot(base);

  describe("is unchanged by edits that would not change what is saved", () => {
    it("ignores blank rows the form drops on submit", () => {
      expect(snap({ ingredients: [...base.ingredients, { text: "  ", amount: "3", unit: "" }] })).toBe(original);
      expect(snap({ instructions: [...base.instructions, { text: "" }] })).toBe(original);
    });

    it("ignores row ids and surrounding whitespace in rows", () => {
      expect(
        snap({
          ingredients: base.ingredients.map((row, i) => ({ ...row, id: `id-${i}`, text: ` ${row.text} ` })),
        })
      ).toBe(original);
    });

    it("compares tags as a set", () => {
      expect(snap({ tagIds: ["b", "a"] })).toBe(original);
      expect(snap({ tagIds: ["a", "b", "a"] })).toBe(original);
    });

    it("treats missing and null nutrition alike", () => {
      expect(snap({ nutrition: undefined })).toBe(original);
    });
  });

  describe("changes when something that is saved changes", () => {
    it.each<[string, Partial<RecipeFormSnapshotInput>]>([
      ["title", { title: "Crêpes" }],
      ["description", { description: "" }],
      ["an ingredient", { ingredients: [{ text: "flour", amount: "250", unit: "g" }, base.ingredients[1]] }],
      ["ingredient order", { ingredients: [base.ingredients[1], base.ingredients[0]] }],
      ["an instruction", { instructions: [{ text: "Mix well" }, { text: "Fry" }] }],
      ["prep time", { prepTime: "12" }],
      ["cook time", { cookTime: "" }],
      ["servings", { servings: "2" }],
      ["difficulty", { difficulty: "hard" }],
      ["the photo", { imageUrl: "https://example.com/a.jpg" }],
      ["tags", { tagIds: ["a"] }],
      ["visibility", { isPublic: true }],
      ["nutrition", { nutrition: { calories: 100 } }],
    ])("changes with %s", (_, patch) => {
      expect(snap(patch)).not.toBe(original);
    });
  });
});
