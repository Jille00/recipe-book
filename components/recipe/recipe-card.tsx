import Link from "next/link";
import Image from "next/image";
import type { RecipeCardData } from "@/types/recipe";
import { Clock, Users, ChefHat, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "./favorite-button";
import { recipePath } from "@/lib/recipe-url";

interface RecipeCardProps {
  recipe: RecipeCardData;
  showAuthor?: boolean;
  showFavorite?: boolean;
  initialFavorited?: boolean;
}

// STYLE_GUIDE 04 difficulty badges: Easy sage, Medium amber, Hard paprika.
const DIFFICULTY_BADGE_VARIANT = {
  easy: "success",
  medium: "warning",
  hard: "danger",
} as const;

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
  const difficultyVariant = recipe.difficulty
    ? DIFFICULTY_BADGE_VARIANT[recipe.difficulty]
    : undefined;

  return (
    // The card is the hover group and the positioning context. The link is a
    // "stretched link" on the title: its ::after overlay makes the whole card
    // clickable without nesting the favorite <button> inside an <a>.
    // STYLE_GUIDE 04/05 card: soft shadow -> lifted shadow and a 4px lift on
    // hover, 0.3s with the guide's ease-out.
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            // Decorative: the title right below already names the recipe.
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat
              className="h-12 w-12 text-muted-foreground/50"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Time Badge - glass, top-right over the image (STYLE_GUIDE 04) */}
        {totalTime > 0 && (
          <div className="glass-badge absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.02em]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {totalTime} min
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

        {/* Difficulty - tag-style pill with the guide's difficulty colours */}
        {recipe.difficulty && difficultyVariant && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={difficultyVariant} className="px-3.5 py-1.5">
              {recipe.difficulty.charAt(0).toUpperCase() +
                recipe.difficulty.slice(1)}
            </Badge>
          </div>
        )}

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
