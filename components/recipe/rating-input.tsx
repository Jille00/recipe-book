"use client";

import { withRecipeCode } from "./recipe-api";
import { useCallback, useRef, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RatingInputProps {
  recipeId: string;
  code?: string;
  initialRating?: number | null;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  onRatingChange?: (
    rating: number,
    stats: { averageRating: number; totalRatings: number }
  ) => void;
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const VALUES = [1, 2, 3, 4, 5];

export function RatingInput({
  recipeId,
  code,
  initialRating = null,
  disabled = false,
  size = "md",
  label = "Your rating",
  onRatingChange,
}: RatingInputProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  // Preview shown while hovering *or* while a star has keyboard focus.
  const [previewRating, setPreviewRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Roving tabindex: the group is a single tab stop.
  const [focusedIndex, setFocusedIndex] = useState(() =>
    initialRating ? initialRating - 1 : 0
  );
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const displayRating = previewRating ?? rating ?? 0;
  const isInteractive = !disabled && !isSubmitting;

  const handleClick = useCallback(
    async (value: number) => {
      if (disabled || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const res = await fetch(withRecipeCode(`/api/recipes/${recipeId}/rating`, code), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Failed to save rating");
        }

        const data = await res.json();
        setRating(value);
        setFocusedIndex(value - 1);

        if (onRatingChange) {
          onRatingChange(value, data.stats);
        }

        toast.success("Rating saved!");
      } catch (error) {
        console.error("Error saving rating:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to save rating"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [recipeId, code, disabled, isSubmitting, onRatingChange]
  );

  const moveFocus = (nextIndex: number) => {
    setFocusedIndex(nextIndex);
    starRefs.current[nextIndex]?.focus();
  };

  // Arrows move focus (and the preview) without committing: selecting here
  // would POST a rating on every keypress.
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!isInteractive) return;

    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      nextIndex = (index + 1) % VALUES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      nextIndex = (index - 1 + VALUES.length) % VALUES.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = VALUES.length - 1;
    }

    if (nextIndex === null) return;
    e.preventDefault();
    moveFocus(nextIndex);
  };

  const clearPreview = () => setPreviewRating(null);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      aria-busy={isSubmitting || undefined}
      className={cn(
        "flex gap-0.5",
        disabled && "opacity-50 cursor-not-allowed",
        isSubmitting && "opacity-70"
      )}
      onMouseLeave={clearPreview}
      onBlur={(e) => {
        // Only clear once focus leaves the whole group.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          clearPreview();
        }
      }}
    >
      {VALUES.map((value, index) => {
        const isChecked = rating === value;
        return (
          <button
            key={value}
            ref={(node) => {
              starRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isChecked}
            aria-label={`${value} star${value !== 1 ? "s" : ""}`}
            tabIndex={index === focusedIndex ? 0 : -1}
            disabled={disabled || isSubmitting}
            onClick={() => handleClick(value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onMouseEnter={() => isInteractive && setPreviewRating(value)}
            onFocus={() => {
              setFocusedIndex(index);
              if (isInteractive) setPreviewRating(value);
            }}
            className={cn(
              "transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm",
              isInteractive && "hover:scale-110 cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            <Star
              aria-hidden="true"
              className={cn(
                sizeClasses[size],
                "transition-colors",
                value <= displayRating
                  ? "text-amber fill-amber"
                  : "text-sand hover:text-amber/50"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
