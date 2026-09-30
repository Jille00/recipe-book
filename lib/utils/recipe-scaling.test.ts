import { describe, it, expect } from "vitest";
import {
  isDiscreteUnit,
  roundDiscreteAmount,
  isScalableAmount,
  scaleIngredientAmount,
  scaleIngredients,
  scaleNutrition,
  calculateScaleFactor,
} from "./recipe-scaling";
import type { Ingredient } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";

describe("isDiscreteUnit", () => {
  it("treats the empty unit and countable units as discrete", () => {
    for (const unit of ["", "  ", "piece", "Cloves", " EGGS ", "can", "whole", "bunch"]) {
      expect(isDiscreteUnit(unit)).toBe(true);
    }
  });

  it("treats measured units and missing units as non-discrete", () => {
    for (const unit of ["cup", "g", "ml", "tbsp", "lb"]) {
      expect(isDiscreteUnit(unit)).toBe(false);
    }
    expect(isDiscreteUnit(null)).toBe(false);
    expect(isDiscreteUnit(undefined)).toBe(false);
  });
});

describe("roundDiscreteAmount", () => {
  it.each([
    [0, 0],
    [-1, 0],
    [0.1, 0.5],
    [0.49, 0.5],
    [0.5, 0.5],
    [0.6, 0.5],
    [0.7, 1],
    [1, 1],
    [1.45, 1.5],
    [1.5, 1.5],
    [1.55, 1.5],
    [1.3, 1],
    [1.7, 2],
    [2.5, 3],
    [2.4, 2],
    [7.5, 8],
    [12.2, 12],
  ])("rounds %d to %d", (input, expected) => {
    expect(roundDiscreteAmount(input)).toBe(expected);
  });

  // The "within 0.1 of a half" window is inclusive: 0.6 -> 0.5, so 1.4 and 1.6
  // (where floating point gives 0.10000000000000009) -> 1.5.
  it("treats the ±0.1 half-window boundary consistently", () => {
    expect(roundDiscreteAmount(1.4)).toBe(1.5);
    expect(roundDiscreteAmount(1.6)).toBe(1.5);
  });

  it("passes non-finite values through", () => {
    expect(roundDiscreteAmount(NaN)).toBeNaN();
    expect(roundDiscreteAmount(Infinity)).toBe(Infinity);
  });
});

describe("isScalableAmount", () => {
  it.each(["to taste", "To Taste", "pinch", "some", "few", "handful", "as needed", "dash", "splash", "drizzle", "  pinch  "])(
    "%j is not scalable",
    (amount) => {
      expect(isScalableAmount(amount)).toBe(false);
    }
  );

  it("empty and missing amounts are not scalable", () => {
    expect(isScalableAmount(undefined)).toBe(false);
    expect(isScalableAmount("")).toBe(false);
    expect(isScalableAmount("   ")).toBe(false);
  });

  it("numbers and free text are considered scalable", () => {
    expect(isScalableAmount("2")).toBe(true);
    expect(isScalableAmount("1/2")).toBe(true);
    // Only exact matches are excluded
    expect(isScalableAmount("a pinch")).toBe(true);
  });
});

