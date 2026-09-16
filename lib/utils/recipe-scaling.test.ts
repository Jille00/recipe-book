import { describe, expect, it } from "vitest";
import type { Ingredient } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";
import {
  calculateScaleFactor,
  isDiscreteUnit,
  isScalableAmount,
  roundDiscreteAmount,
  scaleIngredientAmount,
  scaleIngredients,
  scaleNutrition,
} from "./recipe-scaling";

const display = (amount: string | undefined, factor: number, unit?: string | null) =>
  scaleIngredientAmount(amount, factor, unit).displayAmount;

describe("calculateScaleFactor", () => {
  it.each([
    [4, 8, 2],
    [4, 2, 0.5],
    [4, 4, 1],
    [2, 3, 1.5],
  ])("from %d to %d servings scales by %d", (from, to, factor) => {
    expect(calculateScaleFactor(from, to)).toBe(factor);
  });

  it("scales to thirds without rounding", () => {
    expect(calculateScaleFactor(3, 1)).toBeCloseTo(1 / 3, 10);
  });

  it.each([
    [0, 4],
    [4, 0],
    [-2, 4],
    [4, -1],
  ])("falls back to 1 for invalid servings (%d → %d)", (from, to) => {
    expect(calculateScaleFactor(from, to)).toBe(1);
  });
});

describe("isScalableAmount", () => {
  it.each(["to taste", "To Taste", " as needed ", "pinch", "some", "few", "handful", "dash", "splash", "drizzle"])(
    "treats %j as not scalable",
    (amount) => {
      expect(isScalableAmount(amount)).toBe(false);
    }
  );

  it("treats missing or blank amounts as not scalable", () => {
    expect(isScalableAmount(undefined)).toBe(false);
    expect(isScalableAmount("")).toBe(false);
    expect(isScalableAmount("   ")).toBe(false);
  });

  it.each(["2", "1/2", "1-2", "½"])("treats %j as scalable", (amount) => {
    expect(isScalableAmount(amount)).toBe(true);
  });
});

describe("isDiscreteUnit", () => {
  it.each(["", "piece", "Pieces", " clove ", "CLOVES", "pinch", "egg", "eggs", "slice", "can", "sprig", "bunch", "whole"])(
    "treats %j as countable",
    (unit) => {
      expect(isDiscreteUnit(unit)).toBe(true);
    }
  );

  it.each(["cup", "g", "tbsp", "ml"])("treats the measure %j as continuous", (unit) => {
    expect(isDiscreteUnit(unit)).toBe(false);
  });

  it("does not treat a missing unit as countable", () => {
    expect(isDiscreteUnit(null)).toBe(false);
    expect(isDiscreteUnit(undefined)).toBe(false);
  });
});

describe("roundDiscreteAmount", () => {
  it.each([
    [0.1, 0.5],
    [0.49, 0.5],
    [0.5, 0.5],
    [0.7, 1],
    [1.45, 1.5],
    [1.55, 1.5],
    [1.35, 1],
    [1.9, 2],
    [2.5, 3],
    [2.4, 2],
    [7.5, 8],
  ])("rounds %d to %d", (input, expected) => {
    expect(roundDiscreteAmount(input)).toBe(expected);
  });

  it("never rounds a positive amount down to 0", () => {
    for (const value of [0.0001, 0.01, 0.2, 0.4999]) {
      expect(roundDiscreteAmount(value)).toBeGreaterThan(0);
    }
  });

  it("only uses halves for counts below 2", () => {
    expect(roundDiscreteAmount(2.5) % 1).toBe(0);
    expect(roundDiscreteAmount(5.5) % 1).toBe(0);
  });

  it("returns 0 for zero or negative input and passes non-finite values through", () => {
    expect(roundDiscreteAmount(0)).toBe(0);
    expect(roundDiscreteAmount(-3)).toBe(0);
    expect(roundDiscreteAmount(NaN)).toBeNaN();
    expect(roundDiscreteAmount(Infinity)).toBe(Infinity);
  });
});

