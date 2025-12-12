import { eq, and, sql, avg } from "drizzle-orm";
import { db, rating, user } from "@/lib/db";

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
}

export interface RatingWithUser {
  id: string;
  userId: string;
  recipeId: string;
  value: number;
  userName: string;
  userImage: string | null;
  createdAt: Date | null;
}

/**
 * Get a user's rating for a specific recipe
 */
export async function getUserRating(
  userId: string,
  recipeId: string
): Promise<number | null> {
  const result = await db
    .select({ value: rating.value })
    .from(rating)
    .where(and(eq(rating.userId, userId), eq(rating.recipeId, recipeId)))
    .limit(1);

  return result[0]?.value ?? null;
}

/**
 * Get rating statistics for a recipe
 */
export async function getRecipeRatingStats(
  recipeId: string
): Promise<RatingStats> {
  const result = await db
    .select({
      averageRating: sql<number>`coalesce(avg(${rating.value})::numeric(3,2), 0)`,
      totalRatings: sql<number>`count(*)::int`,
    })
    .from(rating)
    .where(eq(rating.recipeId, recipeId));

  return {
    averageRating: Number(result[0]?.averageRating) || 0,
    totalRatings: result[0]?.totalRatings || 0,
  };
}

/**
 * Get rating stats for multiple recipes (for recipe cards)
 */
export async function getRecipesRatingStats(
  recipeIds: string[]
): Promise<Map<string, RatingStats>> {
  if (recipeIds.length === 0) {
    return new Map();
  }

  const results = await db
    .select({
      recipeId: rating.recipeId,
      averageRating: sql<number>`coalesce(avg(${rating.value})::numeric(3,2), 0)`,
      totalRatings: sql<number>`count(*)::int`,
    })
    .from(rating)
    .where(sql`${rating.recipeId} IN ${recipeIds}`)
    .groupBy(rating.recipeId);

  const statsMap = new Map<string, RatingStats>();
  for (const row of results) {
    statsMap.set(row.recipeId, {
      averageRating: Number(row.averageRating) || 0,
      totalRatings: row.totalRatings || 0,
    });
  }

  return statsMap;
}

/**
 * Create or update a user's rating for a recipe (upsert)
 */
export async function upsertRating(
  userId: string,
  recipeId: string,
  value: number
): Promise<{ id: string; value: number }> {
  // Validate value is between 1-5
  const validValue = Math.max(1, Math.min(5, Math.round(value)));

  const result = await db
    .insert(rating)
    .values({
      userId,
      recipeId,
      value: validValue,
    })
    .onConflictDoUpdate({
      target: [rating.userId, rating.recipeId],
      set: {
        value: validValue,
        updatedAt: new Date(),
      },
    })
    .returning({ id: rating.id, value: rating.value });

  return result[0];
}

/**
 * Delete a user's rating for a recipe
 */
export async function deleteRating(
  userId: string,
  recipeId: string
): Promise<boolean> {
  const result = await db
    .delete(rating)
    .where(and(eq(rating.userId, userId), eq(rating.recipeId, recipeId)))
    .returning({ id: rating.id });

  return result.length > 0;
}