describe("scaleIngredientAmount", () => {
  it("scales whole numbers, decimals and fractions", () => {
    expect(scaleIngredientAmount("2", 2, "cup")).toEqual({ scaledValue: 4, displayAmount: "4" });
    expect(scaleIngredientAmount("1.5", 2, "cup").displayAmount).toBe("3");
    expect(scaleIngredientAmount("1/2", 3, "cup").displayAmount).toBe("1½");
    expect(scaleIngredientAmount("1 1/2", 2, "cup").displayAmount).toBe("3");
    expect(scaleIngredientAmount("½", 0.5, "cup").displayAmount).toBe("¼");
    expect(scaleIngredientAmount("1½", 2, "tbsp").displayAmount).toBe("3");
    expect(scaleIngredientAmount("1/3", 2, "cup").displayAmount).toBe("⅔");
  });

  it("returns the value unchanged at factor 1", () => {
    expect(scaleIngredientAmount("250", 1, "g")).toEqual({
      scaledValue: 250,
      displayAmount: "250",
    });
  });

  it("scales down by fractional factors", () => {
    expect(scaleIngredientAmount("3", 1 / 3, "cup").displayAmount).toBe("1");
    expect(scaleIngredientAmount("1", 0.25, "cup").displayAmount).toBe("¼");
    expect(scaleIngredientAmount("100", 1.5, "g").displayAmount).toBe("150");
  });

  it("handles a zero factor", () => {
    expect(scaleIngredientAmount("2", 0, "cup")).toEqual({ scaledValue: 0, displayAmount: "0" });
  });

  it("handles negative factors without throwing", () => {
    expect(scaleIngredientAmount("2", -1, "cup").displayAmount).toBe("-2");
  });

  it("scales ranges with every supported dash", () => {
    expect(scaleIngredientAmount("1-2", 2, "cup")).toEqual({ scaledValue: 2, displayAmount: "2-4" });
    expect(scaleIngredientAmount("1.5 - 2", 2, "cup").displayAmount).toBe("3-4");
    expect(scaleIngredientAmount("1 1/2–2", 2, "cup").displayAmount).toBe("3-4");
    expect(scaleIngredientAmount("½—¾", 2, "cup").displayAmount).toBe("1-1½");
    expect(scaleIngredientAmount("2‒3", 0.5, "cup").displayAmount).toBe("1-1½");
  });

  it("rounds ranges of countable items", () => {
    expect(scaleIngredientAmount("2-3", 1.5, "cloves").displayAmount).toBe("3-5");
    expect(scaleIngredientAmount("1-2", 0.25, "")).toEqual({
      scaledValue: 0.5,
      displayAmount: "½-½",
    });
  });

  it("returns nulls for non-scalable and unparseable amounts", () => {
    const empty = { scaledValue: null, displayAmount: null };
    expect(scaleIngredientAmount(undefined, 2)).toEqual(empty);
    expect(scaleIngredientAmount("", 2)).toEqual(empty);
    expect(scaleIngredientAmount("to taste", 2)).toEqual(empty);
    expect(scaleIngredientAmount("pinch", 2)).toEqual(empty);
    expect(scaleIngredientAmount("a few", 2)).toEqual(empty);
    expect(scaleIngredientAmount("abc", 2)).toEqual(empty);
  });

  describe("countable items", () => {
    it("rounds named countable units to whole items", () => {
      expect(scaleIngredientAmount("3", 0.5, "cloves").displayAmount).toBe("1½");
      expect(scaleIngredientAmount("5", 0.5, "cloves").displayAmount).toBe("3");
      expect(scaleIngredientAmount("1", 1.25, "bay leaf".split(" ")[1]).displayAmount).toBe("1");
      expect(scaleIngredientAmount("2", 0.1, "slices").displayAmount).toBe("½");
    });

    it("rounds unit-less whole counts (eggs) but never to zero", () => {
      expect(scaleIngredientAmount("3", 1.5, "").displayAmount).toBe("5");
      expect(scaleIngredientAmount("1", 0.25, "").displayAmount).toBe("½");
    });

    it("keeps the precision of unit-less fractional amounts", () => {
      expect(scaleIngredientAmount("1/2", 1.5, "").displayAmount).toBe("¾");
    });

    it("does not round when the unit is undefined (not a known count)", () => {
      expect(scaleIngredientAmount("3", 1.5).displayAmount).toBe("4½");
    });

    it("does not round measured units", () => {
      expect(scaleIngredientAmount("3", 1.5, "cup").displayAmount).toBe("4½");
    });
  });

  it("scales a worded range ('1 to 2')", () => {
    expect(scaleIngredientAmount("1 to 2", 2, "cup").displayAmount).toBe("2-4");
    expect(scaleIngredientAmount("1 To 2", 2, "cup").displayAmount).toBe("2-4");
  });

  it("scales decimal-comma amounts and ranges", () => {
    expect(scaleIngredientAmount("1,5", 2, "cup").displayAmount).toBe("3");
    expect(scaleIngredientAmount("1,5-2", 2, "cup").displayAmount).toBe("3-4");
  });

  it("keeps a trailing descriptor ('2 large')", () => {
    expect(scaleIngredientAmount("2 large", 2, "")).toEqual({
      scaledValue: 4,
      displayAmount: "4 large",
    });
  });

  it("drops a trailing unit, which is shown separately", () => {
    expect(scaleIngredientAmount("2 cups", 2, "cups").displayAmount).toBe("4");
    expect(scaleIngredientAmount("2 cloves", 2, "cloves").displayAmount).toBe("4");
  });
});

