"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
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
  /** The recipe's code, sent as proof of access for unlisted recipes. */
  code?: string;
}

export function CommentList({
  recipeId,
  recipeOwnerId,
  currentUserId,
  initialComments = [],
  initialTotal = 0,
  isAuthenticated = false,
  code,
}: CommentListProps) {
  // Come back to this recipe after signing in.
  const loginHref = `/login?callbackUrl=${encodeURIComponent(usePathname())}`;
  const [comments, setComments] = useState<CommentWithUser[]>(initialComments);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialComments.length < initialTotal);
  // How many comments the *server* has already handed us. Deriving this from
  // `comments.length` broke as soon as a comment was added (it skipped one) or
  // deleted (it refetched a rendered comment and duplicated its key).
  const [serverOffset, setServerOffset] = useState(initialComments.length);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // After a delete, where focus goes: the comment that took the removed one's
  // place (or the one before it), or the heading once none are left.
  const focusAfterDeleteRef = useRef<string | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        offset: String(serverOffset),
        limit: "10",
      });
      // Proves access when an unlisted recipe was opened from its link.
      if (code) query.set("code", code);

      const res = await fetch(`/api/recipes/${recipeId}/comments?${query}`);
      if (!res.ok) throw new Error("Failed to load comments");

      const data = await res.json();
      const incoming: CommentWithUser[] = data.comments ?? [];

      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...incoming.filter((c) => !seen.has(c.id))];
      });
      setServerOffset((prev) => prev + incoming.length);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Could not load more comments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [recipeId, serverOffset, isLoading, hasMore, code]);

  const handleCommentAdded = useCallback((comment: CommentWithUser) => {
    setComments((prev) => [comment, ...prev]);
    setTotal((prev) => prev + 1);
    // The new comment sits at the top server-side too, pushing every row we
    // already hold one position further down.
    setServerOffset((prev) => prev + 1);
  }, []);

  // Only rendered comments can be deleted, so the removed row is always one we
  // had already fetched: the pagination cursor moves back with it.
  const handleCommentDeleted = useCallback(
    (commentId: string) => {
      const index = comments.findIndex((c) => c.id === commentId);
      const remaining = comments.filter((c) => c.id !== commentId);
      focusAfterDeleteRef.current =
        (remaining[index] ?? remaining[index - 1])?.id ?? "heading";

      setComments(remaining);
      setServerOffset((prev) => Math.max(0, prev - 1));
      setTotal((prev) => Math.max(0, prev - 1));
    },
    [comments]
  );

  useEffect(() => {
    const target = focusAfterDeleteRef.current;
    if (!target) return;
    focusAfterDeleteRef.current = null;

    const next =
      target === "heading"
        ? null
        : listRef.current?.querySelector<HTMLElement>(
            `[data-comment-id="${CSS.escape(target)}"]`
          );
    (next ?? headingRef.current)?.focus();
  }, [comments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-lg font-semibold text-foreground outline-none"
        >
          Comments
        </h2>
        <span className="text-sm text-muted-foreground">({total})</span>
      </div>

      {/* Comment Form */}
      {isAuthenticated ? (
        <CommentForm
          recipeId={recipeId}
          code={code}
          onCommentAdded={handleCommentAdded}
        />
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Please{" "}
            <Link
              href={loginHref} className="text-primary hover:underline">
              sign in
            </Link>{" "}
            to leave a comment.
          </p>
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div ref={listRef} className="space-y-3">
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
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
          <MessageSquare
            className="mx-auto h-10 w-10 text-muted-foreground/30"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      )}
    </div>
  );
}
