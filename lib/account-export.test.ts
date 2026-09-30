import { describe, expect, it } from "vitest";
import {
  ACCOUNT_EXPORT_VERSION,
  accountExportFileName,
  buildAccountExport,
  type ExportSource,
} from "./account-export";

const T1 = new Date("2026-01-02T03:04:05.000Z");
const T2 = new Date("2026-02-03T04:05:06.000Z");

const recipeRow = (id: string, title: string): ExportSource["recipes"][number] => ({
  id,
  title,
  slug: title.toLowerCase(),
  code: `code-${id}`,
  description: null,
  ingredients: [{ amount: "1", unit: "cup", name: "flour" }],
  instructions: [{ step: 1, text: "Mix" }],
  prepTimeMinutes: 10,
  cookTimeMinutes: null,
  servings: 2,
  difficulty: "easy",
  imageUrl: null,
  nutrition: null,
  isPublic: null,
  copiedFromId: null,
  createdAt: T1,
  updatedAt: null,
});

const source = (overrides: Partial<ExportSource> = {}): ExportSource => ({
  user: {
    id: "u1",
    name: "Jo",
    email: "jo@example.com",
    emailVerified: true,
    image: null,
    createdAt: T1,
    updatedAt: T2,
  },
  profile: null,
  recipes: [],
  recipeTags: [],
  favorites: [],
  ratings: [],
  comments: [],
  collections: [],
  collectionRecipes: [],
  shoppingList: [],
  ...overrides,
});

describe("buildAccountExport", () => {
  it("describes itself and the account", () => {
    const result = buildAccountExport(source(), T2);
    expect(result.format).toBe("kookboek-account-export");
    expect(result.version).toBe(ACCOUNT_EXPORT_VERSION);
    expect(result.exportedAt).toBe("2026-02-03T04:05:06.000Z");
    expect(result.account).toEqual({
      id: "u1",
      name: "Jo",
      email: "jo@example.com",
      emailVerified: true,
      image: null,
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: "2026-02-03T04:05:06.000Z",
    });
    expect(result.profile).toBeNull();
  });

  it("includes full recipes with their tags, sorted", () => {
    const result = buildAccountExport(
      source({
        recipes: [recipeRow("r1", "Soup"), recipeRow("r2", "Bread")],
        recipeTags: [
          { recipeId: "r1", name: "Winter" },
          { recipeId: "r1", name: "Dinner" },
          { recipeId: "other", name: "Ignored" },
        ],
      }),
      T2
    );
    expect(result.recipes).toHaveLength(2);
    expect(result.recipes[0]).toMatchObject({
      id: "r1",
      title: "Soup",
      code: "code-r1",
      ingredients: [{ amount: "1", unit: "cup", name: "flour" }],
      instructions: [{ step: 1, text: "Mix" }],
      isPublic: false,
      tags: ["Dinner", "Winter"],
      createdAt: "2026-01-02T03:04:05.000Z",
      updatedAt: null,
    });
    expect(result.recipes[1].tags).toEqual([]);
  });

  it("groups collection entries under their collection", () => {
    const result = buildAccountExport(
      source({
        collections: [
          { id: "c1", name: "Weeknight", createdAt: T1, updatedAt: T1 },
          { id: "c2", name: "Empty", createdAt: T2, updatedAt: T2 },
        ],
        collectionRecipes: [
          { collectionId: "c1", recipeId: "r9", title: "Someone's pie", addedAt: T2 },
        ],
      }),
      T2
    );
    expect(result.collections[0].recipes).toEqual([
      { recipeId: "r9", title: "Someone's pie", addedAt: "2026-02-03T04:05:06.000Z" },
    ]);
    expect(result.collections[1].recipes).toEqual([]);
  });

  it("gives only id and title for other people's recipes", () => {
    const result = buildAccountExport(
      source({
        favorites: [{ recipeId: "r9", title: "Pie", createdAt: T1 }],
        ratings: [{ recipeId: "r9", title: "Pie", value: 5, createdAt: T1, updatedAt: T1 }],
        comments: [
          { id: "m1", recipeId: "r9", title: "Pie", content: "Lovely", createdAt: T1, updatedAt: T1 },
        ],
      }),
      T2
    );
    expect(Object.keys(result.favorites[0]).sort()).toEqual(["favoritedAt", "recipeId", "title"]);
    expect(result.ratings[0].value).toBe(5);
    expect(result.comments[0].content).toBe("Lovely");
    expect(JSON.stringify(result)).not.toMatch(/userId|ownerId/);
  });

  it("keeps shopping list lines whose recipe is gone", () => {
    const result = buildAccountExport(
      source({
        shoppingList: [
          {
            id: "s1",
            text: "Eggs",
            amount: "6",
            unit: null,
            checked: true,
            recipeId: null,
            recipeTitle: null,
            createdAt: T1,
          },
        ],
      }),
      T2
    );
    expect(result.shoppingList).toEqual([
      {
        id: "s1",
        text: "Eggs",
        amount: "6",
        unit: null,
        checked: true,
        recipeId: null,
        recipeTitle: null,
        createdAt: "2026-01-02T03:04:05.000Z",
      },
    ]);
  });

  it("defaults empty profile preferences to an object", () => {
    const result = buildAccountExport(
      source({
        profile: {
          bio: "Hi",
          website: null,
          location: null,
          handle: "jo",
          preferences: null,
          createdAt: null,
          updatedAt: null,
        },
      }),
      T2
    );
    expect(result.profile).toMatchObject({ bio: "Hi", handle: "jo", preferences: {} });
  });

  it("serialises to JSON", () => {
    const result = buildAccountExport(source({ recipes: [recipeRow("r1", "Soup")] }), T2);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

describe("accountExportFileName", () => {
  it("uses the UTC date", () => {
    expect(accountExportFileName(new Date("2026-09-30T23:30:00.000Z"))).toBe(
      "kookboek-export-2026-09-30.json"
    );
  });
});
