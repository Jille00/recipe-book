/**
 * "Save a copy": what a copy of someone else's recipe starts out as.
 */

export interface CopySource {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  ingredients: unknown;
  instructions: unknown;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  difficulty: string | null;
  imageUrl: string | null;
  nutrition: unknown;
}

export interface CopyValues {
  userId: string;
  title: string;
  slug: string;
  description: string | null;
  ingredients: unknown;
  instructions: unknown;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  difficulty: string | null;
  imageUrl: string | null;
  nutrition: unknown;
  isPublic: false;
  copiedFromId: string;
}

/**
 * The new recipe row for `userId`'s copy of `source`.
 *
 * Always private: the copier decides whether to publish their version. The
 * photo URL is shared rather than duplicated. That is safe because photos are
 * only ever deleted from their uploader's own storage folder
 * (deleteRecipeImage), and only once no recipe row uses the URL any more
 * (isImageUrlInUse, and the sweep script builds its in-use set from every
 * recipe), so neither side can remove the photo from under the other.
 */
export function buildRecipeCopy(
  source: CopySource,
  userId: string,
  slug: string
): CopyValues {
  return {
    userId,
    title: source.title,
    slug,
    description: source.description,
    ingredients: source.ingredients ?? [],
    instructions: source.instructions ?? [],
    prepTimeMinutes: source.prepTimeMinutes,
    cookTimeMinutes: source.cookTimeMinutes,
    servings: source.servings,
    difficulty: source.difficulty,
    imageUrl: source.imageUrl,
    nutrition: source.nutrition ?? null,
    isPublic: false,
    copiedFromId: source.id,
  };
}

/**
 * Whether the "Adapted from" link may point at the original: only when the
 * viewer could open it anyway (public, or their own). The original's link
 * contains its code, so showing it for an unlisted original would give the
 * copy's viewers access they were never sent.
 */
export function canLinkToOriginal(
  original: { isPublic: boolean | null; userId: string } | null,
  viewerId: string | undefined | null
): boolean {
  if (!original) return false;
  if (original.isPublic) return true;
  return Boolean(viewerId && original.userId === viewerId);
}
