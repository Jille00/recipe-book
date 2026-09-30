/**
 * Pure helpers for applying an imported (extracted) recipe to the recipe
 * form. Shared by the import modal (preview) and the form (apply), so both
 * agree on which tag an import selects and on what it would overwrite.
 */

import type { ExtractedRecipe } from "@/types/extraction";
import type { Difficulty } from "@/types/recipe";

export interface NamedTag {
  id: string;
  name: string;
}

/**
 * The tag an imported category selects: the tag whose name equals it,
 * ignoring case and surrounding/repeated whitespace. Anything else - a blank
 * category, or only a partial match ("Soup" vs "Cold Soup") - matches nothing,
 * so an import never tags a recipe with something it did not name.
 */
export function matchTagByName<T extends NamedTag>(
  tags: readonly T[],
  category: string | null | undefined
): T | null {
  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();
  const wanted = normalize(category ?? "");
  if (!wanted) return null;
  return tags.find((tag) => normalize(tag.name) === wanted) ?? null;
}

/** Adds `tagId` to the selection unless it is already there (order kept). */
export function mergeTagIds(
  selected: readonly string[],
  tagId: string | null | undefined
): string[] {
  if (!tagId || selected.includes(tagId)) return [...selected];
  return [...selected, tagId];
}

/**
 * An imported number as a value for one of the form's whole-number inputs.
 * Those inputs have no `step`, so the browser rejects a fraction (7.5) on
 * submit; round instead. Values below `min` - or not numbers at all - become
 * empty, except that a positive value rounding below `min` is raised to it
 * (0.4 servings is still one serving).
 */
export function importedWholeNumber(
  value: number | null | undefined,
  min = 0
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "";
  }
  const rounded = Math.round(value);
  if (rounded >= min) return String(rounded);
  return value > 0 ? String(min) : "";
}

/** The form fields an import can change, as the form holds them. */
export interface ImportableFormValues {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  difficulty: Difficulty | "";
  imageUrl: string;
  ingredients: Array<{ text: string; amount?: string; unit?: string }>;
  instructions: Array<{ text: string }>;
  tagIds: string[];
}

/**
 * The form values after applying `extracted` to `current`. Ingredients and
 * instructions come back without ids; the caller assigns them.
 *
 * - The photo is only replaced when the import brings one.
 * - A matching tag is added to the tags already selected, never replacing them.
 */
export function applyImportToForm(
  current: ImportableFormValues,
  extracted: ExtractedRecipe,
  tags: readonly NamedTag[]
): ImportableFormValues {
  const matched = matchTagByName(tags, extracted.suggestedCategory);
  return {
    title: extracted.title ?? "",
    description: extracted.description ?? "",
    prepTime: importedWholeNumber(extracted.prepTimeMinutes),
    cookTime: importedWholeNumber(extracted.cookTimeMinutes),
    servings: importedWholeNumber(extracted.servings, 1),
    difficulty: extracted.difficulty ?? "",
    imageUrl: extracted.imageUrl || current.imageUrl,
    ingredients: extracted.ingredients.map((ing) => ({
      text: ing.text,
      amount: ing.amount || "",
      unit: ing.unit || "",
    })),
    instructions: extracted.instructions.map((inst) => ({ text: inst.text })),
    tagIds: mergeTagIds(current.tagIds, matched?.id),
  };
}

const FIELD_LABELS = {
  title: "Title",
  description: "Description",
  prepTime: "Prep time",
  cookTime: "Cook time",
  servings: "Servings",
  difficulty: "Difficulty",
  imageUrl: "Photo",
  ingredients: "Ingredients",
  instructions: "Instructions",
} as const;

type ListRow = { text: string; amount?: string; unit?: string };

function listContent(rows: ListRow[]): string {
  return JSON.stringify(
    rows
      .filter((row) => row.text.trim())
      .map((row) => [row.amount?.trim() ?? "", row.unit?.trim() ?? "", row.text.trim()])
  );
}

/**
 * Labels of the fields that already hold something and that applying the
 * import would change - what to warn about before overwriting. Tags are never
 * listed: an import only adds to them.
 */
export function fieldsOverwrittenByImport(
  current: ImportableFormValues,
  next: ImportableFormValues
): string[] {
  const changed: string[] = [];
  const scalar = [
    "title",
    "description",
    "prepTime",
    "cookTime",
    "servings",
    "difficulty",
    "imageUrl",
  ] as const;
  for (const key of scalar) {
    const before = current[key].trim();
    if (before && before !== next[key].trim()) changed.push(FIELD_LABELS[key]);
  }
  for (const key of ["ingredients", "instructions"] as const) {
    const before = listContent(current[key]);
    if (before !== "[]" && before !== listContent(next[key])) {
      changed.push(FIELD_LABELS[key]);
    }
  }
  return changed;
}
