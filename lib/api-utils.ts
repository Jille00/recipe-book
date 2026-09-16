import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * All application ids (recipe, comment, ...) are Postgres uuids. Passing a
 * non-uuid string straight to the database raises a 22P02 error that surfaces
 * as a 500, so route handlers validate the route param first.
 */
export function isUuid(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/** Standard response for a malformed id route param. */
export function invalidIdResponse(resource = "resource"): NextResponse {
  return NextResponse.json(
    { error: `Invalid ${resource} id` },
    { status: 400 }
  );
}

/**
 * Parse a pagination query param, clamping it into a sane range and falling
 * back to `fallback` for missing / non-numeric values.
 */
export function parsePaginationParam(
  raw: string | null,
  { fallback, min, max }: { fallback: number; min: number; max: number }
): number {
  if (raw === null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

/**
 * Absolute origin for building links returned to clients. Prefers the
 * configured public URL and falls back to the incoming request so we never
 * hand out "undefined/..." URLs when the env var is missing.
 */
export function getRequestOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * Decides whether a caller may READ a recipe's public-facing data (its
 * ratings and comments).
 *
 * A recipe is readable when it is public, when the caller owns it, or when the
 * caller presents the recipe's current share token. The token case exists
 * because a share link is the only proof a non-owner has for a private recipe:
 * the page itself is server-rendered from the token, so the client fetches it
 * makes afterwards have to be able to prove the same thing. Possession of the
 * token is exactly the access the owner granted, and revoking it revokes this.
 *
 * Writes are deliberately NOT covered by this - posting a comment or a rating
 * still requires the recipe to be public or owned.
 */
export function canReadRecipe(
  recipe: { isPublic: boolean | null; userId: string; shareToken?: string | null },
  viewerId: string | undefined | null,
  presentedShareToken?: string | null
): boolean {
  if (recipe.isPublic) return true;
  if (viewerId && recipe.userId === viewerId) return true;
  return Boolean(
    presentedShareToken &&
      recipe.shareToken &&
      presentedShareToken === recipe.shareToken
  );
}
