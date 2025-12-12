import { Pool } from "pg";
import type { RecipeWithDetails } from "@/types/recipe";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getUserFavorites(userId: string): Promise<RecipeWithDetails[]> {
  const result = await pool.query(
    `SELECT
      r.*,
      c.name as category_name,
      c.slug as category_slug,
      u.name as author_name,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags,
      true as is_favorited
    FROM favorite f
    JOIN recipe r ON f.recipe_id = r.id
    LEFT JOIN category c ON r.category_id = c.id
    LEFT JOIN "user" u ON r.user_id = u.id
    LEFT JOIN recipe_tag rt ON r.id = rt.recipe_id
    LEFT JOIN tag t ON rt.tag_id = t.id
    WHERE f.user_id = $1
    GROUP BY r.id, c.id, u.id, f.created_at
    ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function addFavorite(userId: string, recipeId: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO favorite (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, recipeId]
    );
    return true;
  } catch {
    return false;
  }
}

export async function removeFavorite(userId: string, recipeId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM favorite WHERE user_id = $1 AND recipe_id = $2 RETURNING id`,
    [userId, recipeId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function isFavorited(userId: string, recipeId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM favorite WHERE user_id = $1 AND recipe_id = $2`,
    [userId, recipeId]
  );
  return result.rows.length > 0;
}

export async function getFavoriteCount(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM favorite WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}
