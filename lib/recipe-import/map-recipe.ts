/**
 * Deterministic mapping from a schema.org Recipe (JSON-LD) node to the
 * ExtractedRecipe shape the import dialog and recipe form use.
 */

import type {
  ExtractedIngredient,
  ExtractedInstruction,
  ExtractedRecipe,
  ExtractionResponse,
} from "@/types/extraction";
import {
  MAX_INGREDIENTS,
  MAX_INGREDIENT_TEXT,
  MAX_INSTRUCTIONS,
  MAX_INSTRUCTION_TEXT,
} from "@/lib/utils/validation";
import { htmlToLines, htmlToPlainText } from "./html-text";
import { parseIngredient } from "./ingredient-parser";
import type { JsonObject } from "./json-ld";

/** Caps mirrored from the recipe validation schema (lib/utils/validation.ts). */
export const RECIPE_CAPS = {
  title: 200,
  description: 1000,
  ingredientText: MAX_INGREDIENT_TEXT,
  amount: 50,
  unit: 50,
  ingredients: MAX_INGREDIENTS,
  instructionText: MAX_INSTRUCTION_TEXT,
  instructions: MAX_INSTRUCTIONS,
  category: 100,
} as const;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Shorten to at most `max` characters, ending in "…" when cut. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  // Prefer not to split a word when a space is reasonably close.
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.8 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

