import type { Ingredient } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";
import {
  parseAmount,
  formatAmount,
  normalizeUnit,
  splitRange,
  NUMBER_TOKEN,
} from "./unit-conversion";

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

// A number followed by a plain word descriptor ("2 large", "3 medium")
const DESCRIPTOR_PATTERN = new RegExp(`^(${NUMBER_TOKEN})\\s+([A-Za-z][A-Za-z -]*)$`);

/**
 * Units that describe countable/discrete things. Scaled amounts for these are
 * rounded to whole items (or a half where that reads naturally) instead of
 * turning into fractions like "1¼ bay leaves".
 */
export const DISCRETE_UNITS = new Set([
  "",
  "piece",
  "pieces",
  "pinch",
  "pinches",
  "clove",
  "cloves",
  "leaf",
  "leaves",
  "sprig",
  "sprigs",
  "slice",
  "slices",
  "can",
  "cans",
  "tin",
  "tins",
  "egg",
  "eggs",
  "stalk",
  "stalks",
  "head",
  "heads",
  "bunch",
  "bunches",
  "dash",
  "dashes",
  "handful",
  "handfuls",
  "whole",
]);

/**
 * Check whether a unit refers to countable items (including the no-unit case)
 */
export function isDiscreteUnit(unit: string | null | undefined): boolean {
  if (unit === null || unit === undefined) return false;
  return DISCRETE_UNITS.has(unit.trim().toLowerCase());
}

/**
 * Round a scaled amount of a countable ingredient to a sensible value:
 * whole items, or a half when that is genuinely natural, and never 0 for a
 * non-zero input.
 */
export function roundDiscreteAmount(value: number): number {
  if (!Number.isFinite(value)) return value;
  if (value <= 0) return 0;

  // Never let a real ingredient round away to nothing
  if (value < 0.5) return 0.5;

  const floor = Math.floor(value);
  const fraction = value - floor;

  // Halves only read naturally for very small counts ("1½ onions", not
  // "2½ cloves" or "7½ cloves"). The ±0.1 window is inclusive; the epsilon
  // absorbs floating point error so 1.4 and 1.6 behave like 0.6.
  if (value < 2 && Math.abs(fraction - 0.5) <= 0.1 + 1e-9) {
    return floor + 0.5;
  }

  return Math.max(1, Math.round(value));
}

/**
 * The word after the number in an amount like "2 large", kept when scaling.
 * Units are left out, since the unit is shown separately.
 */
function trailingDescriptor(amount: string, unit?: string | null): string {
  const match = amount.trim().match(DESCRIPTOR_PATTERN);
  if (!match) return "";
  const descriptor = match[2].trim();
  const lower = descriptor.toLowerCase();
  if (
    normalizeUnit(descriptor) ||
    DISCRETE_UNITS.has(lower) ||
    lower === unit?.trim().toLowerCase()
  ) {
    return "";
  }
  return descriptor;
}

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
  scaleFactor: number,
  unit?: string | null
): { scaledValue: number | null; displayAmount: string | null } {
  if (!amount || !isScalableAmount(amount)) {
    return { scaledValue: null, displayAmount: null };
  }

  const discrete = isDiscreteUnit(unit);
  const hasNamedUnit = Boolean(unit && unit.trim());
  // With an explicit countable unit ("piece", "clove", …) always round. With no
  // unit at all, only round when the original amount was itself a whole count,
  // so "1/2" style amounts keep their precision.
  const applyRounding = (value: number, original: number) =>
    discrete && (hasNamedUnit || Number.isInteger(original))
      ? roundDiscreteAmount(value)
      : value;

  // Handle ranges like "2-3", "1.5-2", "1 1/2–2", "1 to 2"
  const range = splitRange(amount);
  if (range) {
    const low = parseAmount(range.low);
    const high = parseAmount(range.high);
    if (low !== null && high !== null) {
      const scaledLow = applyRounding(low * scaleFactor, low);
      const scaledHigh = applyRounding(high * scaleFactor, high);
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

  const scaled = applyRounding(parsed * scaleFactor, parsed);
  return {
    scaledValue: scaled,
    displayAmount: [formatAmount(scaled), trailingDescriptor(amount, unit)]
      .filter(Boolean)
      .join(" "),
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
      scaleFactor,
      ingredient.unit ?? ""
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
