"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { MessageSquare, Loader2 } from "lucide-react";
import type { CommentWithUser } from "@/lib/db/queries/comments";

interface CommentListProps {
  recipeId: string;
  recipeOwnerId: string;
  currentUserId?: string;
  initialComments?: CommentWithUser[];
  initialTotal?: number;
  isAuthenticated?: boolean;
}

export function CommentList({
  recipeId,
  recipeOwnerId,
  currentUserId,
  initialComments = [],
  initialTotal = 0,
  isAuthenticated = false,
}: CommentListProps) {
  const [comments, setComments] = useState<CommentWithUser[]>(initialComments);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialComments.length < initialTotal);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/recipes/${recipeId}/comments?offset=${comments.length}&limit=10`
      );
      if (!res.ok) throw new Error("Failed to load comments");

      const data = await res.json();
      setComments((prev) => [...prev, ...data.comments]);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [recipeId, comments.length, isLoading, hasMore]);

  const handleCommentAdded = useCallback((comment: CommentWithUser) => {
    setComments((prev) => [comment, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-semibold text-foreground">
          Comments
        </h3>
        <span className="text-sm text-muted-foreground">({total})</span>
      </div>

      {/* Comment Form */}
      {isAuthenticated ? (
        <CommentForm recipeId={recipeId} onCommentAdded={handleCommentAdded} />
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Please{" "}
            <a href="/login" className="text-primary hover:underline">
              sign in
            </a>{" "}
            to leave a comment.
          </p>
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              recipeOwnerId={recipeOwnerId}
              onDelete={handleCommentDeleted}
            />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More Comments (${total - comments.length} remaining)`
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      )}
    </div>
  );
}
