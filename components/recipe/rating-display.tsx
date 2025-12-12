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
  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  if (totalRatings === 0) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(sizeClasses[size], "text-sand")}
              fill="none"
            />
          ))}
        </div>
        {showCount && (
          <span className={cn("text-muted-foreground", textSizeClasses[size])}>
            No ratings
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(sizeClasses[size], "text-amber fill-amber")}
          />
        ))}
        {/* Half star - we'll render as full for simplicity */}
        {hasHalfStar && (
          <Star
            className={cn(sizeClasses[size], "text-amber fill-amber/50")}
          />
        )}
        {/* Empty stars */}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(sizeClasses[size], "text-sand")}
            fill="none"
          />
        ))}
      </div>
      <span className={cn("font-medium text-foreground", textSizeClasses[size])}>
        {averageRating.toFixed(1)}
      </span>
      {showCount && (
        <span className={cn("text-muted-foreground", textSizeClasses[size])}>
          ({totalRatings})
        </span>
      )}
    </div>
  );
}
