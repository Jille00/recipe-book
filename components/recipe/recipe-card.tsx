import Link from "next/link";
import Image from "next/image";
import type { RecipeCardData } from "@/types/recipe";
import { Clock, Users, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "./favorite-button";
import { recipePath } from "@/lib/recipe-url";
import { DelftWall } from "@/components/delft/delft-tile";
import { profilePath } from "@/lib/handle";

interface RecipeCardProps {
  recipe: RecipeCardData;
  showAuthor?: boolean;
  showFavorite?: boolean;
  initialFavorited?: boolean;
}

// STYLE_GUIDE 01/04 difficulty badges: Easy success, Medium warning, Hard danger.
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

  const rating =
    recipe.ratingStats && recipe.ratingStats.totalRatings > 0
      ? recipe.ratingStats
      : null;

  return (
    // The card is the hover group and the positioning context. The link is a
    // "stretched link" on the title: its ::after overlay makes the whole card
    // clickable without nesting the favorite <button> inside an <a>.
    // STYLE_GUIDE 04/05 card: soft shadow -> lifted shadow and a 4px lift on
    // hover, over the slow (400ms) duration with the guide's ease-out.
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-[translate,box-shadow] duration-(--duration-slow) ease-out hover:-translate-y-1 hover:shadow-lifted">
      {/* Cover: the photo, or the recipe's own tile wall */}
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
          // No photo: the recipe's own Delft tile, laid as a wall
          // (STYLE_GUIDE 06). Same recipe, same tile, everywhere.
          <DelftWall
            seed={recipe.code}
            tags={recipe.tags}
            tileSize={112}
            className="transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}

        {/* Time badge: glass, top-right over the cover (STYLE_GUIDE 04) */}
        {totalTime > 0 && (
          <div className="glass-badge absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs tabular">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {totalTime} min
          </div>
        )}

        {/* Favorite button: sits above the stretched link overlay (z-10) */}
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

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Title: Gloock 20-22px, one line, never bold */}
        <h3 className="font-display text-xl leading-[1.3] text-foreground line-clamp-1 transition-colors duration-(--duration-fast) group-hover:text-primary sm:text-[22px]">
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

        {/* Meta row: data in Plex Mono, difficulty as a status badge */}
        {/* Time is on the cover badge (STYLE_GUIDE 04), so it isn't repeated here. */}
        {(recipe.servings || rating || difficultyVariant) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
            {recipe.servings && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-mono tabular">
                  {recipe.servings}
                  <span className="sr-only"> servings</span>
                </span>
              </span>
            )}
            {rating && (
              <span className="flex items-center gap-1.5">
                <Star
                  className="h-3.5 w-3.5 fill-gold text-gold"
                  aria-hidden="true"
                />
                <span className="sr-only">Rated </span>
                <span className="font-mono tabular text-foreground">
                  {rating.averageRating.toFixed(1)}
                </span>
                <span className="font-mono tabular">
                  <span aria-hidden="true">({rating.totalRatings})</span>
                  <span className="sr-only">
                    {" "}
                    out of 5 from {rating.totalRatings}{" "}
                    {rating.totalRatings === 1 ? "rating" : "ratings"}
                  </span>
                </span>
              </span>
            )}
            {recipe.difficulty && difficultyVariant && (
              <Badge variant={difficultyVariant} className="ml-auto px-2.5 py-1">
                {recipe.difficulty.charAt(0).toUpperCase() +
                  recipe.difficulty.slice(1)}
              </Badge>
            )}
          </div>
        )}

        {/* Author */}
        {showAuthor && recipe.authorName && (
          <p className="mt-auto pt-3 text-sm text-muted-foreground">
            by{" "}
            {recipe.authorHandle ? (
              // z-20 lifts it above the title's stretched-link overlay.
              <Link
                href={profilePath(recipe.authorHandle)}
                className="relative z-20 font-medium underline decoration-muted-foreground/50 underline-offset-2 transition-colors duration-(--duration-fast) hover:text-primary hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {recipe.authorName}
              </Link>
            ) : (
              recipe.authorName
            )}
          </p>
        )}
      </div>
    </article>
  );
}
