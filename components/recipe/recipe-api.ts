/**
 * Adds the recipe's code to an API URL.
 *
 * Unlisted recipes are open to anyone holding their link, and the code is what
 * the link contains. Sending it lets the API tell a friend who was sent the
 * link apart from someone guessing ids. For public recipes it is harmless.
 */
export function withRecipeCode(path: string, code: string | undefined): string {
  if (!code) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}code=${encodeURIComponent(code)}`;
}