const DURATION_PATTERN =
  /^P(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i;

/**
 * ISO 8601 duration ("PT1H30M", "P0DT2H", "PT90M") to whole minutes.
 * Returns undefined for anything invalid, for year/month/week durations and
 * for zero (a "0 min" prep time carries no information).
 */
export function parseIsoDuration(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  const match = DURATION_PATTERN.exec(text);
  // "P" and "PT" alone match the pattern with no components.
  if (!match || !/\d/.test(text) || /T$/i.test(text)) return undefined;
  const num = (part: string | undefined) => (part ? parseFloat(part.replace(",", ".")) : 0);
  const minutes =
    num(match[1]) * 24 * 60 + num(match[2]) * 60 + num(match[3]) + num(match[4]) / 60;
  if (!Number.isFinite(minutes)) return undefined;
  const rounded = Math.round(minutes);
  // Anything beyond 30 days is a data error, not a cooking time.
  if (rounded <= 0 || rounded > 30 * 24 * 60) return undefined;
  return rounded;
}

/** Prep and cook minutes, deriving cook time from total time when needed. */
export function resolveTimes(node: JsonObject): {
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
} {
  const prep = parseIsoDuration(node.prepTime);
  let cook = parseIsoDuration(node.cookTime);
  const total = parseIsoDuration(node.totalTime);

  if (cook === undefined && total !== undefined) {
    if (prep === undefined) {
      cook = total;
    } else if (total - prep > 0) {
      cook = total - prep;
    }
  }
  return { prepTimeMinutes: prep, cookTimeMinutes: cook };
}

// ---------------------------------------------------------------------------
// Yield
// ---------------------------------------------------------------------------

const MAX_SERVINGS = 1000;

/** The first positive whole number in recipeYield ("4 servings", ["4"], 6, "4-6"). */
export function parseYield(value: unknown): number | undefined {
  for (const item of asArray(value)) {
    if (typeof item === "number") {
      if (Number.isFinite(item) && item >= 1) {
        const whole = Math.floor(item);
        if (whole <= MAX_SERVINGS) return whole;
      }
      continue;
    }
    const text = isObject(item)
      ? (item.value ?? item.name)
      : item;
    if (typeof text !== "string" && typeof text !== "number") continue;
    const numbers = String(text).match(/\d+/g) ?? [];
    for (const n of numbers) {
      const parsed = parseInt(n, 10);
      if (parsed >= 1 && parsed <= MAX_SERVINGS) return parsed;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

function typeNames(node: JsonObject): string[] {
  return asArray(node["@type"])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/^.*[/:]/, "").toLowerCase());
}

function stepText(node: JsonObject): string[] {
  // Prefer `text`; some sites only fill `name` or `description`.
  for (const key of ["text", "description", "name"]) {
    const value = node[key];
    if (typeof value === "string" && value.trim()) {
      return htmlToLines(value);
    }
  }
  return [];
}

/**
 * Flatten every supported recipeInstructions shape into plain step texts:
 * a string (split on line breaks), strings, HowToStep, HowToSection with
 * itemListElement, ItemList, and mixtures of these. When there are several
 * named sections, the first step of each is prefixed with the section name.
 */
export function flattenInstructions(value: unknown): string[] {
  const steps: string[] = [];
  const items = asArray(value);
  const sections = items.filter(
    (item) => isObject(item) && typeNames(item).includes("howtosection") && typeof item.name === "string" && item.name.trim()
  );
  const labelSections = sections.length > 1;

  const visit = (item: unknown, depth: number, sectionLabel?: string) => {
    if (depth > 6) return;
    const before = steps.length;
    if (typeof item === "string") {
      steps.push(...htmlToLines(item));
    } else if (Array.isArray(item)) {
      item.forEach((child) => visit(child, depth + 1));
    } else if (isObject(item)) {
      const children = item.itemListElement;
      if (children !== undefined && typeNames(item).some((t) => t !== "howtostep")) {
        const label =
          labelSections && typeof item.name === "string" ? htmlToPlainText(item.name) : undefined;
        asArray(children).forEach((child, i) => visit(child, depth + 1, i === 0 ? label : undefined));
      } else if (children !== undefined && stepText(item).length === 0) {
        asArray(children).forEach((child) => visit(child, depth + 1));
      } else {
        steps.push(...stepText(item));
      }
    }
    if (sectionLabel && steps.length > before) {
      steps[before] = `${sectionLabel}: ${steps[before]}`;
    }
  };

  items.forEach((item) => visit(item, 0));
  return steps.filter((step) => step.length > 0);
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

function toAbsoluteHttpUrl(value: string, baseUrl: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;
  try {
    const url = new URL(trimmed, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Pixel area hinted by an ImageObject's width/height or by the URL itself. */
function sizeHint(url: string, node?: JsonObject): number | undefined {
  const dim = (v: unknown) => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const width = dim(node?.width);
  const height = dim(node?.height);
  if (width && height) return width * height;
  // WordPress thumbnails ("-225x225.jpg") and resize parameters ("resize=500,375").
  const suffix = /-(\d{2,5})x(\d{2,5})\.[a-z]{3,4}(?:$|\?)/i.exec(url);
  if (suffix) return parseInt(suffix[1], 10) * parseInt(suffix[2], 10);
  const resize = /[?&](?:resize|fit)=(\d{2,5})(?:%2C|,)(\d{2,5})/i.exec(url);
  if (resize) return parseInt(resize[1], 10) * parseInt(resize[2], 10);
  return undefined;
}

/**
 * The best absolute http(s) image URL from a schema.org `image` value (URL
 * string, ImageObject, or an array of either). Relative URLs are resolved
 * against the page URL. Normally the first usable entry wins; when the page
 * lists several sizes of the photo, an entry without a size hint (usually the
 * original) or else the largest one is preferred over small thumbnails.
 */
export function resolveImageUrl(value: unknown, pageUrl: string): string | undefined {
  const candidates: { url: string; area?: number }[] = [];
  const visit = (item: unknown, depth: number) => {
    if (depth > 3 || candidates.length >= 50) return;
    if (typeof item === "string") {
      const url = toAbsoluteHttpUrl(item, pageUrl);
      if (url) candidates.push({ url, area: sizeHint(url) });
    } else if (Array.isArray(item)) {
      item.forEach((child) => visit(child, depth + 1));
    } else if (isObject(item)) {
      const raw = item.url ?? item.contentUrl;
      const first = asArray(raw).find((v): v is string => typeof v === "string");
      const url = first ? toAbsoluteHttpUrl(first, pageUrl) : undefined;
      if (url) candidates.push({ url, area: sizeHint(url, item) });
    }
  };
  visit(value, 0);

  if (candidates.length <= 1) return candidates[0]?.url;
  if (candidates.every((c) => c.area === undefined)) return candidates[0].url;
  if (candidates[0].area === undefined) return candidates[0].url;
  const unsized = candidates.find((c) => c.area === undefined);
  // An unsized entry among sized ones is usually the full-size original.
  if (unsized) return unsized.url;
  return candidates.reduce((best, c) => ((c.area ?? 0) > (best.area ?? 0) ? c : best)).url;
}

// ---------------------------------------------------------------------------
// Whole recipe
// ---------------------------------------------------------------------------

function capIngredient(ing: ExtractedIngredient): ExtractedIngredient | null {
  const text = truncate(ing.text, RECIPE_CAPS.ingredientText);
  if (!text) return null;
  const result: ExtractedIngredient = { text };
  if (ing.amount) result.amount = truncate(ing.amount, RECIPE_CAPS.amount);
  if (ing.unit) result.unit = truncate(ing.unit, RECIPE_CAPS.unit);
  return result;
}

/**
 * Bring any extracted recipe (from JSON-LD or from the AI) within the limits
 * the recipe schema enforces on save. Returns the capped recipe and a warning
 * per limit that was hit.
 */
export function enforceRecipeCaps(recipe: ExtractedRecipe): {
  recipe: ExtractedRecipe;
  warnings: string[];
} {
  const warnings: string[] = [];
  const ingredients = recipe.ingredients
    .map(capIngredient)
    .filter((ing): ing is ExtractedIngredient => ing !== null);
  if (ingredients.length > RECIPE_CAPS.ingredients) {
    warnings.push(
      `Only the first ${RECIPE_CAPS.ingredients} of ${ingredients.length} ingredients were imported.`
    );
  }
  const instructionTexts = recipe.instructions
    .map((inst) => truncate(inst.text.trim(), RECIPE_CAPS.instructionText))
    .filter((text) => text.length > 0);
  if (instructionTexts.length > RECIPE_CAPS.instructions) {
    warnings.push(
      `Only the first ${RECIPE_CAPS.instructions} of ${instructionTexts.length} steps were imported.`
    );
  }
  const instructions: ExtractedInstruction[] = instructionTexts
    .slice(0, RECIPE_CAPS.instructions)
    .map((text, index) => ({ step: index + 1, text }));

  const capped: ExtractedRecipe = {
    ...recipe,
    title: truncate(recipe.title.trim(), RECIPE_CAPS.title),
    ingredients: ingredients.slice(0, RECIPE_CAPS.ingredients),
    instructions,
  };
  if (recipe.description !== undefined) {
    const description = truncate(recipe.description.trim(), RECIPE_CAPS.description);
    if (description) capped.description = description;
    else delete capped.description;
  }
  if (recipe.suggestedCategory !== undefined) {
    const category = truncate(recipe.suggestedCategory.trim(), RECIPE_CAPS.category);
    if (category) capped.suggestedCategory = category;
    else delete capped.suggestedCategory;
  }
  for (const key of ["prepTimeMinutes", "cookTimeMinutes"] as const) {
    const v = capped[key];
    if (v !== undefined && !(Number.isInteger(v) && v >= 0)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) capped[key] = Math.round(v);
      else delete capped[key];
    }
  }
  if (capped.servings !== undefined) {
    const s = capped.servings;
    if (typeof s === "number" && Number.isFinite(s) && s >= 1) capped.servings = Math.round(s);
    else delete capped.servings;
  }
  return { recipe: capped, warnings };
}

export interface MapRecipeOptions {
  /** URL of the page the JSON-LD came from, for resolving relative image URLs. */
  pageUrl: string;
  /** Used when the Recipe node has no name (e.g. the page's <title>). */
  fallbackTitle?: string;
}

/**
 * Map a schema.org Recipe node to an ExtractionResponse. The image URL, when
 * present, is the page's external URL; the route replaces it with a re-hosted
 * copy (or drops it) before anything reaches the client.
 */
export function mapRecipeNode(node: JsonObject, options: MapRecipeOptions): ExtractionResponse {
  const title = htmlToPlainText(node.name) || htmlToPlainText(node.headline) || options.fallbackTitle || "";

  const ingredientLines = asArray(node.recipeIngredient ?? node.ingredients)
    .flatMap((item) => (typeof item === "string" ? [item] : isObject(item) && typeof item.text === "string" ? [item.text] : []))
    .map((line) => htmlToPlainText(line))
    .filter(Boolean);
  const ingredients = ingredientLines.map(parseIngredient).filter((ing) => ing.text);

  const instructions = flattenInstructions(node.recipeInstructions).map((text, index) => ({
    step: index + 1,
    text,
  }));

  const category = asArray(node.recipeCategory)
    .map((c) => htmlToPlainText(c))
    .filter(Boolean)
    .join(", ");

  const recipe: ExtractedRecipe = {
    title,
    ingredients,
    instructions,
    ...resolveTimes(node),
  };
  const description = htmlToPlainText(node.description);
  if (description) recipe.description = description;
  const servings = parseYield(node.recipeYield);
  if (servings !== undefined) recipe.servings = servings;
  if (category) recipe.suggestedCategory = category;
  const imageUrl = resolveImageUrl(node.image, options.pageUrl);
  if (imageUrl) recipe.imageUrl = imageUrl;
  if (recipe.prepTimeMinutes === undefined) delete recipe.prepTimeMinutes;
  if (recipe.cookTimeMinutes === undefined) delete recipe.cookTimeMinutes;

  const capped = enforceRecipeCaps(recipe);
  const warnings = [...capped.warnings];
  const missing: string[] = [];
  if (!capped.recipe.title) missing.push("a title");
  if (capped.recipe.ingredients.length === 0) missing.push("ingredients");
  if (capped.recipe.instructions.length === 0) missing.push("instructions");
  if (missing.length > 0) {
    warnings.unshift(`The page did not include ${joinList(missing)}. Please add them yourself.`);
  }

  return {
    recipe: capped.recipe,
    confidence: missing.length === 0 ? "high" : "medium",
    warnings,
  };
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** Whether a Recipe node carries enough to skip the AI fallback. */
export function isUsableRecipe(response: ExtractionResponse): boolean {
  return (
    response.recipe.ingredients.length > 0 || response.recipe.instructions.length > 0
  );
}
