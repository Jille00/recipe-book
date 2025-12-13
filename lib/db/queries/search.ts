import { eq, and, or, sql, desc, ilike, lte, gte, inArray } from "drizzle-orm";
import { db, recipe, user, recipeTag, favorite } from "@/lib/db";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";

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
  shareToken: string | null;
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
    const searchTerm = `%${filters.query.trim()}%`;
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
      shareToken: recipe.shareToken,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(recipe.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    isOwn: userId ? r.userId === userId : false,
  }));
}

export interface PublicRecipesResult {
  recipes: SearchRecipeResult[];
  total: number;
}

export async function getPublicRecipes(
  filters: SearchFilters,
  limit = 12,
  offset = 0,
  userId?: string
): Promise<PublicRecipesResult> {
  const conditions = [];

  // Only public recipes
  conditions.push(eq(recipe.isPublic, true));

  // Text search across title, description, and ingredients
  if (filters.query && filters.query.trim()) {
    const searchTerm = `%${filters.query.trim()}%`;
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

  // Get paginated results
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
      shareToken: recipe.shareToken,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
      favoriteId: favorite.id,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .leftJoin(
      favorite,
      userId
        ? and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, userId))
        : sql`false`
    )
    .where(and(...conditions))
    .orderBy(desc(recipe.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    recipes: results.map((r) => ({
      ...r,
      ingredients: r.ingredients as Ingredient[],
      instructions: r.instructions as Instruction[],
      difficulty: r.difficulty as Difficulty | null,
      nutrition: r.nutrition as NutritionInfo | null,
      isOwn: false,
      isFavorited: r.favoriteId !== null,
    })),
    total,
  };
}
