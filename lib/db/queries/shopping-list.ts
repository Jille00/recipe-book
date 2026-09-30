import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db, recipe, shoppingListItem } from "@/lib/db";
import { recipePath } from "@/lib/recipe-url";
import type { ShoppingListItem } from "@/lib/shopping-list/merge";
import {
  MAX_LIST_ITEMS,
  type ValidShoppingListInput,
} from "@/lib/shopping-list/validation";

// Every query here is scoped to `userId`: a list is only ever its owner's.

const itemColumns = {
  id: shoppingListItem.id,
  recipeId: shoppingListItem.recipeId,
  text: shoppingListItem.text,
  amount: shoppingListItem.amount,
  unit: shoppingListItem.unit,
  checked: shoppingListItem.checked,
  createdAt: shoppingListItem.createdAt,
};

type ItemRow = {
  id: string;
  recipeId: string | null;
  text: string;
  amount: string | null;
  unit: string | null;
  checked: boolean;
  createdAt: Date | null;
};

function toItem(
  row: ItemRow,
  recipeInfo: { title: string | null; href: string | null } = { title: null, href: null }
): ShoppingListItem {
  return {
    id: row.id,
    recipeId: row.recipeId,
    recipeTitle: recipeInfo.title,
    recipeHref: recipeInfo.href,
    text: row.text,
    amount: row.amount,
    unit: row.unit,
    checked: row.checked,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

/** The caller's list, oldest first, with the title of each item's recipe. */
export async function getShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const rows = await db
    .select({
      ...itemColumns,
      recipeTitle: recipe.title,
      recipeSlug: recipe.slug,
      recipeCode: recipe.code,
      recipeIsPublic: recipe.isPublic,
      recipeUserId: recipe.userId,
    })
    .from(shoppingListItem)
    .leftJoin(recipe, eq(shoppingListItem.recipeId, recipe.id))
    .where(eq(shoppingListItem.userId, userId))
    .orderBy(asc(shoppingListItem.createdAt), asc(shoppingListItem.id))
    .limit(MAX_LIST_ITEMS);

  return rows.map((row) => {
    // Link back only to recipes the caller can still find: public ones and
    // their own. An unlisted recipe's link carries its share code, which is
    // never handed out again (see getUserFavorites).
    const linkable =
      row.recipeSlug !== null &&
      row.recipeCode !== null &&
      (row.recipeIsPublic === true || row.recipeUserId === userId);
    return toItem(row, {
      title: row.recipeTitle,
      href: linkable ? recipePath({ code: row.recipeCode!, slug: row.recipeSlug! }) : null,
    });
  });
}

export async function countShoppingListItems(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(shoppingListItem)
    .where(eq(shoppingListItem.userId, userId));
  return row?.value ?? 0;
}

/**
 * Adds items to the caller's list. Callers MUST have checked that the user may
 * open `recipe` (canAccessRecipe) and that the list has room.
 */
export async function addShoppingListItems(
  userId: string,
  items: ValidShoppingListInput[],
  source: { id: string; title: string; href: string | null } | null = null
): Promise<ShoppingListItem[]> {
  if (items.length === 0) return [];
  // One timestamp per batch would tie the order; stagger by a millisecond so
  // the list keeps the recipe's ingredient order.
  const base = Date.now();
  const rows = await db
    .insert(shoppingListItem)
    .values(
      items.map((item, index) => ({
        userId,
        recipeId: source?.id ?? null,
        text: item.text,
        amount: item.amount,
        unit: item.unit,
        createdAt: new Date(base + index),
      }))
    )
    .returning(itemColumns);

  return rows
    .map((row) => toItem(row, source ? { title: source.title, href: source.href } : undefined))
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
}

/** Tick or rename one item. Null when the caller has no such item. */
export async function updateShoppingListItem(
  userId: string,
  id: string,
  patch: { checked?: boolean; text?: string }
): Promise<{ id: string; text: string; checked: boolean } | null> {
  const [row] = await db
    .update(shoppingListItem)
    .set(patch)
    .where(and(eq(shoppingListItem.id, id), eq(shoppingListItem.userId, userId)))
    .returning({
      id: shoppingListItem.id,
      text: shoppingListItem.text,
      checked: shoppingListItem.checked,
    });
  return row ?? null;
}

/** Tick or untick several items; ids the caller doesn't own are ignored. */
export async function setShoppingListItemsChecked(
  userId: string,
  ids: string[],
  checked: boolean
): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .update(shoppingListItem)
    .set({ checked })
    .where(and(eq(shoppingListItem.userId, userId), inArray(shoppingListItem.id, ids)))
    .returning({ id: shoppingListItem.id });
  return rows.length;
}

/** False when the caller has no such item. */
export async function deleteShoppingListItem(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(shoppingListItem)
    .where(and(eq(shoppingListItem.id, id), eq(shoppingListItem.userId, userId)))
    .returning({ id: shoppingListItem.id });
  return rows.length > 0;
}

/** Remove the checked items, or every item. Returns how many were removed. */
export async function clearShoppingList(
  userId: string,
  scope: "checked" | "all"
): Promise<number> {
  const where =
    scope === "checked"
      ? and(eq(shoppingListItem.userId, userId), eq(shoppingListItem.checked, true))
      : eq(shoppingListItem.userId, userId);
  const rows = await db
    .delete(shoppingListItem)
    .where(where)
    .returning({ id: shoppingListItem.id });
  return rows.length;
}
