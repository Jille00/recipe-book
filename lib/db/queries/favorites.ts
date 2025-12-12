import { eq, and, desc, sql } from "drizzle-orm";
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
      shareToken: recipe.shareToken,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
      favoritedAt: favorite.createdAt,
    })
    .from(favorite)
    .innerJoin(recipe, eq(favorite.recipeId, recipe.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(eq(favorite.userId, userId))
    .orderBy(desc(favorite.createdAt));

  return favorites.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    isFavorited: true,
  }));
}

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
  } catch {
    return false;
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
