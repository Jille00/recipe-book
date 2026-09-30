import { asc, eq, inArray } from "drizzle-orm";
import {
  db,
  user,
  profile,
  recipe,
  recipeTag,
  tag,
  favorite,
  rating,
  comment,
  collection,
  collectionRecipe,
  shoppingListItem,
} from "@/lib/db";
import type { ExportSource } from "@/lib/account-export";

/**
 * Everything the account export contains, for one user. Every query is
 * scoped to the user's own rows; other people's recipes only contribute their
 * id and title. Returns null when the user doesn't exist.
 */
export async function loadAccountExportSource(userId: string): Promise<ExportSource | null> {
  const [users, profiles, recipes, favorites, ratings, comments, collections, shoppingList] =
    await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),
      db
        .select({
          bio: profile.bio,
          website: profile.website,
          location: profile.location,
          handle: profile.handle,
          preferences: profile.preferences,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        })
        .from(profile)
        .where(eq(profile.userId, userId))
        .limit(1),
      db
        .select({
          id: recipe.id,
          title: recipe.title,
          slug: recipe.slug,
          code: recipe.code,
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
          copiedFromId: recipe.copiedFromId,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
        })
        .from(recipe)
        .where(eq(recipe.userId, userId))
        .orderBy(asc(recipe.createdAt)),
      db
        .select({ recipeId: favorite.recipeId, title: recipe.title, createdAt: favorite.createdAt })
        .from(favorite)
        .innerJoin(recipe, eq(recipe.id, favorite.recipeId))
        .where(eq(favorite.userId, userId))
        .orderBy(asc(favorite.createdAt)),
      db
        .select({
          recipeId: rating.recipeId,
          title: recipe.title,
          value: rating.value,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt,
        })
        .from(rating)
        .innerJoin(recipe, eq(recipe.id, rating.recipeId))
        .where(eq(rating.userId, userId))
        .orderBy(asc(rating.createdAt)),
      db
        .select({
          id: comment.id,
          recipeId: comment.recipeId,
          title: recipe.title,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        })
        .from(comment)
        .innerJoin(recipe, eq(recipe.id, comment.recipeId))
        .where(eq(comment.userId, userId))
        .orderBy(asc(comment.createdAt)),
      db
        .select({
          id: collection.id,
          name: collection.name,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        })
        .from(collection)
        .where(eq(collection.userId, userId))
        .orderBy(asc(collection.createdAt)),
      db
        .select({
          id: shoppingListItem.id,
          text: shoppingListItem.text,
          amount: shoppingListItem.amount,
          unit: shoppingListItem.unit,
          checked: shoppingListItem.checked,
          recipeId: shoppingListItem.recipeId,
          recipeTitle: recipe.title,
          createdAt: shoppingListItem.createdAt,
        })
        .from(shoppingListItem)
        .leftJoin(recipe, eq(recipe.id, shoppingListItem.recipeId))
        .where(eq(shoppingListItem.userId, userId))
        .orderBy(asc(shoppingListItem.createdAt)),
    ]);

  const account = users[0];
  if (!account) return null;

  const recipeIds = recipes.map((row) => row.id);
  const collectionIds = collections.map((row) => row.id);

  const [recipeTags, collectionRecipes] = await Promise.all([
    recipeIds.length > 0
      ? db
          .select({ recipeId: recipeTag.recipeId, name: tag.name })
          .from(recipeTag)
          .innerJoin(tag, eq(tag.id, recipeTag.tagId))
          .where(inArray(recipeTag.recipeId, recipeIds))
      : Promise.resolve([]),
    collectionIds.length > 0
      ? db
          .select({
            collectionId: collectionRecipe.collectionId,
            recipeId: collectionRecipe.recipeId,
            title: recipe.title,
            addedAt: collectionRecipe.addedAt,
          })
          .from(collectionRecipe)
          .innerJoin(recipe, eq(recipe.id, collectionRecipe.recipeId))
          .where(inArray(collectionRecipe.collectionId, collectionIds))
          .orderBy(asc(collectionRecipe.addedAt))
      : Promise.resolve([]),
  ]);

  return {
    user: account,
    profile: profiles[0] ?? null,
    recipes,
    recipeTags,
    favorites,
    ratings,
    comments,
    collections,
    collectionRecipes,
    shoppingList,
  };
}
