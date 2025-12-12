import { eq, and, desc, sql } from "drizzle-orm";
import { db, recipe, category, user, recipeTag, tag } from "@/lib/db";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { generateShareToken } from "@/lib/utils/share-token";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";

export interface RecipeWithDetails {
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
  isPublic: boolean | null;
  shareToken: string | null;
  categoryId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  authorName?: string | null;
  tags?: string[];
}

export async function getRecipesByUserId(userId: string): Promise<RecipeWithDetails[]> {
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
    })
    .from(recipe)
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .where(eq(recipe.userId, userId))
    .orderBy(desc(recipe.createdAt));

  return recipes.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
  }));
}

export async function getRecipeBySlug(
  userId: string,
  slug: string
): Promise<RecipeWithDetails | null> {
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
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(and(eq(recipe.userId, userId), eq(recipe.slug, slug)))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
  };
}

export async function getRecipeById(id: string): Promise<RecipeWithDetails | null> {
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
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(eq(recipe.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
  };
}

export async function getRecipeByShareToken(
  shareToken: string
): Promise<RecipeWithDetails | null> {
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
    .leftJoin(category, eq(recipe.categoryId, category.id))
    .leftJoin(user, eq(recipe.userId, user.id))
    .where(eq(recipe.shareToken, shareToken))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
  };
}

interface CreateRecipeInput {
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  difficulty?: Difficulty | null;
  image_url?: string | null;
  is_public?: boolean;
  category_id?: string | null;
  tag_ids?: string[];
}

export async function createRecipe(userId: string, data: CreateRecipeInput) {
  // Get existing slugs for this user
  const existingSlugs = await db
    .select({ slug: recipe.slug })
    .from(recipe)
    .where(eq(recipe.userId, userId));

  const slugs = existingSlugs.map((r) => r.slug);
  const slug = generateUniqueSlug(data.title, slugs);

  const [newRecipe] = await db
    .insert(recipe)
    .values({
      userId,
      title: data.title,
      slug,
      description: data.description || null,
      ingredients: data.ingredients,
      instructions: data.instructions,
      prepTimeMinutes: data.prep_time_minutes || null,
      cookTimeMinutes: data.cook_time_minutes || null,
      servings: data.servings || null,
      difficulty: data.difficulty || null,
      imageUrl: data.image_url || null,
      isPublic: data.is_public || false,
      categoryId: data.category_id || null,
    })
    .returning();

  // Add tags if provided
  if (data.tag_ids && data.tag_ids.length > 0) {
    await db.insert(recipeTag).values(
      data.tag_ids.map((tagId) => ({
        recipeId: newRecipe.id,
        tagId,
      }))
    );
  }

  return newRecipe;
}

export async function updateRecipe(
  id: string,
  userId: string,
  data: Partial<CreateRecipeInput>
) {
  // First verify ownership
  const existing = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    return null;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) {
    // Generate new slug if title changed
    const existingSlugs = await db
      .select({ slug: recipe.slug })
      .from(recipe)
      .where(and(eq(recipe.userId, userId), sql`${recipe.id} != ${id}`));

    const slugs = existingSlugs.map((r) => r.slug);
    updateData.title = data.title;
    updateData.slug = generateUniqueSlug(data.title, slugs);
  }

  if (data.description !== undefined) updateData.description = data.description;
  if (data.ingredients !== undefined) updateData.ingredients = data.ingredients;
  if (data.instructions !== undefined) updateData.instructions = data.instructions;
  if (data.prep_time_minutes !== undefined) updateData.prepTimeMinutes = data.prep_time_minutes;
  if (data.cook_time_minutes !== undefined) updateData.cookTimeMinutes = data.cook_time_minutes;
  if (data.servings !== undefined) updateData.servings = data.servings;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.image_url !== undefined) updateData.imageUrl = data.image_url;
  if (data.is_public !== undefined) updateData.isPublic = data.is_public;
  if (data.category_id !== undefined) updateData.categoryId = data.category_id;

  const [updated] = await db
    .update(recipe)
    .set(updateData)
    .where(eq(recipe.id, id))
    .returning();

  // Update tags if provided
  if (data.tag_ids !== undefined) {
    await db.delete(recipeTag).where(eq(recipeTag.recipeId, id));
    if (data.tag_ids.length > 0) {
      await db.insert(recipeTag).values(
        data.tag_ids.map((tagId) => ({
          recipeId: id,
          tagId,
        }))
      );
    }
  }

  return updated;
}

export async function deleteRecipe(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(recipe)
    .where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
    .returning({ id: recipe.id });

  return result.length > 0;
}

export async function generateRecipeShareToken(
  id: string,
  userId: string
): Promise<string | null> {
  const token = generateShareToken();

  const result = await db
    .update(recipe)
    .set({ shareToken: token })
    .where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
    .returning({ shareToken: recipe.shareToken });

  return result[0]?.shareToken || null;
}

export async function revokeRecipeShareToken(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(recipe)
    .set({ shareToken: null })
    .where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
    .returning({ id: recipe.id });

  return result.length > 0;
}

export async function getUserRecipeStats(userId: string) {
  const result = await db
    .select({
      totalRecipes: sql<number>`count(*)::int`,
      publicRecipes: sql<number>`count(*) filter (where ${recipe.isPublic} = true)::int`,
      categoriesUsed: sql<number>`count(distinct ${recipe.categoryId})::int`,
    })
    .from(recipe)
    .where(eq(recipe.userId, userId));

  return result[0];
}
