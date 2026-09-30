import { eq, and, sql } from "drizzle-orm";
import { db, tag, recipeTag, recipe } from "@/lib/db";
import { getPublicRecipes, type PublicRecipesResult } from "./search";

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

/**
 * Every tag with how many *public* recipes carry it (private and unlisted
 * recipes must not show up, not even as a count), and when the newest of
 * those last changed, for the sitemap.
 */
export async function getTagsWithRecipeCount() {
  const tags = await db
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      recipeCount: sql<number>`count(${recipe.id})::int`,
      lastModified: sql<Date | null>`max(${recipe.updatedAt})`.mapWith(
        recipe.updatedAt
      ),
    })
    .from(tag)
    .leftJoin(recipeTag, eq(tag.id, recipeTag.tagId))
    .leftJoin(
      recipe,
      and(eq(recipeTag.recipeId, recipe.id), eq(recipe.isPublic, true))
    )
    .groupBy(tag.id, tag.name, tag.slug)
    .orderBy(tag.name);

  return tags;
}

/** A tag's page of public recipes: /browse filtered to that one tag. */
export async function getPublicRecipesByTag(
  tagId: string,
  limit = 12,
  offset = 0,
  userId?: string
): Promise<PublicRecipesResult> {
  return getPublicRecipes({ tagIds: [tagId] }, limit, offset, userId);
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
