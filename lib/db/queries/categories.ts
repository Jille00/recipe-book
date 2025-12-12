import { eq, desc } from "drizzle-orm";
import { db, category, recipe, user } from "@/lib/db";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";

export async function getAllCategories() {
  return db
    .select({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      createdAt: category.createdAt,
    })
    .from(category)
    .orderBy(category.name);
}

export async function getCategoryBySlug(slug: string) {
  const results = await db
    .select({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      createdAt: category.createdAt,
    })
    .from(category)
    .where(eq(category.slug, slug))
    .limit(1);

  return results[0] || null;
}

export async function getRecipesByCategory(
  categorySlug: string,
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
      isPublic: recipe.isPublic,
      shareToken: recipe.shareToken,
      categoryId: recipe.categoryId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      categoryName: category.name,
      categorySlug: category.slug,
      authorName: user.name,
    })
    .from(recipe)
    .innerJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(eq(category.slug, categorySlug))
    .orderBy(desc(recipe.createdAt))
    .limit(limit)
    .offset(offset);

  return recipes.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
  }));
}
