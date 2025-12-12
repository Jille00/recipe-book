import { Pool } from "pg";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";
import { generateShareToken } from "@/lib/utils/share-token";
import type { Recipe, RecipeWithDetails, CreateRecipeInput, UpdateRecipeInput } from "@/types/recipe";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getRecipesByUserId(userId: string): Promise<RecipeWithDetails[]> {
  const result = await pool.query(
    `SELECT
      r.*,
      c.name as category_name,
      c.slug as category_slug,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM recipe r
    LEFT JOIN category c ON r.category_id = c.id
    LEFT JOIN recipe_tag rt ON r.id = rt.recipe_id
    LEFT JOIN tag t ON rt.tag_id = t.id
    WHERE r.user_id = $1
    GROUP BY r.id, c.id
    ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getRecipeBySlug(userId: string, slug: string): Promise<RecipeWithDetails | null> {
  const result = await pool.query(
    `SELECT
      r.*,
      c.name as category_name,
      c.slug as category_slug,
      u.name as author_name,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM recipe r
    LEFT JOIN category c ON r.category_id = c.id
    LEFT JOIN "user" u ON r.user_id = u.id
    LEFT JOIN recipe_tag rt ON r.id = rt.recipe_id
    LEFT JOIN tag t ON rt.tag_id = t.id
    WHERE r.user_id = $1 AND r.slug = $2
    GROUP BY r.id, c.id, u.id`,
    [userId, slug]
  );
  return result.rows[0] || null;
}

export async function getRecipeById(id: string): Promise<RecipeWithDetails | null> {
  const result = await pool.query(
    `SELECT
      r.*,
      c.name as category_name,
      c.slug as category_slug,
      u.name as author_name,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM recipe r
    LEFT JOIN category c ON r.category_id = c.id
    LEFT JOIN "user" u ON r.user_id = u.id
    LEFT JOIN recipe_tag rt ON r.id = rt.recipe_id
    LEFT JOIN tag t ON rt.tag_id = t.id
    WHERE r.id = $1
    GROUP BY r.id, c.id, u.id`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getRecipeByShareToken(shareToken: string): Promise<RecipeWithDetails | null> {
  const result = await pool.query(
    `SELECT
      r.*,
      c.name as category_name,
      c.slug as category_slug,
      u.name as author_name,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
    FROM recipe r
    LEFT JOIN category c ON r.category_id = c.id
    LEFT JOIN "user" u ON r.user_id = u.id
    LEFT JOIN recipe_tag rt ON r.id = rt.recipe_id
    LEFT JOIN tag t ON rt.tag_id = t.id
    WHERE r.share_token = $1
    GROUP BY r.id, c.id, u.id`,
    [shareToken]
  );
  return result.rows[0] || null;
}

export async function createRecipe(userId: string, data: CreateRecipeInput): Promise<Recipe> {
  // Get existing slugs for this user
  const existingSlugs = await pool.query(
    `SELECT slug FROM recipe WHERE user_id = $1`,
    [userId]
  );
  const slugs = existingSlugs.rows.map((r) => r.slug);
  const slug = generateUniqueSlug(data.title, slugs);

  const result = await pool.query(
    `INSERT INTO recipe (
      user_id, title, slug, description, ingredients, instructions,
      prep_time_minutes, cook_time_minutes, servings, difficulty,
      image_url, is_public, category_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      userId,
      data.title,
      slug,
      data.description || null,
      JSON.stringify(data.ingredients),
      JSON.stringify(data.instructions),
      data.prep_time_minutes || null,
      data.cook_time_minutes || null,
      data.servings || null,
      data.difficulty || null,
      data.image_url || null,
      data.is_public || false,
      data.category_id || null,
    ]
  );

  const recipe = result.rows[0];

  // Add tags if provided
  if (data.tag_ids && data.tag_ids.length > 0) {
    const tagValues = data.tag_ids.map((tagId, i) => `($1, $${i + 2})`).join(", ");
    await pool.query(
      `INSERT INTO recipe_tag (recipe_id, tag_id) VALUES ${tagValues}`,
      [recipe.id, ...data.tag_ids]
    );
  }

  return recipe;
}

