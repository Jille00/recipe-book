/**
 * The address of a tag's landing page. Page 1 has no query string, so it is
 * the one canonical URL for the unpaginated listing.
 */
export function tagPath(slug: string, page = 1): string {
  const path = `/tags/${encodeURIComponent(slug)}`;
  return page > 1 ? `${path}?page=${page}` : path;
}

interface CountedTag {
  name: string;
  recipeCount: number;
}

/** Tags that lead somewhere: an empty tag page is a dead end. */
export function tagsWithRecipes<T extends CountedTag>(tags: T[]): T[] {
  return tags.filter((tag) => tag.recipeCount > 0);
}

/**
 * The categories worth a shortcut at the top of /browse: the most used ones
 * (ties alphabetical, so the row doesn't reshuffle between requests).
 */
export function topCategories<T extends CountedTag>(tags: T[], limit: number): T[] {
  return tagsWithRecipes(tags)
    .sort((a, b) => b.recipeCount - a.recipeCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}
