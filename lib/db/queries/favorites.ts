import { eq, and, desc, sql } from "drizzle-orm";
import { db, favorite, recipe, category, user } from "@/lib/db";
import type { Ingredient, Instruction } from "@/types/recipe";

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
      isPublic: recipe.isPublic,
      shareToken: recipe.shareToken,
      categoryId: recipe.categoryId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      categoryName: category.name,
      categorySlug: category.slug,
      authorName: user.name,
      favoritedAt: favorite.createdAt,
    })
    .from(favorite)
    .innerJoin(recipe, eq(favorite.recipeId, recipe.id))
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(eq(favorite.userId, userId))
    .orderBy(desc(favorite.createdAt));

  return favorites.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
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
