import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCommentById,
  updateComment,
  deleteComment,
} from "@/lib/db/queries/comments";
import { getRecipeById } from "@/lib/db/queries/recipes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const updated = await updateComment(commentId, session.user.id, content);

    if (!updated) {
      return NextResponse.json(
        { error: "Comment not found or you don't have permission to edit it" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: updated,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the comment to find the recipe
    const comment = await getCommentById(commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Get the recipe to check ownership
    const recipe = await getRecipeById(comment.recipeId);
    const recipeOwnerId = recipe?.userId;

    // User can delete if they own the comment OR own the recipe
    const deleted = await deleteComment(
      commentId,
      session.user.id,
      recipeOwnerId
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete comment or insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
