import { eq, and, desc, sql } from "drizzle-orm";
import { db, comment, user } from "@/lib/db";

export interface CommentWithUser {
  id: string;
  userId: string;
  recipeId: string;
  content: string;
  userName: string;
  userImage: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PaginatedComments {
  comments: CommentWithUser[];
  total: number;
  hasMore: boolean;
}

/**
 * Get paginated comments for a recipe
 */
export async function getRecipeComments(
  recipeId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<PaginatedComments> {
  const { limit = 10, offset = 0 } = options;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comment)
    .where(eq(comment.recipeId, recipeId));

  const total = countResult[0]?.count || 0;

  // Get paginated comments with user info
  const comments = await db
    .select({
      id: comment.id,
      userId: comment.userId,
      recipeId: comment.recipeId,
      content: comment.content,
      userName: user.name,
      userImage: user.image,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    })
    .from(comment)
    .leftJoin(user, eq(comment.userId, user.id))
    .where(eq(comment.recipeId, recipeId))
    .orderBy(desc(comment.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    comments: comments.map((c) => ({
      ...c,
      userName: c.userName || "Unknown User",
    })),
    total,
    hasMore: offset + comments.length < total,
  };
}

/**
 * Get comment count for a recipe
 */
export async function getCommentCount(recipeId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comment)
    .where(eq(comment.recipeId, recipeId));

  return result[0]?.count || 0;
}

/**
 * Create a new comment
 */
export async function createComment(
  userId: string,
  recipeId: string,
  content: string
): Promise<CommentWithUser> {
  // Validate content length
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new Error("Comment content cannot be empty");
  }
  if (trimmedContent.length > 1000) {
    throw new Error("Comment content exceeds maximum length of 1000 characters");
  }

  const [newComment] = await db
    .insert(comment)
    .values({
      userId,
      recipeId,
      content: trimmedContent,
    })
    .returning();

  // Get user info
  const [userInfo] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    id: newComment.id,
    userId: newComment.userId,
    recipeId: newComment.recipeId,
    content: newComment.content,
    userName: userInfo?.name || "Unknown User",
    userImage: userInfo?.image || null,
    createdAt: newComment.createdAt,
    updatedAt: newComment.updatedAt,
  };
}

/**
 * Update a comment (only by comment owner)
 */
export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<CommentWithUser | null> {
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new Error("Comment content cannot be empty");
  }
  if (trimmedContent.length > 1000) {
    throw new Error("Comment content exceeds maximum length of 1000 characters");
  }

  const result = await db
    .update(comment)
    .set({
      content: trimmedContent,
      updatedAt: new Date(),
    })
    .where(and(eq(comment.id, commentId), eq(comment.userId, userId)))
    .returning();

  if (result.length === 0) {
    return null;
  }

  const updatedComment = result[0];

  // Get user info
  const [userInfo] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    id: updatedComment.id,
    userId: updatedComment.userId,
    recipeId: updatedComment.recipeId,
    content: updatedComment.content,
    userName: userInfo?.name || "Unknown User",
    userImage: userInfo?.image || null,
    createdAt: updatedComment.createdAt,
    updatedAt: updatedComment.updatedAt,
  };
}

/**
 * Delete a comment (by comment owner OR recipe owner)
 */
export async function deleteComment(
  commentId: string,
  userId: string,
  recipeOwnerId?: string
): Promise<boolean> {
  // Check if user is either the comment owner or the recipe owner
  const existingComment = await db
    .select({ id: comment.id, userId: comment.userId })
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1);

  if (existingComment.length === 0) {
    return false;
  }

  const commentOwnerId = existingComment[0].userId;
  const canDelete = userId === commentOwnerId || userId === recipeOwnerId;

  if (!canDelete) {
    return false;
  }

  const result = await db
    .delete(comment)
    .where(eq(comment.id, commentId))
    .returning({ id: comment.id });

  return result.length > 0;
}

/**
 * Get a single comment by ID
 */
export async function getCommentById(
  commentId: string
): Promise<CommentWithUser | null> {
  const result = await db
    .select({
      id: comment.id,
      userId: comment.userId,
      recipeId: comment.recipeId,
      content: comment.content,
      userName: user.name,
      userImage: user.image,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    })
    .from(comment)
    .leftJoin(user, eq(comment.userId, user.id))
    .where(eq(comment.id, commentId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0],
    userName: result[0].userName || "Unknown User",
  };
}
