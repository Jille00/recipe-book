/**
 * Rules for collections (a user's named groups of recipes) that don't need the
 * database, shared by the API routes and the UI.
 */

/** Mirrors the collection_name_length check constraint in the schema. */
export const COLLECTION_NAME_MAX_LENGTH = 100;
export const MAX_COLLECTIONS_PER_USER = 100;
export const MAX_RECIPES_PER_COLLECTION = 500;

export type CollectionNameResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

/**
 * Validates and normalises a collection name from a request body: trimmed,
 * inner runs of whitespace collapsed, 1-100 characters.
 */
export function parseCollectionName(value: unknown): CollectionNameResult {
  if (typeof value !== "string") {
    return { ok: false, error: "Name is required" };
  }
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length === 0) {
    return { ok: false, error: "Name is required" };
  }
  // Count code points, like Postgres char_length, so an emoji counts once.
  if ([...name].length > COLLECTION_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${COLLECTION_NAME_MAX_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, name };
}

/**
 * Whether a recipe may be listed in its viewer's collections: public recipes
 * and their own.
 *
 * Deliberately narrower than canAccessRecipe. An unlisted recipe was added
 * with its code, but the collection only stores the recipe id, and the owner
 * can reset the code to cut off everyone who had the old link. Listing it
 * (with a link that contains the current code) would hand that access right
 * back, so unlisted recipes of other people stay out of collection pages until
 * they are made public again.
 */
export function isListableInCollection(
  recipe: { isPublic: boolean | null; userId: string },
  viewerId: string
): boolean {
  return Boolean(recipe.isPublic) || recipe.userId === viewerId;
}

export interface CollectionMembership {
  id: string;
  name: string;
  containsRecipe: boolean;
  recipeCount: number;
}

/**
 * The membership list after ticking or unticking one collection, used for the
 * optimistic update in the save-to-collection popover (and its rollback, by
 * applying the opposite change).
 */
export function setMembership<T extends CollectionMembership>(
  collections: T[],
  collectionId: string,
  contains: boolean
): T[] {
  return collections.map((c) => {
    if (c.id !== collectionId || c.containsRecipe === contains) return c;
    return {
      ...c,
      containsRecipe: contains,
      recipeCount: Math.max(0, c.recipeCount + (contains ? 1 : -1)),
    };
  });
}

/** "1 recipe", "12 recipes". */
export function formatRecipeCount(count: number): string {
  return `${count} recipe${count === 1 ? "" : "s"}`;
}
