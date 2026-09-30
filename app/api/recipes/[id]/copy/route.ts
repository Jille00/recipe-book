import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecipeById } from "@/lib/db/queries/recipes";
import { copyRecipe } from "@/lib/db/queries/recipe-copies";
import { recipeEditPath } from "@/lib/recipe-url";
import { canAccessRecipe, invalidIdResponse, isUuid } from "@/lib/api-utils";

/**
 * "Save a copy": creates a private recipe for the caller with the same
 * content, tags and photo as someone else's recipe they can open. An unlisted
 * recipe needs its code (`?code=`), like ratings and comments.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("recipe");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipe = await getRecipeById(id);
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

    if (recipe.userId === session.user.id) {
      return NextResponse.json(
        { error: "This is already your recipe" },
        { status: 400 }
      );
    }

    const created = await copyRecipe(id, session.user.id);
    if (!created) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(
      { ...created, editPath: recipeEditPath(created) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error copying recipe:", error);
    return NextResponse.json({ error: "Failed to copy recipe" }, { status: 500 });
  }
}
