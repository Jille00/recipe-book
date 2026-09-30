import { describe, expect, it } from "vitest";
import type { ExtractedRecipe } from "@/types/extraction";
import {
  applyImportToForm,
  fieldsOverwrittenByImport,
  importedWholeNumber,
  matchTagByName,
  mergeTagIds,
  type ImportableFormValues,
} from "./apply-to-form";

const tags = [
  { id: "t-cold", name: "Cold Soup" },
  { id: "t-soup", name: "Soup" },
  { id: "t-dessert", name: "Dessert" },
];

const empty: ImportableFormValues = {
  title: "",
  description: "",
  prepTime: "",
  cookTime: "",
  servings: "",
  difficulty: "",
  imageUrl: "",
  ingredients: [{ text: "", amount: "", unit: "" }],
  instructions: [{ text: "" }],
  tagIds: [],
};

const extracted: ExtractedRecipe = {
  title: "Gazpacho",
  description: "Chilled tomato soup",
  ingredients: [{ text: "tomatoes", amount: "1", unit: "kg" }, { text: "salt" }],
  instructions: [
    { step: 1, text: "Blend" },
    { step: 2, text: "Chill" },
  ],
  prepTimeMinutes: 7.5,
  cookTimeMinutes: 0,
  servings: 4,
  difficulty: "easy",
  suggestedCategory: "soup",
};

describe("matchTagByName", () => {
  it("matches the exact name, ignoring case and whitespace", () => {
    expect(matchTagByName(tags, "soup")?.id).toBe("t-soup");
    expect(matchTagByName(tags, "  COLD   soup ")?.id).toBe("t-cold");
  });

  it("prefers the exact match over one that merely contains it", () => {
    // Regression: the form used to pick "Cold Soup" for "Soup".
    expect(matchTagByName(tags, "Soup")?.id).toBe("t-soup");
  });

  it("does not match partially", () => {
    expect(matchTagByName(tags, "Soups")).toBeNull();
    expect(matchTagByName([{ id: "x", name: "Cold Soup" }], "Soup")).toBeNull();
  });

  it.each([[""], ["   "], [undefined], [null]])("never matches the blank category %j", (category) => {
    expect(matchTagByName(tags, category)).toBeNull();
    expect(matchTagByName([{ id: "blank", name: "" }], category)).toBeNull();
  });
});

describe("mergeTagIds", () => {
  it("adds a new tag after the existing selection", () => {
    expect(mergeTagIds(["a"], "b")).toEqual(["a", "b"]);
  });

  it("does not duplicate a selected tag", () => {
    expect(mergeTagIds(["a", "b"], "a")).toEqual(["a", "b"]);
  });

  it("keeps the selection when there is nothing to add", () => {
    expect(mergeTagIds(["a"], null)).toEqual(["a"]);
    expect(mergeTagIds([], undefined)).toEqual([]);
  });
});

describe("importedWholeNumber", () => {
  it.each([
    [7.5, 0, "8"],
    [7.4, 0, "7"],
    [30, 0, "30"],
    [0, 0, "0"],
    [0.4, 1, "1"],
    [2.5, 1, "3"],
    [0, 1, ""],
    [-3, 0, ""],
    [NaN, 0, ""],
    [Infinity, 0, ""],
    [undefined, 0, ""],
    [null, 0, ""],
  ])("turns %j (min %d) into %j", (value, min, expected) => {
    expect(importedWholeNumber(value, min)).toBe(expected);
  });
});

describe("applyImportToForm", () => {
  it("rounds imported numbers so the inputs accept them", () => {
    const next = applyImportToForm(empty, extracted, tags);
    expect(next.prepTime).toBe("8");
    expect(next.cookTime).toBe("0");
    expect(next.servings).toBe("4");
  });

  it("adds the matched tag to the existing selection", () => {
    const next = applyImportToForm({ ...empty, tagIds: ["t-dessert"] }, extracted, tags);
    expect(next.tagIds).toEqual(["t-dessert", "t-soup"]);
  });

  it("keeps the selected tags when the category matches nothing", () => {
    const next = applyImportToForm(
      { ...empty, tagIds: ["t-dessert"] },
      { ...extracted, suggestedCategory: "" },
      tags
    );
    expect(next.tagIds).toEqual(["t-dessert"]);
  });

  it("keeps the current photo when the import has none", () => {
    expect(applyImportToForm({ ...empty, imageUrl: "https://a/x.jpg" }, extracted, tags).imageUrl).toBe(
      "https://a/x.jpg"
    );
    expect(
      applyImportToForm({ ...empty, imageUrl: "https://a/x.jpg" }, { ...extracted, imageUrl: "https://a/y.jpg" }, tags)
        .imageUrl
    ).toBe("https://a/y.jpg");
  });

  it("maps ingredients and instructions", () => {
    const next = applyImportToForm(empty, extracted, tags);
    expect(next.ingredients).toEqual([
      { text: "tomatoes", amount: "1", unit: "kg" },
      { text: "salt", amount: "", unit: "" },
    ]);
    expect(next.instructions).toEqual([{ text: "Blend" }, { text: "Chill" }]);
  });
});

describe("fieldsOverwrittenByImport", () => {
  it("reports nothing for an empty form", () => {
    expect(fieldsOverwrittenByImport(empty, applyImportToForm(empty, extracted, tags))).toEqual([]);
  });

  it("lists filled-in fields the import would change", () => {
    const current: ImportableFormValues = {
      ...empty,
      title: "My soup",
      servings: "2",
      ingredients: [{ text: "water", amount: "", unit: "" }],
      instructions: [{ text: "" }],
    };
    expect(fieldsOverwrittenByImport(current, applyImportToForm(current, extracted, tags))).toEqual([
      "Title",
      "Servings",
      "Ingredients",
    ]);
  });

  it("ignores fields whose value would stay the same", () => {
    const current = { ...empty, title: " Gazpacho ", servings: "4" };
    expect(fieldsOverwrittenByImport(current, applyImportToForm(current, extracted, tags))).toEqual([]);
  });

  it("counts clearing a filled-in field as overwriting it", () => {
    const current = { ...empty, description: "Mine" };
    const next = applyImportToForm(current, { ...extracted, description: undefined }, tags);
    expect(fieldsOverwrittenByImport(current, next)).toEqual(["Description"]);
  });

  it("does not warn about tags, which are only added to", () => {
    const current = { ...empty, tagIds: ["t-dessert"] };
    expect(fieldsOverwrittenByImport(current, applyImportToForm(current, extracted, tags))).toEqual([]);
  });
});
