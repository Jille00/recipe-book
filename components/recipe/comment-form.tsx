"use client";

import { withRecipeCode } from "./recipe-api";
import { useId, useState } from "react";
import { Button, Label, Textarea } from "@/components/ui";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { CommentWithUser } from "@/lib/db/queries/comments";

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

    if (trimmedContent.length > 1000) {
      toast.error("Comment is too long (max 1000 characters)");
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
        const data = await res.json();
        throw new Error(data.error || "Failed to post comment");
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

  const charactersRemaining = 1000 - content.length;
  const isOverLimit = charactersRemaining < 0;

  const fieldId = useId();
  const textareaId = `${fieldId}-comment`;
  const counterId = `${fieldId}-counter`;

  // Only speak once the count starts to matter, so typing is not narrated
  // character by character - but going over the limit is always announced.
  const counterAnnouncement = isOverLimit
    ? `Comment is ${Math.abs(charactersRemaining)} characters over the 1000 character limit`
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
          disabled={isSubmitting || !content.trim() || isOverLimit}
          isLoading={isSubmitting}
        >
          {!isSubmitting && <Send className="h-4 w-4" />}
          Post Comment
        </Button>
      </div>
    </form>
  );
}
