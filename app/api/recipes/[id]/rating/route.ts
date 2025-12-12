import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserRating,
  getRecipeRatingStats,
  upsertRating,
  deleteRating,
} from "@/lib/db/queries/ratings";
import { getRecipeById } from "@/lib/db/queries/recipes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

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
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if recipe exists and is public (users can only rate public recipes)
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Users can rate public recipes or their own recipes
    if (!recipe.isPublic && recipe.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cannot rate private recipes" },
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
