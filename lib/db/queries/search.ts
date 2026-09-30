import { eq, and, sql, desc, lte, gte, inArray } from "drizzle-orm";
import { recipeTagSlugs } from "./tag-slugs";
import { prefixTsQuery } from "@/lib/search-query";
import { db, recipe, user, recipeTag, favorite, profile } from "@/lib/db";
import type { Difficulty, RecipeCardData } from "@/types/recipe";
import { toRatingStats } from "@/lib/rating-stats";
import { DEFAULT_BROWSE_SORT, type BrowseSort } from "@/lib/browse-sort";

export interface SearchFilters {
  query?: string;
  tagIds?: string[];
  difficulty?: Difficulty;
  maxPrepTime?: number;
  maxCookTime?: number;
  minServings?: number;
  maxServings?: number;
}

export interface PublicRecipesResult {
  recipes: (RecipeCardData & {
    authorName: string | null;
    authorHandle: string | null;
    isOwn: boolean;
  })[];
  total: number;
}

export async function getPublicRecipes(
  filters: SearchFilters,
  limit = 12,
  offset = 0,
  userId?: string,
  sort: BrowseSort = DEFAULT_BROWSE_SORT
): Promise<PublicRecipesResult> {
  const conditions = [];

  // Only public recipes
  conditions.push(eq(recipe.isPublic, true));

  // Full-text search over title, description and ingredients (the indexed
  // search_vector column), matching each word as a prefix.
  const tsQuery = filters.query ? prefixTsQuery(filters.query) : null;
  const matchQuery = tsQuery ? sql`to_tsquery('simple', ${tsQuery})` : null;
  if (matchQuery) {
    conditions.push(sql`${recipe.searchVector} @@ ${matchQuery}`);
  }

  // Difficulty filter
  if (filters.difficulty) {
    conditions.push(eq(recipe.difficulty, filters.difficulty));
  }

  // Prep time filter (max)
  if (filters.maxPrepTime !== undefined) {
    conditions.push(lte(recipe.prepTimeMinutes, filters.maxPrepTime));
  }

  // Cook time filter (max)
  if (filters.maxCookTime !== undefined) {
    conditions.push(lte(recipe.cookTimeMinutes, filters.maxCookTime));
  }

  // Servings filters
  if (filters.minServings !== undefined) {
    conditions.push(gte(recipe.servings, filters.minServings));
  }
  if (filters.maxServings !== undefined) {
    conditions.push(lte(recipe.servings, filters.maxServings));
  }

  // Tag filtering via EXISTS subquery
  if (filters.tagIds && filters.tagIds.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${recipeTag}
        WHERE ${recipeTag.recipeId} = ${recipe.id}
        AND ${inArray(recipeTag.tagId, filters.tagIds)}
      )`
    );
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(recipe)
    .where(and(...conditions));

  const total = Number(countResult[0]?.count ?? 0);

  // Every order ends on created_at and id so pages never overlap or skip.
  const newestFirst = [desc(recipe.createdAt), desc(recipe.id)];
  const orderBy = {
    // With a search, the default order puts the best matches (title words
    // outweigh ingredients) first; an explicit sort still wins.
    newest: matchQuery
      ? [sql`ts_rank(${recipe.searchVector}, ${matchQuery}) desc`, ...newestFirst]
      : newestFirst,
    "top-rated": [
      sql`${recipe.ratingAverage} desc nulls last`,
      desc(recipe.ratingCount),
      ...newestFirst,
    ],
    // Same total the card's time badge shows; no time at all sorts last.
    quickest: [
      sql`nullif(coalesce(${recipe.prepTimeMinutes}, 0) + coalesce(${recipe.cookTimeMinutes}, 0), 0) asc nulls last`,
      ...newestFirst,
    ],
  }[sort];

  // Get paginated results
  const results = await db
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
      authorName: user.name,
      authorHandle: profile.handle,
      favoriteId: favorite.id,
      averageRating: recipe.ratingAverage,
      totalRatings: recipe.ratingCount,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .leftJoin(profile, eq(profile.userId, recipe.userId))
    .leftJoin(
      favorite,
      userId
        ? and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, userId))
        : sql`false`
    )
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return {
    recipes: results.map(({ averageRating, totalRatings, ...r }) => ({
      ...r,
          difficulty: r.difficulty as Difficulty | null,
        // Share tokens are owner-only capabilities; never include them in listings.
      isOwn: false,
      isFavorited: r.favoriteId !== null,
      ratingStats: toRatingStats(averageRating, totalRatings),
    })),
    total,
  };
}
