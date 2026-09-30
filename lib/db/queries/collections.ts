import { and, desc, eq, or, sql } from "drizzle-orm";
import { recipeTagSlugs } from "./tag-slugs";
import { db, collection, collectionRecipe, favorite, recipe, user } from "@/lib/db";
import {
  MAX_COLLECTIONS_PER_USER,
  MAX_RECIPES_PER_COLLECTION,
} from "@/lib/collections";
import type { Difficulty, RecipeCardData } from "@/types/recipe";

/**
 * Collections are private: every query here is scoped to the owner, and a
 * collection someone else owns behaves exactly like one that doesn't exist.
 *
 * Only recipes the owner may still open are listed or counted: public ones and
 * their own (see isListableInCollection in lib/collections.ts for why unlisted
 * recipes of other people are left out).
 */
function listableFor(userId: string) {
  return or(eq(recipe.isPublic, true), eq(recipe.userId, userId));
}

export interface CollectionSummary {
  id: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  recipeCount: number;
  coverImageUrl: string | null;
  /** Only set when a recipe id was asked about. */
  containsRecipe?: boolean;
}

/**
 * The user's collections, newest first, with how many recipes each lists and
 * the photo of the most recently added one as its cover. Pass `recipeId` to
 * also learn which collections already hold that recipe.
 */
export async function getUserCollections(
  userId: string,
  recipeId?: string
): Promise<CollectionSummary[]> {
  // One grouped query rather than correlated subqueries: the recipe join only
  // matches recipes the owner may still open, so count(recipe.id) and the
  // cover skip the rest, while membership looks at the link row itself.
  const rows = await db
    .select({
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      recipeCount: sql<number>`count(${recipe.id})::int`,
      coverImageUrl: sql<string | null>`(array_agg(${recipe.imageUrl} order by ${collectionRecipe.addedAt} desc) filter (where ${recipe.imageUrl} is not null))[1]`,
      containsRecipe: recipeId
        ? sql<boolean>`coalesce(bool_or(${collectionRecipe.recipeId} = ${recipeId}), false)`
        : sql<boolean>`false`,
    })
    .from(collection)
    .leftJoin(collectionRecipe, eq(collectionRecipe.collectionId, collection.id))
    .leftJoin(recipe, and(eq(recipe.id, collectionRecipe.recipeId), listableFor(userId)))
    .where(eq(collection.userId, userId))
    .groupBy(collection.id)
    .orderBy(desc(collection.createdAt), desc(collection.id));

  return rows.map((row) => {
    const { containsRecipe, ...rest } = row;
    return recipeId ? { ...rest, containsRecipe } : rest;
  });
}

export async function getCollection(
  id: string,
  userId: string
): Promise<{ id: string; name: string; createdAt: Date | null; updatedAt: Date | null } | null> {
  const rows = await db
    .select({
      id: collection.id,
      name: collection.name,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    })
    .from(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export type CreateCollectionResult =
  | { ok: true; collection: typeof collection.$inferSelect }
  | { ok: false; reason: "limit" };

export async function createCollection(
  userId: string,
  name: string
): Promise<CreateCollectionResult> {
  return db.transaction(async (tx) => {
    // Serialise creates per user so two parallel requests can't both pass the
    // count check and overshoot the cap. Released when the transaction ends.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`collection:${userId}`}))`
    );

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(collection)
      .where(eq(collection.userId, userId));

    if (count >= MAX_COLLECTIONS_PER_USER) {
      return { ok: false, reason: "limit" } as const;
    }

    const [created] = await tx
      .insert(collection)
      .values({ userId, name })
      .returning();
    return { ok: true, collection: created } as const;
  });
}

export async function renameCollection(id: string, userId: string, name: string) {
  const rows = await db
    .update(collection)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(collection.id, id), eq(collection.userId, userId)))
    .returning({ id: collection.id, name: collection.name });
  return rows[0] ?? null;
}

export async function deleteCollection(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .delete(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, userId)))
    .returning({ id: collection.id });
  return rows.length > 0;
}

export type AddToCollectionResult = "added" | "already" | "not_found" | "full";

/**
 * Adds a recipe to one of the user's collections. Callers MUST have checked
 * that the user may open the recipe (canAccessRecipe) first.
 *
 * Throws a 23503 foreign key error if the recipe was deleted in the meantime.
 */
export async function addRecipeToCollection(
  collectionId: string,
  userId: string,
  recipeId: string
): Promise<AddToCollectionResult> {
  return db.transaction(async (tx) => {
    // Locking the collection row serialises adds to it, so the size cap holds
    // under parallel requests.
    const owned = await tx
      .select({ id: collection.id })
      .from(collection)
      .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)))
      .for("update");
    if (owned.length === 0) return "not_found";

    const existing = await tx
      .select({ recipeId: collectionRecipe.recipeId })
      .from(collectionRecipe)
      .where(
        and(
          eq(collectionRecipe.collectionId, collectionId),
          eq(collectionRecipe.recipeId, recipeId)
        )
      )
      .limit(1);
    if (existing.length > 0) return "already";

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionRecipe)
      .where(eq(collectionRecipe.collectionId, collectionId));
    if (count >= MAX_RECIPES_PER_COLLECTION) return "full";

    await tx
      .insert(collectionRecipe)
      .values({ collectionId, recipeId })
      .onConflictDoNothing();
    await tx
      .update(collection)
      .set({ updatedAt: new Date() })
      .where(eq(collection.id, collectionId));
    return "added";
  });
}

/** Returns false when the collection isn't the user's. */
export async function removeRecipeFromCollection(
  collectionId: string,
  userId: string,
  recipeId: string
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: collection.id })
      .from(collection)
      .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)))
      .limit(1);
    if (owned.length === 0) return false;

    const removed = await tx
      .delete(collectionRecipe)
      .where(
        and(
          eq(collectionRecipe.collectionId, collectionId),
          eq(collectionRecipe.recipeId, recipeId)
        )
      )
      .returning({ recipeId: collectionRecipe.recipeId });
    if (removed.length > 0) {
      await tx
        .update(collection)
        .set({ updatedAt: new Date() })
        .where(eq(collection.id, collectionId));
    }
    return true;
  });
}

/**
 * The recipes in one of the user's collections that they can still open,
 * most recently added first. Empty for a collection that isn't theirs.
 */
export async function getCollectionRecipes(
  collectionId: string,
  userId: string
): Promise<RecipeCardData[]> {
  const rows = await db
    .select({
      id: recipe.id,
      userId: recipe.userId,
      title: recipe.title,
      slug: recipe.slug,
      description: recipe.description,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl,
      tags: recipeTagSlugs,
      isPublic: recipe.isPublic,
      code: recipe.code,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      authorName: user.name,
      favoriteId: favorite.id,
    })
    .from(collectionRecipe)
    .innerJoin(
      collection,
      and(eq(collection.id, collectionRecipe.collectionId), eq(collection.userId, userId))
    )
    .innerJoin(recipe, eq(recipe.id, collectionRecipe.recipeId))
    .leftJoin(user, eq(recipe.userId, user.id))
    .leftJoin(favorite, and(eq(favorite.recipeId, recipe.id), eq(favorite.userId, userId)))
    .where(and(eq(collectionRecipe.collectionId, collectionId), listableFor(userId)))
    .orderBy(desc(collectionRecipe.addedAt), desc(recipe.id));

  return rows.map(({ favoriteId, ...r }) => ({
    ...r,
    difficulty: r.difficulty as Difficulty | null,
    isFavorited: favoriteId !== null,
  }));
}
