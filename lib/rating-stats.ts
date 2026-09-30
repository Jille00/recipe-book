import type { RatingStats } from "@/types/recipe";

/**
 * Card rating stats from a list query's left-joined aggregate row. Postgres
 * returns `numeric` averages as strings, and an unrated recipe joins to nulls;
 * it gets no stats at all rather than a misleading 0.0.
 */
export function toRatingStats(
  average: string | number | null | undefined,
  count: number | null | undefined
): RatingStats | undefined {
  const totalRatings = Number(count) || 0;
  const averageRating = Number(average);
  if (totalRatings <= 0 || !Number.isFinite(averageRating)) return undefined;
  return { averageRating, totalRatings };
}
