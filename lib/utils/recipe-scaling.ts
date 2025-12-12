import type { Ingredient } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";
import { parseAmount, formatAmount } from "./unit-conversion";

// Patterns for amounts that should not be scaled
const NON_SCALABLE_PATTERNS = [
  /^to taste$/i,
  /^pinch$/i,
  /^some$/i,
  /^few$/i,
  /^handful$/i,
  /^as needed$/i,
  /^dash$/i,
  /^splash$/i,
  /^drizzle$/i,
];

/**
 * Check if an amount string can be scaled
 */
export function isScalableAmount(amount: string | undefined): boolean {
  if (!amount) return false;
  const trimmed = amount.trim();
  if (!trimmed) return false;
  return !NON_SCALABLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Scale an ingredient amount string by a factor
 * Returns the scaled numeric value and formatted display string
 */
export function scaleIngredientAmount(
  amount: string | undefined,
  scaleFactor: number
): { scaledValue: number | null; displayAmount: string | null } {
  if (!amount || !isScalableAmount(amount)) {
    return { scaledValue: null, displayAmount: null };
  }

  // Handle ranges like "2-3"
  const rangeMatch = amount.match(/^(\d+(?:\/\d+)?)\s*-\s*(\d+(?:\/\d+)?)$/);
  if (rangeMatch) {
    const low = parseAmount(rangeMatch[1]);
    const high = parseAmount(rangeMatch[2]);
    if (low !== null && high !== null) {
      const scaledLow = low * scaleFactor;
      const scaledHigh = high * scaleFactor;
      return {
        scaledValue: scaledLow,
        displayAmount: `${formatAmount(scaledLow)}-${formatAmount(scaledHigh)}`,
      };
    }
  }

  // Parse the amount
  const parsed = parseAmount(amount);
  if (parsed === null) {
    return { scaledValue: null, displayAmount: null };
  }

  const scaled = parsed * scaleFactor;
  return {
    scaledValue: scaled,
    displayAmount: formatAmount(scaled),
  };
}

export interface ScaledIngredient extends Ingredient {
  scaledAmount: string | null;
  originalAmount: string | undefined;
  wasScaled: boolean;
}

/**
 * Scale all ingredients by a factor
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  scaleFactor: number
): ScaledIngredient[] {
  return ingredients.map((ingredient) => {
    const { displayAmount } = scaleIngredientAmount(
      ingredient.amount,
      scaleFactor
    );

    return {
      ...ingredient,
      scaledAmount: displayAmount,
      originalAmount: ingredient.amount,
      wasScaled: displayAmount !== null && scaleFactor !== 1,
    };
  });
}

/**
 * Scale nutrition values by a factor
 * Note: This scales the total recipe nutrition
 */
export function scaleNutrition(
  nutrition: NutritionInfo | null | undefined,
  scaleFactor: number
): NutritionInfo | null {
  if (!nutrition) return null;

  const scaleValue = (value: number | null): number | null => {
    if (value === null) return null;
    return Math.round(value * scaleFactor * 10) / 10;
  };

  return {
    ...nutrition,
    calories: scaleValue(nutrition.calories),
    protein: scaleValue(nutrition.protein),
    carbs: scaleValue(nutrition.carbs),
    fat: scaleValue(nutrition.fat),
    fiber: scaleValue(nutrition.fiber),
    sugar: scaleValue(nutrition.sugar),
  };
}

/**
 * Calculate the scale factor from original to new servings
 */
export function calculateScaleFactor(
  originalServings: number,
  newServings: number
): number {
  if (originalServings <= 0 || newServings <= 0) return 1;
  return newServings / originalServings;
}
