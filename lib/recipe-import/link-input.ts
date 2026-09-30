/**
 * Client-side check of what someone typed into the "From Link" field. This is
 * only a convenience (enable the button, add a missing "https://"); the server
 * validates the URL again, including where it points.
 */

/**
 * Turn the entered text into an absolute http(s) URL, or null when it clearly
 * is not a web address. A missing scheme ("www.example.com/recipe") gets
 * "https://".
 */
export function normalizeRecipeLink(input: string): string | null {
  const text = input.trim();
  if (!text || text.length > 2048 || /\s/.test(text)) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
  // "localhost:3000" parses with "localhost:" as a scheme; only treat known
  // schemes as schemes.
  const withScheme =
    hasScheme && /^https?:\/\//i.test(text)
      ? text
      : hasScheme && !/^[^:/]+:\d/.test(text)
        ? null
        : `https://${text.replace(/^\/+/, "")}`;
  if (!withScheme) return null;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Needs a dotted host name ("example.com") or an IP literal.
  const host = url.hostname.replace(/\.$/, "");
  if (!host.includes(".") && !host.startsWith("[")) return null;
  if (host.startsWith(".") || host.includes("..")) return null;
  return url.toString();
}
