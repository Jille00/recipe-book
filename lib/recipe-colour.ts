/**
 * Recipe colours: every recipe takes the colour of what's in it (STYLE_GUIDE
 * 06). The colour comes from the recipe's tags, most specific first; a recipe
 * whose tags say nothing gets one picked by a seed (its share code), so it
 * never changes between visits.
 *
 * The colour values live in app/globals.css as `.recipe-<name>` classes.
 */

export const RECIPE_COLOURS = [
  "tomato",
  "carrot",
  "lemon",
  "basil",
  "sea",
  "plum",
  "beet",
  "rye",
  "butter",
] as const;

export type RecipeColour = (typeof RECIPE_COLOURS)[number];

/** 32-bit FNV-1a hash: a stable number for any string. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Tag slugs (and names) to colours, most specific first: a recipe tagged
// "dinner" and "seafood" is sea blue, not the generic dinner plum.
const COLOUR_BY_TAG: Array<[RegExp, RecipeColour]> = [
  [/fish|seafood|vis|zeevruchten/, "sea"],
  [/soup|stew|soep|stoof/, "carrot"],
  [/dessert|sweet|fruit|toetje/, "beet"],
  [/bread|brood|grain|graan/, "rye"],
  [/bak|baking|cake|taart|pastry/, "butter"],
  [/breakfast|ontbijt|brunch|egg|drink|beverage|cocktail|drank/, "lemon"],
  [/vegan|vegetar|salad|salade|groente|vegetable/, "basil"],
  [/pasta|sauce|saus|poultry|chicken|kip|gevogelte|meat|vlees|beef|rund|pork|varken/, "tomato"],
  [/dinner|diner|main|hoofd/, "plum"],
];

/** The colour a recipe's tags call for, or null when none of them suggest one. */
export function colourForTags(tags: readonly string[] | null | undefined): RecipeColour | null {
  const keys = (tags ?? []).map((tag) => tag.toLowerCase());
  for (const [pattern, colour] of COLOUR_BY_TAG) {
    if (keys.some((key) => pattern.test(key))) return colour;
  }
  return null;
}

/** A recipe's colour. Same seed and tags, same colour, everywhere. */
export function recipeColour(seed: string, tags?: readonly string[] | null): RecipeColour {
  return colourForTags(tags) ?? RECIPE_COLOURS[hashSeed(seed || "kookboek") % RECIPE_COLOURS.length];
}

/** The class that puts a recipe's colour in scope: `bg-recipe`, `text-on-recipe`. */
export function recipeColourClass(seed: string, tags?: readonly string[] | null): string {
  return `recipe-${recipeColour(seed, tags)}`;
}
