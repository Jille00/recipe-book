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
