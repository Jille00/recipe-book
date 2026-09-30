import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  canAccessRecipe,
  invalidBodyResponse,
  readJsonObject,
} from "@/lib/api-utils";
import { getRecipeById } from "@/lib/db/queries/recipes";
import {
  addShoppingListItems,
  clearShoppingList,
  countShoppingListItems,
  getShoppingList,
  setShoppingListItemsChecked,
} from "@/lib/db/queries/shopping-list";
import { recipePath } from "@/lib/recipe-url";
import {
  clearScopeSchema,
  firstIssue,
  MAX_LIST_ITEMS,
  parseAddBody,
  setCheckedSchema,
} from "@/lib/shopping-list/validation";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return unauthorized();

    const items = await getShoppingList(session.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
      { status: 500 }
    );
  }
}

/**
 * Add to the list: `{ recipeId, items: [...] }` for a recipe's ingredients
 * (the recipe's code goes in `?code=` for unlisted recipes, as with ratings),
 * or `{ text, amount?, unit? }` for one item typed by hand.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return unauthorized();
    const userId = session.user.id;

    const body = await readJsonObject(request);
    if (!body) return invalidBodyResponse();

    const parsed = parseAddBody(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const input = parsed.data;
    const items = input.kind === "recipe" ? input.items : [input.item];

    let source: { id: string; title: string; href: string | null } | null = null;
    if (input.kind === "recipe") {
      const found = await getRecipeById(input.recipeId);
      if (!found) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }
      // Anyone who can open the recipe can shop for it: public recipes, the
      // owner, and anyone holding its link (proved by presenting the code).
      const presentedCode = new URL(request.url).searchParams.get("code");
      if (!canAccessRecipe(found, userId, presentedCode)) {
        return NextResponse.json(
          { error: "You don't have access to this recipe" },
          { status: 403 }
        );
      }
      source = {
        id: found.id,
        title: found.title,
        // Same rule as the list itself: never echo an unlisted recipe's code.
        href: found.isPublic || found.userId === userId ? recipePath(found) : null,
      };
    }

    const existing = await countShoppingListItems(userId);
    if (existing + items.length > MAX_LIST_ITEMS) {
      return NextResponse.json(
        {
          error: `Your shopping list can hold ${MAX_LIST_ITEMS} items. Clear some items first.`,
        },
        { status: 409 }
      );
    }

    const created = await addShoppingListItems(userId, items, source);
    return NextResponse.json({ items: created }, { status: 201 });
  } catch (error) {
    console.error("Error adding to shopping list:", error);
    return NextResponse.json(
      { error: "Failed to add to shopping list" },
      { status: 500 }
    );
  }
}

/** Tick or untick several items at once: `{ ids: [...], checked }`. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return unauthorized();

    const body = await readJsonObject(request);
    if (!body) return invalidBodyResponse();

    const parsed = setCheckedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }

    const updated = await setShoppingListItemsChecked(
      session.user.id,
      parsed.data.ids,
      parsed.data.checked
    );
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Error updating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to update shopping list" },
      { status: 500 }
    );
  }
}

/** `?scope=checked` clears ticked items, `?scope=all` empties the list. */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return unauthorized();

    // Required, so a bare DELETE can never wipe the list by accident.
    const scope = clearScopeSchema.safeParse(
      new URL(request.url).searchParams.get("scope")
    );
    if (!scope.success) {
      return NextResponse.json(
        { error: "scope must be \"checked\" or \"all\"" },
        { status: 400 }
      );
    }

    const deleted = await clearShoppingList(session.user.id, scope.data);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error clearing shopping list:", error);
    return NextResponse.json(
      { error: "Failed to clear shopping list" },
      { status: 500 }
    );
  }
}
