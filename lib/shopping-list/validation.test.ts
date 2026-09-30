import { describe, expect, it } from "vitest";
import {
  clearScopeSchema,
  MAX_ITEMS_PER_ADD,
  parseAddBody,
  setCheckedSchema,
  updateShoppingListItemSchema,
} from "./validation";

const RECIPE_ID = "3f2b8c1e-5d4a-4f6b-9c7d-1a2b3c4d5e6f";

describe("parseAddBody", () => {
  it("accepts a manual item and nulls empty fields", () => {
    expect(parseAddBody({ text: "  milk ", amount: "", unit: "  " })).toEqual({
      success: true,
      data: { kind: "manual", item: { text: "milk", amount: null, unit: null } },
    });
  });

  it("rejects blank or overlong text", () => {
    expect(parseAddBody({ text: "   " })).toMatchObject({ success: false });
    expect(parseAddBody({ text: "x".repeat(501) })).toMatchObject({
      success: false,
      error: expect.stringContaining("500"),
    });
    expect(parseAddBody({})).toMatchObject({ success: false });
    expect(parseAddBody({ text: 5 })).toMatchObject({ success: false });
    expect(parseAddBody({ text: "mi\u0000lk" })).toMatchObject({ success: false });
  });

  it("accepts recipe items", () => {
    const result = parseAddBody({
      recipeId: RECIPE_ID,
      items: [{ text: "flour", amount: "200", unit: "g" }, { text: "salt" }],
    });
    expect(result).toEqual({
      success: true,
      data: {
        kind: "recipe",
        recipeId: RECIPE_ID,
        items: [
          { text: "flour", amount: "200", unit: "g" },
          { text: "salt", amount: null, unit: null },
        ],
      },
    });
  });

  it("rejects a bad recipe id, no items or too many items", () => {
    expect(parseAddBody({ recipeId: "nope", items: [{ text: "a" }] })).toEqual({
      success: false,
      error: "Invalid recipe id",
    });
    expect(parseAddBody({ recipeId: RECIPE_ID, items: [] })).toMatchObject({ success: false });
    expect(parseAddBody({ items: [{ text: "a" }] })).toMatchObject({ success: false });
    const tooMany = Array.from({ length: MAX_ITEMS_PER_ADD + 1 }, () => ({ text: "a" }));
    expect(parseAddBody({ recipeId: RECIPE_ID, items: tooMany })).toMatchObject({
      success: false,
    });
  });

  it("rejects overlong amounts and units", () => {
    expect(
      parseAddBody({ recipeId: RECIPE_ID, items: [{ text: "a", amount: "1".repeat(51) }] })
    ).toMatchObject({ success: false });
    expect(parseAddBody({ text: "a", unit: "u".repeat(51) })).toMatchObject({ success: false });
  });
});

describe("updateShoppingListItemSchema", () => {
  it("needs checked or text", () => {
    expect(updateShoppingListItemSchema.safeParse({}).success).toBe(false);
    expect(updateShoppingListItemSchema.safeParse({ checked: "yes" }).success).toBe(false);
    expect(updateShoppingListItemSchema.safeParse({ checked: true }).success).toBe(true);
    expect(updateShoppingListItemSchema.safeParse({ text: " eggs " }).data).toEqual({
      text: "eggs",
    });
    expect(updateShoppingListItemSchema.safeParse({ text: " " }).success).toBe(false);
  });
});

describe("setCheckedSchema", () => {
  it("needs uuids and a boolean", () => {
    expect(setCheckedSchema.safeParse({ ids: [RECIPE_ID], checked: false }).success).toBe(true);
    expect(setCheckedSchema.safeParse({ ids: [], checked: false }).success).toBe(false);
    expect(setCheckedSchema.safeParse({ ids: ["1"], checked: true }).success).toBe(false);
    expect(setCheckedSchema.safeParse({ ids: [RECIPE_ID] }).success).toBe(false);
  });
});

describe("clearScopeSchema", () => {
  it("only knows checked and all", () => {
    expect(clearScopeSchema.safeParse("checked").success).toBe(true);
    expect(clearScopeSchema.safeParse("all").success).toBe(true);
    expect(clearScopeSchema.safeParse(null).success).toBe(false);
    expect(clearScopeSchema.safeParse("everything").success).toBe(false);
  });
});
