import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, recipe, recipeTag } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { buildRecipeCopy } from "@/lib/recipe-copy";

/**
 * Creates `userId`'s private copy of a recipe, tags included. Callers MUST
 * have checked that the user may open the source (canAccessRecipe) and that it
 * isn't their own. Returns null if the source no longer exists.
 */
export async function copyRecipe(
  sourceId: string,
  userId: string
): Promise<{ id: string; slug: string; code: string } | null> {
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select({
        id: recipe.id,
        userId: recipe.userId,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        imageUrl: recipe.imageUrl,
        nutrition: recipe.nutrition,
      })
      .from(recipe)
      .where(eq(recipe.id, sourceId))
      .limit(1)
      // The copy reuses the original's photo URL. Holding a share lock until
      // the copy is committed makes a concurrent delete (or photo change) of
      // the original wait, so its "is this photo still used?" check sees the
      // copy and keeps the file. A delete that got in first leaves no source.
      .for("share");
    if (!source) return null;

    const existingSlugs = await tx
      .select({ slug: recipe.slug })
      .from(recipe)
      .where(eq(recipe.userId, userId));
    const slug = generateUniqueSlug(
      source.title,
      existingSlugs.map((r) => r.slug)
    );

    const [created] = await tx
      .insert(recipe)
      .values(buildRecipeCopy(source, userId, slug))
      .returning({ id: recipe.id, slug: recipe.slug, code: recipe.code });

    const tags = await tx
      .select({ tagId: recipeTag.tagId })
      .from(recipeTag)
      .where(eq(recipeTag.recipeId, sourceId));
    if (tags.length > 0) {
      await tx
        .insert(recipeTag)
        .values(tags.map(({ tagId }) => ({ recipeId: created.id, tagId })));
    }

    return created;
  });
}

const original = alias(recipe, "original");

/**
 * The recipe this one was copied from, if it still exists. Includes the
 * original's code, so only link to it when canLinkToOriginal allows.
 */
export async function getCopiedFrom(recipeId: string): Promise<{
  id: string;
  title: string;
  slug: string;
  code: string;
  isPublic: boolean | null;
  userId: string;
} | null> {
  const rows = await db
    .select({
      id: original.id,
      title: original.title,
      slug: original.slug,
      code: original.code,
      isPublic: original.isPublic,
      userId: original.userId,
    })
    .from(recipe)
    .innerJoin(original, eq(original.id, recipe.copiedFromId))
    .where(eq(recipe.id, recipeId))
    .limit(1);
  return rows[0] ?? null;
}
