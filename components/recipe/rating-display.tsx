"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function RatingDisplay({
  averageRating,
  totalRatings,
  size = "md",
  showCount = true,
  className,
}: RatingDisplayProps) {
  // Bad data (or a future rating scale) must not be able to crash the card:
  // an out-of-range average used to make `emptyStars` negative, and
  // `[...Array(-1)]` throws a RangeError.
  const safeAverage = Number.isFinite(averageRating)
    ? Math.min(5, Math.max(0, averageRating))
    : 0;
  const fullStars = Math.floor(safeAverage);
  const hasHalfStar = safeAverage - fullStars >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

  if (totalRatings === 0) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="flex" role="img" aria-label="Not yet rated">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              aria-hidden="true"
              className={cn(sizeClasses[size], "text-sand")}
              fill="none"
            />
          ))}
        </div>
        {showCount && (
          <span
            aria-hidden="true"
            className={cn("text-muted-foreground", textSizeClasses[size])}
          >
            No ratings
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className="flex"
        // With showCount={false} the numeric rating is the only visible cue
        // and the star row carries no text at all, so name it explicitly.
        role="img"
        aria-label={`Rated ${safeAverage.toFixed(1)} out of 5 from ${totalRatings} rating${
          totalRatings !== 1 ? "s" : ""
        }`}
      >
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            aria-hidden="true"
            className={cn(sizeClasses[size], "text-amber fill-amber")}
          />
        ))}
        {/* Half star - we'll render as full for simplicity */}
        {hasHalfStar && (
          <Star
            aria-hidden="true"
            className={cn(sizeClasses[size], "text-amber fill-amber/50")}
          />
        )}
        {/* Empty stars */}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            aria-hidden="true"
            className={cn(sizeClasses[size], "text-sand")}
            fill="none"
          />
        ))}
      </div>
      <span
        aria-hidden="true"
        className={cn("font-medium text-foreground", textSizeClasses[size])}
      >
        {safeAverage.toFixed(1)}
      </span>
      {showCount && (
        <span
          aria-hidden="true"
          className={cn("text-muted-foreground", textSizeClasses[size])}
        >
          ({totalRatings})
        </span>
      )}
    </div>
  );
}
