/**
 * Display helpers for the public profile page (/u/[handle]). Pure, so the
 * rules about what user-entered text may become a link are tested.
 */

export interface WebsiteLink {
  href: string;
  /** What to show: host and path without the protocol or a trailing "/". */
  label: string;
}

/**
 * A profile's website as a link, or null when it is not an http(s) URL.
 * The API already only accepts http(s), but rows written before that rule
 * (or by hand) must never render as a javascript: or data: link.
 */
export function websiteLink(raw: string | null | undefined): WebsiteLink | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const label = `${url.host}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  return { href: url.href, label: label.replace(/^www\./, "") };
}

/** A short meta description for the profile page. */
export function profileDescription(
  name: string,
  bio: string | null | undefined,
  recipeCount: number
): string {
  const trimmedBio = bio?.trim();
  if (trimmedBio) {
    return trimmedBio.length > 160 ? `${trimmedBio.slice(0, 157).trimEnd()}...` : trimmedBio;
  }
  const recipes = `${recipeCount} public recipe${recipeCount === 1 ? "" : "s"}`;
  return `${name} on Kookboek: ${recipes}.`;
}

/**
 * The Postgres SQLSTATE of a failed query, looking through the wrappers
 * drizzle puts around driver errors (DrizzleQueryError keeps it on `cause`).
 */
export function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** 23505: unique_violation (another profile already has the handle). */
export function isUniqueViolation(error: unknown): boolean {
  return postgresErrorCode(error) === "23505";
}
