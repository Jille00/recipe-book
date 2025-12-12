import { Pool } from "pg";
import type { Category } from "@/types/recipe";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getAllCategories(): Promise<Category[]> {
  const result = await pool.query(
    `SELECT * FROM category ORDER BY name ASC`
  );
  return result.rows;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const result = await pool.query(
    `SELECT * FROM category WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function getRecipesByCategory(categorySlug: string, limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT
      r.*,
      c.name as category_name,
      c.slug as category_slug,
      u.name as author_name,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM recipe r
    JOIN category c ON r.category_id = c.id
    LEFT JOIN "user" u ON r.user_id = u.id
    LEFT JOIN recipe_tag rt ON r.id = rt.recipe_id
    LEFT JOIN tag t ON rt.tag_id = t.id
    WHERE c.slug = $1 AND r.is_public = true
    GROUP BY r.id, c.id, u.id
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3`,
    [categorySlug, limit, offset]
  );
  return result.rows;
}
