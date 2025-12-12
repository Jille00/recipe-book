"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { RatingDisplay } from "./rating-display";
import { RatingInput } from "./rating-input";
import { CommentList } from "./comment-list";
import { Star } from "lucide-react";
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
  isPublicView?: boolean;
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
  isPublicView = false,
}: RatingsCommentsSectionProps) {
  const [ratingStats, setRatingStats] = useState<RatingStats>(initialRatingStats);

  const handleRatingChange = useCallback(
    (_rating: number, stats: RatingStats) => {
      setRatingStats(stats);
    },
    []
  );

  return (
    <div className="space-y-8">
      {/* Ratings Section */}
      <Card>
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-amber/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10">
              <Star className="h-5 w-5 text-amber" />
            </div>
            <div>
              <CardTitle className="font-display">Community Rating</CardTitle>
              <CardDescription>
                {ratingStats.totalRatings > 0
                  ? `${ratingStats.averageRating.toFixed(1)} average from ${ratingStats.totalRatings} rating${
                      ratingStats.totalRatings !== 1 ? "s" : ""
                    }`
                  : "Be the first to rate this recipe"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Average Rating Display */}
            <div className="flex items-center gap-4">
              <RatingDisplay
                averageRating={ratingStats.averageRating}
                totalRatings={ratingStats.totalRatings}
                size="lg"
                showCount={false}
              />
              {ratingStats.totalRatings > 0 && (
                <div className="text-sm text-muted-foreground">
                  {ratingStats.totalRatings} review
                  {ratingStats.totalRatings !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* User Rating Input */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Your rating:</span>
                <RatingInput
                  recipeId={recipeId}
                  initialRating={initialUserRating}
                  onRatingChange={handleRatingChange}
                  size="md"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <a href="/login" className="text-primary hover:underline">
                  Sign in
                </a>{" "}
                to rate this recipe
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardContent className="p-6">
          <CommentList
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
