import { eq, and, asc, desc, sql, or } from "drizzle-orm";
import { db, recipe, user, recipeTag, favorite } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";

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
  nutrition: NutritionInfo | null;
  isPublic: boolean | null;
  code: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  authorName?: string | null;
  isFavorited?: boolean;
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
      nutrition: recipe.nutrition,
      isPublic: recipe.isPublic,
      code: recipe.code,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      favoriteId: favorite.id,
    })
    .from(recipe)
    .leftJoin(favorite, and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, userId)))
    .where(eq(recipe.userId, userId))
    .orderBy(desc(recipe.createdAt));

  return recipes.map((r) => ({
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    isFavorited: r.favoriteId !== null,
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
      nutrition: recipe.nutrition,
      isPublic: recipe.isPublic,
      code: recipe.code,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
      favoriteId: favorite.id,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .leftJoin(favorite, and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, userId)))
    .where(and(eq(recipe.userId, userId), eq(recipe.slug, slug)))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    isFavorited: r.favoriteId !== null,
  };
}

export async function getRecipeById(id: string, userId?: string): Promise<RecipeWithDetails | null> {
  const results = await db
    .select({
      id: recipe.id,
      recipeUserId: recipe.userId,
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
      favoriteId: favorite.id,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .leftJoin(favorite, userId ? and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, userId)) : sql`false`)
    .where(eq(recipe.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    userId: r.recipeUserId,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    isFavorited: r.favoriteId !== null,
  };
}

/**
 * The recipe behind a /r/{code}/{slug} address.
 *
 * Deliberately NOT filtered by visibility: holding the code is the permission.
 * A recipe that is not listed publicly is still viewable by anyone with its
 * link, so the code must stay unguessable (see generate_recipe_code).
 */
export async function getRecipeByCode(
  code: string,
  viewerId?: string
): Promise<RecipeWithDetails | null> {
  const results = await db
    .select({
      id: recipe.id,
      recipeUserId: recipe.userId,
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
      favoriteId: favorite.id,
    })
    .from(recipe)
    .leftJoin(user, eq(recipe.userId, user.id))
    .leftJoin(
      favorite,
      viewerId
        ? and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, viewerId))
        : sql`false`
    )
    .where(eq(recipe.code, code))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    userId: r.recipeUserId,
    ingredients: r.ingredients as Ingredient[],
    instructions: r.instructions as Instruction[],
    difficulty: r.difficulty as Difficulty | null,
    nutrition: r.nutrition as NutritionInfo | null,
    isFavorited: r.favoriteId !== null,
  };
}

/**
 * Resolves whatever was put after /r/ to a recipe's current address.
 *
 * Accepts, in order of precedence:
 *  - a code, which is what every link is built from now;
 *  - a legacy share token, from before codes existed;
 *  - a legacy public slug, which is what /r/{slug} links and the old sitemap
 *    used. Only public recipes resolve this way, so an unlisted recipe can
 *    never be reached by guessing its title. Slugs are only unique per author,
 *    so the oldest match wins - the one that existed when the link was made.
 */
export async function resolveRecipeAddress(
  key: string
): Promise<{ code: string; slug: string } | null> {
  const rows = await db
    .select({ code: recipe.code, slug: recipe.slug })
    .from(recipe)
    .where(
      or(
        eq(recipe.code, key),
        eq(recipe.shareToken, key),
        and(eq(recipe.slug, key), eq(recipe.isPublic, true))
      )
    )
    .orderBy(
      sql`case when ${recipe.code} = ${key} then 0 when ${recipe.shareToken} = ${key} then 1 else 2 end`,
      asc(recipe.createdAt)
    )
    .limit(1);

  return rows[0] ?? null;
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
  nutrition?: NutritionInfo | null;
  is_public?: boolean;
  tag_ids?: string[];
}

export async function createRecipe(userId: string, data: CreateRecipeInput) {
  // Recipe + tags are written in one transaction: an invalid tag id must not
  // leave an orphaned recipe behind.
  return await db.transaction(async (tx) => {
    // Get existing slugs for this user
    const existingSlugs = await tx
      .select({ slug: recipe.slug })
      .from(recipe)
      .where(eq(recipe.userId, userId));

    const slugs = existingSlugs.map((r) => r.slug);
    const slug = generateUniqueSlug(data.title, slugs);

    const [newRecipe] = await tx
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
        nutrition: data.nutrition || null,
        isPublic: data.is_public || false,
      })
      .returning();

    // Add tags if provided
    if (data.tag_ids && data.tag_ids.length > 0) {
      await tx.insert(recipeTag).values(
        data.tag_ids.map((tagId) => ({
          recipeId: newRecipe.id,
          tagId,
        }))
      );
    }

    return newRecipe;
  });
}

export async function updateRecipe(
  id: string,
  userId: string,
  data: Partial<CreateRecipeInput>
) {
  // Everything (recipe row + tag rows) happens in one transaction so a failure
  // halfway through cannot drop the existing tags.
  return await db.transaction(async (tx) => {
    // First verify ownership
    const existing = await tx
      .select({ id: recipe.id })
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
      const existingSlugs = await tx
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
    if (data.nutrition !== undefined) updateData.nutrition = data.nutrition;
    if (data.is_public !== undefined) updateData.isPublic = data.is_public;

    // The ownership predicate is repeated here: checking first and then
    // updating on the id alone leaves a check-then-act gap.
    const [updated] = await tx
      .update(recipe)
      .set(updateData)
      .where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
      .returning();

    if (!updated) {
      return null;
    }

    // Update tags if provided
    if (data.tag_ids !== undefined) {
      await tx.delete(recipeTag).where(eq(recipeTag.recipeId, id));
      if (data.tag_ids.length > 0) {
        await tx.insert(recipeTag).values(
          data.tag_ids.map((tagId) => ({
            recipeId: id,
            tagId,
          }))
        );
      }
    }

    return updated;
  });
}

export async function deleteRecipe(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(recipe)
    .where(and(eq(recipe.id, id), eq(recipe.userId, userId)))
    .returning({ id: recipe.id });

  return result.length > 0;
}

export async function getUserRecipeStats(userId: string) {
  const result = await db
    .select({
      totalRecipes: sql<number>`count(*)::int`,
      publicRecipes: sql<number>`count(*) filter (where ${recipe.isPublic} = true)::int`,
    })
    .from(recipe)
    .where(eq(recipe.userId, userId));

  return result[0];
}

export async function getPublicRecipesForSitemap(): Promise<
  { code: string; slug: string; updatedAt: Date | null }[]
> {
  const recipes = await db
    .select({
      code: recipe.code,
      slug: recipe.slug,
      updatedAt: recipe.updatedAt,
    })
    .from(recipe)
    .where(eq(recipe.isPublic, true))
    .orderBy(desc(recipe.updatedAt));

  return recipes;
}
