/**
 * The one address a recipe has. Owners, friends and search engines all use it,
 * so the page you are looking at is always the link you share.
 *
 * The code identifies the recipe (and is unguessable, which is what keeps
 * unlisted recipes private to whoever has the link). The slug is only there so
 * the link is readable; a stale or missing slug redirects to the current one.
 */
export function recipePath(recipe: { code: string; slug: string }): string {
  return `/r/${recipe.code}/${recipe.slug}`;
}

export function recipeEditPath(recipe: { slug: string }): string {
  // Editing is owner-only, and a slug is unique per owner, so the owner-scoped
  // slug is enough here and keeps the existing edit route.
  return `/recipes/${recipe.slug}/edit`;
}
