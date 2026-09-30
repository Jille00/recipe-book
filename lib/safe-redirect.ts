/**
 * Validates a redirect destination taken from a URL parameter (a login
 * callback, a "continue to" link) so it can only ever point at this site.
 *
 * Checking the string by hand is not enough. Browsers normalise URLs before
 * following them: a backslash counts as a slash, and tabs and newlines are
 * removed. So "/\evil.com" and "/<tab>/evil.com" both become "//evil.com",
 * which is a link to another site, even though neither starts with "//".
 *
 * Instead this parses the value exactly the way a browser would, against a
 * placeholder origin, and accepts it only if it stays on that origin. It then
 * returns the parsed path rather than the raw input, so what gets used is what
 * the browser will actually follow.
 */

// Any origin works; it only has to be one nothing can legitimately resolve to.
const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  // Only site-relative paths are accepted, never absolute URLs.
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }

  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
