/**
 * Public profile handles: /u/{handle}.
 *
 * HANDLE_PATTERN must stay identical to the database CHECK constraint on
 * profile.handle (migration 0008), so the app never accepts a handle the
 * database would then reject.
 */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

/**
 * Handles that would be confusing (someone posing as staff), collide with a
 * route, or might become a route later. Compared after normalising.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // Routes, current and plausible
  "about",
  "account",
  "admin",
  "api",
  "auth",
  "browse",
  "collections",
  "confirm-email",
  "contact",
  "dashboard",
  "explore",
  "favorites",
  "feed",
  "forgot-password",
  "help",
  "home",
  "login",
  "logout",
  "new",
  "privacy",
  "profile",
  "r",
  "recipe",
  "recipes",
  "register",
  "reset-password",
  "robots",
  "search",
  "settings",
  "shopping-list",
  "signin",
  "sign-in",
  "signout",
  "sign-out",
  "signup",
  "sign-up",
  "sitemap",
  "static",
  "tag",
  "tags",
  "terms",
  "u",
  "user",
  "users",
  // Identity / staff impersonation
  "administrator",
  "kookboek",
  "mod",
  "moderator",
  "official",
  "root",
  "staff",
  "support",
  "system",
  "team",
  // Technical
  "mail",
  "null",
  "undefined",
  "www",
]);

/** Trim, drop a leading "@" people often type, and lowercase. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@/, "").toLowerCase();
}

export type HandleValidation =
  | { ok: true; handle: string }
  | { ok: false; error: string };

/**
 * Validates a handle as typed. On success returns the normalised (lowercase)
 * handle to store. The messages explain what to change, not just "invalid".
 */
export function validateHandle(input: string): HandleValidation {
  const handle = normalizeHandle(input);

  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Handle must be ${HANDLE_MIN_LENGTH} to ${HANDLE_MAX_LENGTH} characters`,
    };
  }
  if (!/^[a-z0-9-]+$/.test(handle)) {
    return {
      ok: false,
      error: "Handle can only use letters, numbers and hyphens",
    };
  }
  if (handle.startsWith("-") || handle.endsWith("-")) {
    return { ok: false, error: "Handle can't start or end with a hyphen" };
  }
  // Belt and braces: the checks above cover the pattern, but the pattern is
  // the database's rule and has the final word.
  if (!HANDLE_PATTERN.test(handle)) {
    return { ok: false, error: "That handle isn't valid" };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "That handle is reserved. Please pick another" };
  }
  return { ok: true, handle };
}

/** Site-relative address of a public profile. */
export function profilePath(handle: string): string {
  return `/u/${handle}`;
}
