"use client";

import { useState, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RatingInputProps {
  recipeId: string;
  initialRating?: number | null;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onRatingChange?: (rating: number, stats: { averageRating: number; totalRatings: number }) => void;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function RatingInput({
  recipeId,
  initialRating = null,
  disabled = false,
  size = "md",
  onRatingChange,
}: RatingInputProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayRating = hoverRating ?? rating ?? 0;

  const handleClick = useCallback(
    async (value: number) => {
      if (disabled || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/recipes/${recipeId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save rating");
        }

        const data = await res.json();
        setRating(value);

        if (onRatingChange) {
          onRatingChange(value, data.stats);
        }

        toast.success("Rating saved!");
      } catch (error) {
        console.error("Error saving rating:", error);
        toast.error(error instanceof Error ? error.message : "Failed to save rating");
      } finally {
        setIsSubmitting(false);
      }
    },
    [recipeId, disabled, isSubmitting, onRatingChange]
  );

  const handleMouseEnter = (value: number) => {
    if (!disabled && !isSubmitting) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  return (
    <div
      className={cn(
        "flex gap-0.5",
        disabled && "opacity-50 cursor-not-allowed",
        isSubmitting && "opacity-70"
      )}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleMouseEnter(value)}
          className={cn(
            "transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm",
            !disabled && !isSubmitting && "hover:scale-110 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
          aria-label={`Rate ${value} star${value !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              value <= displayRating
                ? "text-amber fill-amber"
                : "text-sand hover:text-amber/50"
            )}
          />
        </button>
      ))}
    </div>
  );
}