export async function updateRecipe(
  id: string,
  userId: string,
  data: Partial<CreateRecipeInput>
): Promise<Recipe | null> {
  // First verify ownership
  const existing = await pool.query(
    `SELECT * FROM recipe WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (existing.rows.length === 0) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    // Generate new slug if title changed
    const existingSlugs = await pool.query(
      `SELECT slug FROM recipe WHERE user_id = $1 AND id != $2`,
      [userId, id]
    );
    const slugs = existingSlugs.rows.map((r) => r.slug);
    const slug = generateUniqueSlug(data.title, slugs);
    updates.push(`title = $${paramIndex}`, `slug = $${paramIndex + 1}`);
    values.push(data.title, slug);
    paramIndex += 2;
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    values.push(data.description);
    paramIndex++;
  }

  if (data.ingredients !== undefined) {
    updates.push(`ingredients = $${paramIndex}`);
    values.push(JSON.stringify(data.ingredients));
    paramIndex++;
  }

  if (data.instructions !== undefined) {
    updates.push(`instructions = $${paramIndex}`);
    values.push(JSON.stringify(data.instructions));
    paramIndex++;
  }

  if (data.prep_time_minutes !== undefined) {
    updates.push(`prep_time_minutes = $${paramIndex}`);
    values.push(data.prep_time_minutes);
    paramIndex++;
  }

  if (data.cook_time_minutes !== undefined) {
    updates.push(`cook_time_minutes = $${paramIndex}`);
    values.push(data.cook_time_minutes);
    paramIndex++;
  }

  if (data.servings !== undefined) {
    updates.push(`servings = $${paramIndex}`);
    values.push(data.servings);
    paramIndex++;
  }

  if (data.difficulty !== undefined) {
    updates.push(`difficulty = $${paramIndex}`);
    values.push(data.difficulty);
    paramIndex++;
  }

  if (data.image_url !== undefined) {
    updates.push(`image_url = $${paramIndex}`);
    values.push(data.image_url);
    paramIndex++;
  }

  if (data.is_public !== undefined) {
    updates.push(`is_public = $${paramIndex}`);
    values.push(data.is_public);
    paramIndex++;
  }

  if (data.category_id !== undefined) {
    updates.push(`category_id = $${paramIndex}`);
    values.push(data.category_id);
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);

  const result = await pool.query(
    `UPDATE recipe SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    [...values, id]
  );

  // Update tags if provided
  if (data.tag_ids !== undefined) {
    await pool.query(`DELETE FROM recipe_tag WHERE recipe_id = $1`, [id]);
    if (data.tag_ids.length > 0) {
      const tagValues = data.tag_ids.map((_, i) => `($1, $${i + 2})`).join(", ");
      await pool.query(
        `INSERT INTO recipe_tag (recipe_id, tag_id) VALUES ${tagValues}`,
        [id, ...data.tag_ids]
      );
    }
  }

  return result.rows[0];
}

export async function deleteRecipe(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM recipe WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function generateRecipeShareToken(id: string, userId: string): Promise<string | null> {
  const token = generateShareToken();
  const result = await pool.query(
    `UPDATE recipe SET share_token = $1 WHERE id = $2 AND user_id = $3 RETURNING share_token`,
    [token, id, userId]
  );
  return result.rows[0]?.share_token || null;
}

export async function revokeRecipeShareToken(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE recipe SET share_token = NULL WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function getUserRecipeStats(userId: string) {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total_recipes,
      COUNT(*) FILTER (WHERE is_public = true) as public_recipes,
      COUNT(DISTINCT category_id) as categories_used
    FROM recipe
    WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}
