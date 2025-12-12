"use client";

import { useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { Send } from "lucide-react";
import { toast } from "sonner";
import type { CommentWithUser } from "@/lib/db/queries/comments";

interface CommentFormProps {
  recipeId: string;
  onCommentAdded?: (comment: CommentWithUser) => void;
}

export function CommentForm({ recipeId, onCommentAdded }: CommentFormProps) {
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
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Share your thoughts about this recipe..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <span
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
