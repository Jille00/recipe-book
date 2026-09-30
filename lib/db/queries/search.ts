import { eq, and, or, sql, desc, ilike, lte, gte, inArray } from "drizzle-orm";
import { db, recipe, user, recipeTag, favorite, profile } from "@/lib/db";
import type { Ingredient, Instruction, Difficulty, RecipeCardData } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";
import { ratingStatsSubquery } from "./ratings";
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

export interface SearchRecipeResult {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  nutrition: NutritionInfo | null;
  isPublic: boolean | null;
  code: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  authorName: string | null;
  isOwn: boolean;
}

export async function searchRecipes(
  filters: SearchFilters,
  userId?: string,
  limit = 50,
  offset = 0
): Promise<SearchRecipeResult[]> {
  const conditions = [];

  // Visibility: public OR owned by user
  if (userId) {
    conditions.push(or(eq(recipe.isPublic, true), eq(recipe.userId, userId)));
  } else {
    conditions.push(eq(recipe.isPublic, true));
  }

  // Text search across title, description, and ingredients
  if (filters.query && filters.query.trim()) {
    const searchTerm = containsPattern(filters.query.trim());
    conditions.push(
      or(
        ilike(recipe.title, searchTerm),
        ilike(recipe.description, searchTerm),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${recipe.ingredients}) AS ing
          WHERE ing->>'text' ILIKE ${searchTerm}
        )`
      )
    );
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

  // Tag filtering via EXISTS subquery (using parameterized query to prevent SQL injection)
  if (filters.tagIds && filters.tagIds.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${recipeTag}
        WHERE ${recipeTag.recipeId} = ${recipe.id}
        AND ${inArray(recipeTag.tagId, filters.tagIds)}
      )`
    );
  }

  const results = await db
    .select({
      id: recipe.id,
      userId: recipe.userId,
      title: recipe.title,
      slug: recipe.slug,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl,
      nutrition: recipe.nutrition,
      isPublic: recipe.isPublic,
      code: recipe.code,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(recipe.createdAt), desc(recipe.id))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    // Share tokens are owner-only capabilities; never include them in listings.
    isOwn: userId ? r.userId === userId : false,
  }));
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

  // Text search across title, description, and ingredients
  if (filters.query && filters.query.trim()) {
    const searchTerm = containsPattern(filters.query.trim());
    conditions.push(
      or(
        ilike(recipe.title, searchTerm),
        ilike(recipe.description, searchTerm),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${recipe.ingredients}) AS ing
          WHERE ing->>'text' ILIKE ${searchTerm}
        )`
      )
    );
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

  const ratingStats = ratingStatsSubquery();

  // Every order ends on created_at and id so pages never overlap or skip.
  const newestFirst = [desc(recipe.createdAt), desc(recipe.id)];
  const orderBy = {
    newest: newestFirst,
    "top-rated": [
      sql`${ratingStats.averageRating} desc nulls last`,
      sql`${ratingStats.totalRatings} desc nulls last`,
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
      isPublic: recipe.isPublic,
      code: recipe.code,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
      authorHandle: profile.handle,
      favoriteId: favorite.id,
      averageRating: ratingStats.averageRating,
      totalRatings: ratingStats.totalRatings,
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
    .leftJoin(ratingStats, eq(ratingStats.recipeId, recipe.id))
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

/**
 * ILIKE pattern matching `text` anywhere. %, _ and the escape character itself
 * are escaped so a search for "100%" is taken literally instead of matching
 * every recipe.
 */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}