describe("scaleIngredientAmount", () => {
  describe("plain amounts", () => {
    it.each([
      ["2", 2, "cup", "4"],
      ["1", 1 / 3, "cup", "⅓"],
      ["250", 1.5, "g", "375"],
      ["1/2", 2, "cup", "1"],
      ["1 1/2", 2, "tbsp", "3"],
      ["1½", 0.5, "cup", "¾"],
      ["0.75", 2, "tsp", "1½"],
    ])("scales %j × %d %s to %j", (amount, factor, unit, expected) => {
      expect(display(amount, factor, unit)).toBe(expected);
    });

    it("returns the numeric scaled value alongside the display string", () => {
      expect(scaleIngredientAmount("1/2", 3, "cup")).toEqual({
        scaledValue: 1.5,
        displayAmount: "1½",
      });
    });
  });

  describe("ranges", () => {
    it.each([
      ["1-2", 2, "2-4"],
      ["1.5-2", 2, "3-4"],
      ["1 1/2–2", 2, "3-4"],
      ["1 1/2—2", 2, "3-4"],
      ["1½-2", 2, "3-4"],
      ["½—¾", 2, "1-1½"],
      ["2 - 3", 1.5, "3-4½"],
      ["2–3", 0.5, "1-1½"],
    ])("scales the range %j × %d to %j", (amount, factor, expected) => {
      expect(display(amount, factor, "cup")).toBe(expected);
    });

    it("scales unitless ranges too", () => {
      expect(display("1.5-2", 2)).toBe("3-4");
      expect(display("1-2", 2, "")).toBe("2-4");
    });

    it("reports the low end of a range as the scaled value", () => {
      expect(scaleIngredientAmount("1-2", 2, "cup").scaledValue).toBe(2);
    });

    it("rounds both ends of a range of countable items", () => {
      expect(display("2-3", 1.3, "cloves")).toBe("3-4");
    });
  });

  describe("countable ingredients", () => {
    it.each([
      ["3", 0.5, "clove", "1½"],
      ["5", 1.5, "cloves", "8"],
      ["2", 1.3, "egg", "3"],
      ["2", 1.25, "pieces", "3"],
      ["1", 3, "pinch", "3"],
      ["1", 1.3, "Slice", "1"],
    ])("rounds %j × %d %s to %j", (amount, factor, unit, expected) => {
      expect(display(amount, factor, unit)).toBe(expected);
    });

    it("never scales a countable ingredient down to 0", () => {
      expect(display("1", 0.1, "clove")).toBe("½");
      expect(display("1", 0.25, "pinch")).toBe("½");
      expect(display("1", 0.01, "piece")).toBe("½");
    });

    it("rounds a whole count without a unit (e.g. 1 onion)", () => {
      expect(display("1", 1.3, "")).toBe("1");
      expect(display("7", 0.5, "")).toBe("4");
      expect(display("2", 0.1, "")).toBe("½");
    });

    it("keeps the precision of a fractional amount without a unit", () => {
      expect(display("1/2", 0.5, "")).toBe("¼");
      expect(display("1/3", 2, "")).toBe("⅔");
      expect(display("1.5", 1.5, "")).toBe("2¼");
      expect(scaleIngredientAmount("1/2", 0.5, "").scaledValue).toBe(0.25);
    });

    it("does not round when the unit is unknown (null or undefined)", () => {
      expect(display("1", 1.3)).toBe("1.3");
      expect(display("1", 1.3, null)).toBe("1.3");
    });

    it("does not round continuous measures", () => {
      expect(display("1", 1.3, "cup")).toBe("1.3");
      expect(display("1", 0.1, "tsp")).toBe("0.1");
    });
  });

  describe("amounts that cannot be scaled", () => {
    it.each(["to taste", "as needed", "pinch", "some"])("leaves %j untouched", (amount) => {
      expect(scaleIngredientAmount(amount, 2, "")).toEqual({ scaledValue: null, displayAmount: null });
    });

    it("returns null for missing or unparseable amounts", () => {
      expect(scaleIngredientAmount(undefined, 2)).toEqual({ scaledValue: null, displayAmount: null });
      expect(scaleIngredientAmount("", 2)).toEqual({ scaledValue: null, displayAmount: null });
      expect(scaleIngredientAmount("a little", 2)).toEqual({ scaledValue: null, displayAmount: null });
    });
  });
});

describe("scaleIngredients", () => {
  const ingredients: Ingredient[] = [
    { id: "1", text: "flour", amount: "2", unit: "cup" },
    { id: "2", text: "onion", amount: "1" },
    { id: "3", text: "salt", amount: "to taste" },
    { id: "4", text: "garlic", amount: "3", unit: "cloves" },
  ];

  it("scales every ingredient and keeps the original fields", () => {
    const scaled = scaleIngredients(ingredients, 1.5);
    expect(scaled).toEqual([
      { id: "1", text: "flour", amount: "2", unit: "cup", scaledAmount: "3", originalAmount: "2", wasScaled: true },
      { id: "2", text: "onion", amount: "1", scaledAmount: "1½", originalAmount: "1", wasScaled: true },
      { id: "3", text: "salt", amount: "to taste", scaledAmount: null, originalAmount: "to taste", wasScaled: false },
      { id: "4", text: "garlic", amount: "3", unit: "cloves", scaledAmount: "5", originalAmount: "3", wasScaled: true },
    ]);
  });

  it("treats an ingredient without a unit as a count", () => {
    expect(scaleIngredients([{ id: "1", text: "egg", amount: "3" }], 0.4)[0].scaledAmount).toBe("1");
  });

  it("marks nothing as scaled at factor 1", () => {
    for (const ingredient of scaleIngredients(ingredients, 1)) {
      expect(ingredient.wasScaled).toBe(false);
    }
  });

  it("does not mutate the input", () => {
    const copy = structuredClone(ingredients);
    scaleIngredients(ingredients, 2);
    expect(ingredients).toEqual(copy);
  });
});

describe("scaleNutrition", () => {
  const nutrition: NutritionInfo = {
    calories: 500,
    protein: 12.34,
    carbs: null,
    fat: 7,
    fiber: 0,
    sugar: 3.33,
    confidence: "medium",
    warnings: ["estimated"],
  };

  it("scales every value and rounds to one decimal", () => {
    expect(scaleNutrition(nutrition, 1.5)).toEqual({
      calories: 750,
      protein: 18.5,
      carbs: null,
      fat: 10.5,
      fiber: 0,
      sugar: 5,
      confidence: "medium",
      warnings: ["estimated"],
    });
  });

  it("returns null without nutrition", () => {
    expect(scaleNutrition(null, 2)).toBeNull();
    expect(scaleNutrition(undefined, 2)).toBeNull();
  });
});
