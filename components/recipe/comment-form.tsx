"use client";

import { withRecipeCode } from "./recipe-api";
import { useId, useState } from "react";
import { Button, Label, Textarea } from "@/components/ui";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { CommentWithUser } from "@/lib/db/queries/comments";

/** Same limit the API enforces, measured the same way: on trimmed text. */
const MAX_COMMENT_LENGTH = 1000;

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

interface CommentFormProps {
  recipeId: string;
  code?: string;
  onCommentAdded?: (comment: CommentWithUser) => void;
}

export function CommentForm({ recipeId, code, onCommentAdded }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error("Please enter a comment");
      return;
    }

    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      toast.error(`Comment is too long (max ${MAX_COMMENT_LENGTH} characters)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(withRecipeCode(`/api/recipes/${recipeId}/comments`, code), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmedContent }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to post comment"));
      }

      const data = await res.json();
      setContent("");

      if (onCommentAdded) {
        onCommentAdded(data.comment);
      }

      toast.success("Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count what will actually be sent: leading/trailing whitespace is trimmed
  // before both the check above and the request.
  const trimmedLength = content.trim().length;
  const charactersRemaining = MAX_COMMENT_LENGTH - trimmedLength;
  const isOverLimit = charactersRemaining < 0;

  const fieldId = useId();
  const textareaId = `${fieldId}-comment`;
  const counterId = `${fieldId}-counter`;

  // Only speak once the count starts to matter, so typing is not narrated
  // character by character - but going over the limit is always announced.
  const counterAnnouncement = isOverLimit
    ? `Comment is ${Math.abs(charactersRemaining)} characters over the ${MAX_COMMENT_LENGTH} character limit`
    : charactersRemaining <= 100
    ? `${charactersRemaining} characters remaining`
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label htmlFor={textareaId} className="sr-only">
        Your comment
      </Label>
      <Textarea
        id={textareaId}
        placeholder="Share your thoughts about this recipe..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none"
        disabled={isSubmitting}
        aria-describedby={counterId}
        aria-invalid={isOverLimit || undefined}
      />
      <div className="flex items-center justify-between">
        <span
          id={counterId}
          className={`text-xs ${
            isOverLimit
              ? "text-destructive"
              : charactersRemaining < 100
              ? "text-amber"
              : "text-muted-foreground"
          }`}
        >
          {charactersRemaining} characters remaining
        </span>
        <span role="status" aria-live="polite" className="sr-only">
          {counterAnnouncement}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || trimmedLength === 0 || isOverLimit}
          isLoading={isSubmitting}
        >
          {!isSubmitting && <Send className="h-4 w-4" aria-hidden="true" />}
          Post Comment
        </Button>
      </div>
    </form>
  );
}
