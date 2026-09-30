import { and, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { recipeTagSlugs } from "./tag-slugs";
import { db, favorite, profile, recipe, user } from "@/lib/db";
import type { Difficulty, RecipeCardData } from "@/types/recipe";

export interface PublicProfile {
  userId: string;
  handle: string;
  name: string;
  image: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  createdAt: Date | null;
}

/**
 * The public face of a profile, looked up by handle. Only what /u/[handle]
 * shows: never the email or preferences.
 */
export async function getPublicProfileByHandle(
  handle: string
): Promise<PublicProfile | null> {
  const [row] = await db
    .select({
      userId: user.id,
      handle: profile.handle,
      name: user.name,
      image: user.image,
      bio: profile.bio,
      website: profile.website,
      location: profile.location,
      createdAt: user.createdAt,
    })
    .from(profile)
    .innerJoin(user, eq(profile.userId, user.id))
    // Handles are stored lowercase; a link typed in capitals still resolves.
    .where(eq(profile.handle, handle.toLowerCase()))
    .limit(1);

  if (!row || !row.handle) return null;
  return { ...row, handle: row.handle };
}

/** True when another user already holds `handle`. */
export async function isHandleTaken(
  handle: string,
  exceptUserId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: profile.id })
    .from(profile)
    .where(and(eq(profile.handle, handle), ne(profile.userId, exceptUserId)))
    .limit(1);
  return !!row;
}

export interface PublicRecipesByUserResult {
  recipes: RecipeCardData[];
  total: number;
}

/**
 * One author's PUBLIC recipes, newest first. Unlisted recipes never appear
 * here, not even for the author: this is the page everyone else sees.
 */
export async function getPublicRecipesByUser(
  authorId: string,
  limit: number,
  offset: number,
  viewerId?: string
): Promise<PublicRecipesByUserResult> {
  const conditions = and(eq(recipe.userId, authorId), eq(recipe.isPublic, true));

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(recipe).where(conditions),
    db
      .select({
        id: recipe.id,
        userId: recipe.userId,
        title: recipe.title,
        slug: recipe.slug,
        description: recipe.description,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        imageUrl: recipe.imageUrl,
        tags: recipeTagSlugs,
        isPublic: recipe.isPublic,
        code: recipe.code,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        favoriteId: favorite.id,
      })
      .from(recipe)
      .leftJoin(
        favorite,
        viewerId
          ? and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, viewerId))
          : sql`false`
      )
      .where(conditions)
      .orderBy(desc(recipe.createdAt), desc(recipe.id))
      .limit(limit)
      .offset(offset),
  ]);

  return {
    total: Number(countResult[0]?.count ?? 0),
    recipes: rows.map(({ favoriteId, ...r }) => ({
      ...r,
      difficulty: r.difficulty as Difficulty | null,
      isFavorited: favoriteId !== null,
    })),
  };
}

/**
 * Profiles worth listing in the sitemap: a handle and at least one public
 * recipe. lastModified is their newest public recipe change.
 */
export async function getPublicProfilesForSitemap(): Promise<
  { handle: string; lastModified: Date | null }[]
> {
  const rows = await db
    .select({
      handle: profile.handle,
      lastModified: sql<Date | null>`max(${recipe.updatedAt})`,
    })
    .from(profile)
    .innerJoin(
      recipe,
      and(eq(recipe.userId, profile.userId), eq(recipe.isPublic, true))
    )
    .where(isNotNull(profile.handle))
    .groupBy(profile.handle);

  return rows.flatMap((r) =>
    r.handle
      ? [
          {
            handle: r.handle,
            // Raw sql aggregates come back as strings from postgres.js.
            lastModified: r.lastModified ? new Date(r.lastModified) : null,
          },
        ]
      : []
  );
}
