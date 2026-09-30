import type { Ingredient } from "@/types/recipe";

/**
 * A fingerprint of everything a nutrition estimate is calculated from: the
 * ingredients and the number of servings.
 *
 * The recipe form keeps the fingerprint of the inputs each estimate came from.
 * When the current fingerprint differs, the ingredients or servings have
 * changed since, and the numbers on screen no longer describe the recipe.
 *
 * Only changes that can alter nutrition count:
 * - blank ingredient rows are ignored, exactly as the calculation ignores them;
 * - ingredient order is ignored;
 * - case and repeated whitespace are ignored ("Flour " and "flour").
 */
export function nutritionInputsKey(
  ingredients: Pick<Ingredient, "text" | "amount" | "unit">[],
  servings: string | number | null | undefined
): string {
  const normalize = (value: string | undefined) =>
    (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  const rows = ingredients
    .filter((ingredient) => normalize(ingredient.text))
    .map((ingredient) =>
      JSON.stringify([
        normalize(ingredient.amount),
        normalize(ingredient.unit),
        normalize(ingredient.text),
      ])
    )
    .sort();

  // The calculation reads servings with parseInt, so compare it the same way.
  const parsed =
    typeof servings === "number" ? servings : parseInt(servings ?? "", 10);
  const servingsPart =
    Number.isFinite(parsed) && parsed > 0 ? String(Math.trunc(parsed)) : "";

  return JSON.stringify([servingsPart, rows]);
}

/** Longest value `nutritionBasisKey` returns (kept in sync with the schema). */
export const NUTRITION_BASIS_KEY_MAX = 64;

/**
 * A short, stable fingerprint of `nutritionInputsKey`, small enough to store
 * with the nutrition itself (`NutritionInfo.basisKey`).
 *
 * The full key grows with every ingredient, so it is hashed (cyrb53, 53 bits)
 * and prefixed with a version tag. It is only compared for equality to tell
 * whether saved nutrition still matches the recipe; it is not a security
 * boundary, and a collision would at worst hide one "outdated" hint.
 */
export function nutritionBasisKey(
  ingredients: Pick<Ingredient, "text" | "amount" | "unit">[],
  servings: string | number | null | undefined
): string {
  const input = nutritionInputsKey(ingredients, servings);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return `v1:${hash.toString(36)}`;
}
