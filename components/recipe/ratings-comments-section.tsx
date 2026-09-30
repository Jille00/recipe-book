"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui";
import { RatingDisplay } from "./rating-display";
import { RatingInput } from "./rating-input";
import { CommentList } from "./comment-list";
import type { CommentWithUser } from "@/lib/db/queries/comments";
import type { RatingStats } from "@/lib/db/queries/ratings";

interface RatingsCommentsSectionProps {
  recipeId: string;
  recipeOwnerId: string;
  initialRatingStats: RatingStats;
  initialUserRating?: number | null;
  initialComments?: CommentWithUser[];
  initialCommentTotal?: number;
  currentUserId?: string;
  isAuthenticated?: boolean;
  /** The recipe's code, sent as proof of access for unlisted recipes. */
  code?: string;
}

export function RatingsCommentsSection({
  recipeId,
  recipeOwnerId,
  initialRatingStats,
  initialUserRating = null,
  initialComments = [],
  initialCommentTotal = 0,
  currentUserId,
  isAuthenticated = false,
  code,
}: RatingsCommentsSectionProps) {
  // Come back to this recipe after signing in.
  const loginHref = `/login?callbackUrl=${encodeURIComponent(usePathname())}`;
  const [ratingStats, setRatingStats] = useState<RatingStats>(initialRatingStats);

  const handleRatingChange = useCallback(
    (_rating: number, stats: RatingStats) => {
      setRatingStats(stats);
    },
    []
  );

  const hasRatings = ratingStats.totalRatings > 0;

  return (
    <div className="space-y-8">
      {/* Rating */}
      <Card className="gap-5">
        <CardHeader>
          <h2 className="text-[1.75rem] leading-[1.2] text-foreground">Rating</h2>
          <CardDescription>
            {hasRatings ? (
              <>
                <span className="font-mono tabular">
                  {ratingStats.averageRating.toFixed(1)}
                </span>{" "}
                average from{" "}
                <span className="font-mono tabular">{ratingStats.totalRatings}</span>{" "}
                rating{ratingStats.totalRatings !== 1 ? "s" : ""}
              </>
            ) : (
              "No ratings yet. Be the first to rate this recipe."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            {/* Average */}
            <RatingDisplay
              averageRating={ratingStats.averageRating}
              totalRatings={ratingStats.totalRatings}
              size="lg"
              showCount={false}
            />

            {/* The viewer's own rating */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:border-l sm:border-border sm:pl-6">
                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Your rating
                </span>
                <RatingInput
                  code={code}
                  recipeId={recipeId}
                  initialRating={initialUserRating}
                  onRatingChange={handleRatingChange}
                  size="md"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link
                  href={loginHref}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>{" "}
                to rate this recipe.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card className="py-0">
        <CardContent className="p-6">
          <CommentList
            code={code}
            recipeId={recipeId}
            recipeOwnerId={recipeOwnerId}
            currentUserId={currentUserId}
            initialComments={initialComments}
            initialTotal={initialCommentTotal}
            isAuthenticated={isAuthenticated}
          />
        </CardContent>
      </Card>
    </div>
  );
}
