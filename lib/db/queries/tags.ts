import { eq, desc, sql } from "drizzle-orm";
import { db, tag, recipeTag, recipe, user } from "@/lib/db";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";

export async function getAllTags() {
  return db
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
    })
    .from(tag)
    .orderBy(tag.name);
}

export async function getTagBySlug(slug: string) {
  const results = await db
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
    })
    .from(tag)
    .where(eq(tag.slug, slug))
    .limit(1);

  return results[0] || null;
}

export async function getTagsWithRecipeCount() {
  const tags = await db
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      recipeCount: sql<number>`count(${recipeTag.recipeId})::int`,
    })
    .from(tag)
    .leftJoin(recipeTag, eq(tag.id, recipeTag.tagId))
    .groupBy(tag.id, tag.name, tag.slug)
    .orderBy(tag.name);

  return tags;
}

export async function getPublicRecipesByTag(
  tagSlug: string,
  limit = 50,
  offset = 0
) {
  const recipes = await db
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
    .innerJoin(recipeTag, eq(recipe.id, recipeTag.recipeId))
    .innerJoin(tag, eq(recipeTag.tagId, tag.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(eq(tag.slug, tagSlug))
    .orderBy(desc(recipe.createdAt))
    .limit(limit)
    .offset(offset);

  return recipes.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
  }));
}

export async function getTagsForRecipe(recipeId: string) {
  const tags = await db
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })
    .from(tag)
    .innerJoin(recipeTag, eq(tag.id, recipeTag.tagId))
    .where(eq(recipeTag.recipeId, recipeId))
    .orderBy(tag.name);

  return tags;
}

export async function getUserTagCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(distinct ${tag.id})::int` })
    .from(tag)
    .innerJoin(recipeTag, eq(tag.id, recipeTag.tagId))
    .innerJoin(recipe, eq(recipeTag.recipeId, recipe.id))
    .where(eq(recipe.userId, userId));

  return result[0]?.count || 0;
}
