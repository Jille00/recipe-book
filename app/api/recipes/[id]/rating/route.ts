import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserRating,
  getRecipeRatingStats,
  upsertRating,
  deleteRating,
} from "@/lib/db/queries/ratings";
import { getRecipeById } from "@/lib/db/queries/recipes";
import { canAccessRecipe, invalidIdResponse, isUuid } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    // Ratings are only visible for recipes the caller may see - otherwise this
    // endpoint confirms the existence of private recipes.
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // The recipe's code is in its link, so presenting it proves the caller was
    // given the address - the same access the page itself grants.
    const presentedCode = new URL(request.url).searchParams.get("code");

    if (!canAccessRecipe(recipe, session?.user?.id, presentedCode)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get rating stats (public)
    const stats = await getRecipeRatingStats(recipeId);

    // Get user's rating if authenticated
    let userRating = null;
    if (session?.user) {
      userRating = await getUserRating(session.user.id, recipeId);
    }

    return NextResponse.json({
      stats,
      userRating,
    });
  } catch (error) {
    console.error("Error fetching rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if recipe exists and is public (users can only rate public recipes)
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Anyone who can open the recipe can take part in it: public recipes, the
    // owner, and anyone holding its link (proved by presenting the code).
    const presentedCode = new URL(request.url).searchParams.get("code");
    if (!canAccessRecipe(recipe, session.user.id, presentedCode)) {
      return NextResponse.json(
        { error: "You don't have access to this recipe" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { value } = body;

    if (typeof value !== "number" || value < 1 || value > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const result = await upsertRating(session.user.id, recipeId, value);
    const stats = await getRecipeRatingStats(recipeId);

    return NextResponse.json({
      success: true,
      rating: result,
      stats,
    });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteRating(session.user.id, recipeId);
    const stats = await getRecipeRatingStats(recipeId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error deleting rating:", error);
    return NextResponse.json(
      { error: "Failed to delete rating" },
      { status: 500 }
    );
  }
}
