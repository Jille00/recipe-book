import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCommentById,
  updateComment,
  deleteComment,
  CommentValidationError,
  MAX_COMMENT_LENGTH,
} from "@/lib/db/queries/comments";
import { getRecipeById } from "@/lib/db/queries/recipes";
import { invalidIdResponse, isUuid } from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;

    if (!isUuid(commentId)) {
      return invalidIdResponse("comment");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (content.trim().length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or less` },
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
    if (error instanceof CommentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;

    if (!isUuid(commentId)) {
      return invalidIdResponse("comment");
    }

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
