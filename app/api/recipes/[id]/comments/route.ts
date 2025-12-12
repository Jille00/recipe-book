import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getRecipeComments,
  createComment,
  getCommentCount,
} from "@/lib/db/queries/comments";
import { getRecipeById } from "@/lib/db/queries/recipes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getRecipeComments(recipeId, { limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
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

    // Check if recipe exists and is public
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Users can comment on public recipes or their own recipes
    if (!recipe.isPublic && recipe.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cannot comment on private recipes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const comment = await createComment(session.user.id, recipeId, content);
    const total = await getCommentCount(recipeId);

    return NextResponse.json({
      success: true,
      comment,
      total,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