describe("scaleIngredients", () => {
  const ingredients: Ingredient[] = [
    { id: "1", text: "flour", amount: "2", unit: "cups" },
    { id: "2", text: "eggs", amount: "3" },
    { id: "3", text: "salt", amount: "to taste" },
    { id: "4", text: "garlic", amount: "2-3", unit: "cloves" },
    { id: "5", text: "water" },
  ];

  it("scales each ingredient and keeps the original fields", () => {
    const result = scaleIngredients(ingredients, 2);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      id: "1",
      text: "flour",
      amount: "2",
      unit: "cups",
      scaledAmount: "4",
      originalAmount: "2",
      wasScaled: true,
    });
    expect(result[1].scaledAmount).toBe("6");
    expect(result[2]).toMatchObject({ scaledAmount: null, wasScaled: false, originalAmount: "to taste" });
    expect(result[3].scaledAmount).toBe("4-6");
    expect(result[4]).toMatchObject({ scaledAmount: null, wasScaled: false, originalAmount: undefined });
  });

  it("treats a missing unit as a count (rounds eggs)", () => {
    const [eggs] = scaleIngredients([{ id: "e", text: "eggs", amount: "3" }], 1.5);
    expect(eggs.scaledAmount).toBe("5");
  });

  it("marks nothing as scaled at factor 1", () => {
    const result = scaleIngredients(ingredients, 1);
    expect(result.every((i) => !i.wasScaled)).toBe(true);
    expect(result[0].scaledAmount).toBe("2");
  });

  it("returns an empty array for no ingredients", () => {
    expect(scaleIngredients([], 3)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const copy = structuredClone(ingredients);
    scaleIngredients(ingredients, 3);
    expect(ingredients).toEqual(copy);
  });
});

describe("scaleNutrition", () => {
  const nutrition: NutritionInfo = {
    calories: 250,
    protein: 10.25,
    carbs: null,
    fat: 3,
    fiber: 0,
    sugar: 1.11,
    confidence: "medium",
    warnings: ["estimate"],
  };

  it("returns null for missing nutrition", () => {
    expect(scaleNutrition(null, 2)).toBeNull();
    expect(scaleNutrition(undefined, 2)).toBeNull();
  });

  it("scales numeric values to one decimal and keeps nulls and metadata", () => {
    expect(scaleNutrition(nutrition, 2)).toEqual({
      calories: 500,
      protein: 20.5,
      carbs: null,
      fat: 6,
      fiber: 0,
      sugar: 2.2,
      confidence: "medium",
      warnings: ["estimate"],
    });
  });

  it("scales by fractional factors", () => {
    expect(scaleNutrition(nutrition, 1 / 3)?.calories).toBe(83.3);
  });
});

describe("calculateScaleFactor", () => {
  it.each([
    [4, 8, 2],
    [4, 2, 0.5],
    [4, 4, 1],
    [3, 1, 1 / 3],
    [2, 3, 1.5],
    [0.5, 1, 2],
  ])("%d -> %d servings = x%d", (from, to, factor) => {
    expect(calculateScaleFactor(from, to)).toBeCloseTo(factor, 10);
  });

  it("falls back to 1 for zero or negative servings", () => {
    expect(calculateScaleFactor(0, 4)).toBe(1);
    expect(calculateScaleFactor(4, 0)).toBe(1);
    expect(calculateScaleFactor(-2, 4)).toBe(1);
    expect(calculateScaleFactor(4, -2)).toBe(1);
  });
});
