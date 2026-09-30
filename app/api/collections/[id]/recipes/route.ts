import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addRecipeToCollection } from "@/lib/db/queries/collections";
import { getRecipeById } from "@/lib/db/queries/recipes";
import { MAX_RECIPES_PER_COLLECTION } from "@/lib/collections";
import {
  canAccessRecipe,
  invalidBodyResponse,
  invalidIdResponse,
  isUuid,
  readJsonObject,
} from "@/lib/api-utils";

/**
 * Adds a recipe to one of the caller's collections. Body: `{ recipeId }`.
 * Like ratings, an unlisted recipe needs its code (`?code=`) to prove the
 * caller was given its link.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("collection");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (!body) return invalidBodyResponse();
    const { recipeId } = body;
    if (typeof recipeId !== "string" || !isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const presentedCode = new URL(request.url).searchParams.get("code");
    if (!canAccessRecipe(recipe, session.user.id, presentedCode)) {
      return NextResponse.json(
        { error: "You don't have access to this recipe" },
        { status: 403 }
      );
    }

    let result;
    try {
      result = await addRecipeToCollection(id, session.user.id, recipeId);
    } catch (error) {
      // 23503 = foreign_key_violation: the recipe was deleted in the meantime.
      if ((error as { code?: string } | null)?.code === "23503") {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }
      throw error;
    }

    if (result === "not_found") {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    if (result === "full") {
      return NextResponse.json(
        { error: `A collection can hold up to ${MAX_RECIPES_PER_COLLECTION} recipes` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true, added: result === "added" },
      { status: result === "added" ? 201 : 200 }
    );
  } catch (error) {
    console.error("Error adding recipe to collection:", error);
    return NextResponse.json(
      { error: "Failed to add recipe to collection" },
      { status: 500 }
    );
  }
}
