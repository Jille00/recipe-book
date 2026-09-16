import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addFavorite, removeFavorite, isFavorited } from "@/lib/db/queries/favorites";
import { getRecipeById } from "@/lib/db/queries/recipes";
import { invalidIdResponse, isUuid } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorited = await isFavorited(session.user.id, recipeId);
    return NextResponse.json({ isFavorited: favorited });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      { error: "Failed to check favorite status" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only recipes the user is allowed to see may be favorited - otherwise a
    // favorite grants permanent read access to a private recipe.
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (!recipe.isPublic && recipe.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cannot favorite private recipes" },
        { status: 403 }
      );
    }

    const success = await addFavorite(session.user.id, recipeId);

    if (!success) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, isFavorited: true });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await removeFavorite(session.user.id, recipeId);
    return NextResponse.json({ success: true, isFavorited: false });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
