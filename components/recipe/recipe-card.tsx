import Link from "next/link";
import Image from "next/image";
import type { RecipeWithDetails } from "@/types/recipe";
import { Clock, Users, ChefHat, Star } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { recipePath } from "@/lib/recipe-url";

interface RecipeCardProps {
  recipe: RecipeWithDetails;
  showAuthor?: boolean;
  showFavorite?: boolean;
  initialFavorited?: boolean;
}

export function RecipeCard({
  recipe,
  showAuthor = false,
  showFavorite = true,
  // No default here on purpose: a `false` default would shadow the
  // `?? recipe.isFavorited` fallback below and make every heart render empty
  // for callers that pass the whole recipe but no explicit prop.
  initialFavorited,
}: RecipeCardProps) {
  // One address for every viewer, so a card links the same place for owners
  // and everyone else.
  const link = recipePath(recipe);
  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    // The card is the hover group and the positioning context. The link is a
    // "stretched link" on the title: its ::after overlay makes the whole card
    // clickable without nesting the favorite <button> inside an <a>.
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Time Badge - Glass Effect */}
        {totalTime > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-xs font-medium">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {totalTime} min
          </div>
        )}

        {/* Difficulty Badge - Glass Effect for readability */}
        {recipe.difficulty && (
          <div className="absolute top-3 right-3 rounded-full glass px-2.5 py-1 text-xs font-medium">
            {recipe.difficulty.charAt(0).toUpperCase() +
              recipe.difficulty.slice(1)}
          </div>
        )}

        {/* Favorite Button - sits above the stretched link overlay (z-10) */}
        {showFavorite && (
          <FavoriteButton
            recipeId={recipe.id}
            initialFavorited={initialFavorited ?? recipe.isFavorited ?? false}
            variant="glass"
            size="sm"
            className="absolute bottom-3 right-3 z-20"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          <Link
            href={link}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:ring-offset-2 focus-visible:after:rounded-xl"
          >
            {recipe.title}
          </Link>
        </h3>

        {recipe.description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {recipe.ratingStats && recipe.ratingStats.totalRatings > 0 && (
            <span className="flex items-center gap-1">
              <Star
                className="h-3.5 w-3.5 text-amber fill-amber"
                aria-hidden="true"
              />
              <span className="font-medium text-foreground">
                {recipe.ratingStats.averageRating.toFixed(1)}
              </span>
              <span>({recipe.ratingStats.totalRatings})</span>
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.servings} servings
            </span>
          )}
        </div>

        {/* Author */}
        {showAuthor && recipe.authorName && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">
              by {recipe.authorName}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
