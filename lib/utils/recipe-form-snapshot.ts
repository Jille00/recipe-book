/**
 * A comparable fingerprint of everything the recipe form would save, used to
 * tell whether the form has unsaved changes.
 *
 * Only differences that would change what is saved count: blank ingredient and
 * instruction rows are dropped (the form drops them on submit), row ids are
 * ignored, surrounding whitespace in list rows is ignored, and the tag
 * selection is compared as a set.
 */

export interface RecipeFormSnapshotInput {
  title: string;
  description: string;
  ingredients: Array<{ text: string; amount?: string; unit?: string }>;
  instructions: Array<{ text: string }>;
  prepTime: string;
  cookTime: string;
  servings: string;
  difficulty: string;
  imageUrl: string;
  tagIds: readonly string[];
  isPublic: boolean;
  nutrition: unknown;
}

export function recipeFormSnapshot(values: RecipeFormSnapshotInput): string {
  return JSON.stringify([
    values.title,
    values.description,
    values.ingredients
      .filter((row) => row.text.trim())
      .map((row) => [(row.amount ?? "").trim(), (row.unit ?? "").trim(), row.text.trim()]),
    values.instructions.filter((row) => row.text.trim()).map((row) => row.text.trim()),
    values.prepTime.trim(),
    values.cookTime.trim(),
    values.servings.trim(),
    values.difficulty,
    values.imageUrl,
    [...new Set(values.tagIds)].sort(),
    values.isPublic,
    values.nutrition ?? null,
  ]);
}
