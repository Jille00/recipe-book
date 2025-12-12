"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@/components/ui";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CommentWithUser } from "@/lib/db/queries/comments";

interface CommentItemProps {
  comment: CommentWithUser;
  currentUserId?: string;
  recipeOwnerId?: string;
  onDelete?: (commentId: string) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  recipeOwnerId,
  onDelete,
}: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete =
    currentUserId &&
    (currentUserId === comment.userId || currentUserId === recipeOwnerId);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete comment");
      }

      if (onDelete) {
        onDelete(comment.id);
      }

      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : "";

  return (
    <div className="flex gap-3 p-4 rounded-lg border border-border bg-card">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={comment.userImage || undefined} alt={comment.userName} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {getInitials(comment.userName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-medium text-foreground">
              {comment.userName}
            </span>
            <span className="text-xs text-muted-foreground ml-2">{timeAgo}</span>
          </div>

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="sr-only">Delete comment</span>
            </Button>
          )}
        </div>

        <p className="mt-1 text-muted-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
