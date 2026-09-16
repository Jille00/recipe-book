import { eq, and, or, desc, sql } from "drizzle-orm";
import { db, favorite, recipe, user } from "@/lib/db";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";

export async function getUserFavorites(userId: string) {
  const favorites = await db
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
      favoritedAt: favorite.createdAt,
    })
    .from(favorite)
    .innerJoin(recipe, eq(favorite.recipeId, recipe.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(
      and(
        eq(favorite.userId, userId),
        // Only surface recipes the user is still allowed to see: a recipe that
        // was public when favorited must not stay readable after it goes private.
        or(eq(recipe.isPublic, true), eq(recipe.userId, userId))
      )
    )
    .orderBy(desc(favorite.createdAt));

  return favorites.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    // Never hand another user's share token to a viewer.
    isFavorited: true,
  }));
}

/**
 * Adds a favorite. Callers MUST have verified that the user is allowed to see
 * the recipe first (public or their own).
 *
 * Returns false only when the recipe no longer exists (foreign key violation);
 * any other database error is rethrown instead of being swallowed as a
 * generic failure.
 */
export async function addFavorite(
  userId: string,
  recipeId: string
): Promise<boolean> {
  try {
    await db
      .insert(favorite)
      .values({ userId, recipeId })
      .onConflictDoNothing();
    return true;
  } catch (error) {
    // 23503 = foreign_key_violation -> recipe was deleted in the meantime
    if ((error as { code?: string } | null)?.code === "23503") {
      return false;
    }
    throw error;
  }
}

export async function removeFavorite(
  userId: string,
  recipeId: string
): Promise<boolean> {
  const result = await db
    .delete(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.recipeId, recipeId)))
    .returning({ id: favorite.id });

  return result.length > 0;
}

export async function isFavorited(
  userId: string,
  recipeId: string
): Promise<boolean> {
  const result = await db
    .select({ id: favorite.id })
    .from(favorite)
    .where(and(eq(favorite.userId, userId), eq(favorite.recipeId, recipeId)))
    .limit(1);

  return result.length > 0;
}

export async function getFavoriteCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(favorite)
    .where(eq(favorite.userId, userId));

  return result[0]?.count || 0;
}
