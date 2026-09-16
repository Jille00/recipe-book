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
 * Decides whether a caller may view a recipe and take part in it (read and
 * post comments and ratings).
 *
 * A recipe is open to anyone holding its link. That covers public recipes, the
 * owner, and anyone presenting the recipe's code - which is exactly what an
 * unlisted recipe's link contains. Listing publicly only changes whether the
 * recipe can be *found*, never whether a person with the link can use it.
 *
 * The code is unguessable, so presenting it is real proof: nobody can reach an
 * unlisted recipe without having been sent its address.
 */
export function canAccessRecipe(
  recipe: { isPublic: boolean | null; userId: string; code: string },
  viewerId: string | undefined | null,
  presentedCode?: string | null
): boolean {
  if (recipe.isPublic) return true;
  if (viewerId && recipe.userId === viewerId) return true;
  return Boolean(presentedCode && presentedCode === recipe.code);
}
