/**
 * Whether `path` is a path on this site that is safe to redirect to.
 *
 * Checking for a leading "/" and no "//" is not enough: browsers read "/\evil.com"
 * as "//evil.com", and strip tabs and newlines before they parse a URL. So the
 * path is resolved against a placeholder origin and must still be on it.
 */
export function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/")) return false;
  if (/[\\\u0000-\u001f]/.test(path)) return false;
  try {
    const base = "http://placeholder.invalid";
    return new URL(path, base).origin === base;
  } catch {
    return false;
  }
}

/** `path` when it is safe to redirect to, otherwise `fallback`. */
export function safeRelativePath(
  path: string | null | undefined,
  fallback: string
): string {
  return isSafeRelativePath(path) ? path : fallback;
}
