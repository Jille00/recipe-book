"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CommentWithUser } from "@/lib/db/queries/comments";

interface CommentItemProps {
  comment: CommentWithUser;
  currentUserId?: string;
  recipeOwnerId?: string;
  onDelete?: (commentId: string) => void;
}

// Absolute dates are formatted in UTC so the server and the browser agree on
// the text during hydration, whatever time zone either is in.
const absoluteDateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const subscribeToNothing = () => () => {};

/**
 * "3 hours ago" depends on the moment it is rendered, so the server and the
 * browser would disagree and React would report a hydration mismatch. Render
 * the absolute date first and switch to relative text once in the browser.
 */
function CommentTime({ createdAt }: { createdAt: Date | string }) {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  const absolute = absoluteDateFormat.format(date);
  return (
    <time
      dateTime={date.toISOString()}
      title={absolute}
      className="text-xs text-muted-foreground ml-2"
    >
      {isClient ? formatDistanceToNow(date, { addSuffix: true }) : absolute}
    </time>
  );
}

/** Reads `error` from a JSON error body; HTML error pages fall back. */
async function readErrorMessage(res: Response, fallback: string) {
  if (res.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      if (typeof data?.error === "string" && data.error) return data.error;
    } catch {
      // Fall through to the generic message
    }
  }
  return fallback;
}

export function CommentItem({
  comment,
  currentUserId,
  recipeOwnerId,
  onDelete,
}: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Set once the comment is gone, so the dialog does not try to hand focus
  // back to a delete button that no longer exists (the list moves it).
  const deletedRef = useRef(false);

  const canDelete =
    currentUserId &&
    (currentUserId === comment.userId || currentUserId === recipeOwnerId);
  const isOwnComment = currentUserId === comment.userId;

  const handleDelete = async (event: React.MouseEvent) => {
    // Keep the dialog open (showing progress) until the request settles.
    event.preventDefault();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to delete comment"));
      }

      deletedRef.current = true;
      setConfirmOpen(false);
      toast.success("Comment deleted");
      onDelete?.(comment.id);
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete comment"
      );
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

  return (
    <article
      data-comment-id={comment.id}
      tabIndex={-1}
      aria-label={`Comment by ${comment.userName}`}
      className="flex gap-3 p-4 rounded-lg border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Avatar className="h-10 w-10 shrink-0">
        {/* Decorative: the name is spelled out right next to it. */}
        <AvatarImage src={comment.userImage || undefined} alt="" />
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
            {comment.createdAt && <CommentTime createdAt={comment.createdAt} />}
          </div>

          {canDelete && (
            <AlertDialog
              open={confirmOpen}
              onOpenChange={(open) => {
                // Don't let Escape or Cancel close it mid-request.
                if (!isDeleting) setConfirmOpen(open);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  // size="icon" is the 44px touch target; the negative margin
                  // keeps the row compact.
                  className="-my-2 -mr-2 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    Delete comment by {comment.userName}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                onCloseAutoFocus={(event) => {
                  if (deletedRef.current) event.preventDefault();
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">
                    Delete this comment?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isOwnComment
                      ? "Your comment will be removed for good."
                      : `${comment.userName}'s comment will be removed for good.`}{" "}
                    This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Keep Comment
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={buttonVariants({ variant: "destructive" })}
                  >
                    {isDeleting && (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete Comment"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <p className="mt-1 text-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </article>
  );
}
