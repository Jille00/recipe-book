import Link from "next/link";
import Image from "next/image";
import type { RecipeCardData } from "@/types/recipe";
import { Star } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { recipePath } from "@/lib/recipe-url";
import { recipeColourClass } from "@/lib/recipe-colour";
import { formatMinutes } from "@/lib/utils/format-time";
import { profilePath } from "@/lib/handle";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: RecipeCardData;
  showAuthor?: boolean;
  showFavorite?: boolean;
  initialFavorited?: boolean;
  /** The title's heading tag: h2 directly under a page title, h3 inside a section. */
  headingLevel?: "h2" | "h3";
}

/**
 * The recipe label (STYLE_GUIDE 04/06): a block of the recipe's own colour
 * with its name set large. With a photo, the photo fills the top and the
 * colour stays as the band that carries the name.
 */
export function RecipeCard({
  recipe,
  showAuthor = false,
  showFavorite = true,
  // No default here on purpose: a `false` default would shadow the
  // `?? recipe.isFavorited` fallback below and make every heart render empty
  // for callers that pass the whole recipe but no explicit prop.
  initialFavorited,
  headingLevel: Heading = "h2",
}: RecipeCardProps) {
  // One address for every viewer, so a card links the same place for owners
  // and everyone else.
  const link = recipePath(recipe);
  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  // Tags come alphabetically; the first one is the recipe's category line.
  const category = recipe.tags?.[0];

  const rating =
    recipe.ratingStats && recipe.ratingStats.totalRatings > 0
      ? recipe.ratingStats
      : null;

  return (
    // The label is the hover group and the positioning context. The link is a
    // "stretched link" on the title: its ::after overlay makes the whole label
    // clickable without nesting the favorite <button> inside an <a>.
    <article
      className={cn(
        recipeColourClass(recipe.code, recipe.tags),
        "group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-recipe text-on-recipe transition-[translate,box-shadow] duration-(--duration-slow) ease-out hover:-translate-y-1 hover:shadow-lifted",
        !recipe.imageUrl && "min-h-[21rem]"
      )}
    >
      {recipe.imageUrl && (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={recipe.imageUrl}
            // Decorative: the title right below already names the recipe.
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between gap-6 p-5">
        {/* Category top left, time top right, nothing else up here */}
        <div className="flex min-h-7 items-center justify-between gap-3 text-[15px] font-bold">
          <span className="truncate">{category}</span>
          {totalTime > 0 && (
            <span className="shrink-0 rounded-full bg-on-recipe px-3 py-1 text-sm leading-5 text-recipe tabular">
              {formatMinutes(totalTime)}
            </span>
          )}
        </div>

        <div>
          <Heading className="font-display text-[2.75rem] leading-[0.9] text-balance break-words hyphens-auto line-clamp-3 sm:text-5xl">
            <Link
              href={link}
              className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[20px] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
            >
              {recipe.title}
            </Link>
          </Heading>

          {/* Meta row: the favorite pill takes the right end when shown */}
          <div className={cn("mt-3.5 flex min-h-11 items-center", showFavorite && "pr-14")}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
              {recipe.servings && (
                <span>
                  Serves <span className="tabular">{recipe.servings}</span>
                </span>
              )}
              {rating && (
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-current" aria-hidden="true" />
                  <span className="sr-only">Rated </span>
                  <span className="tabular">{rating.averageRating.toFixed(1)}</span>
                  <span className="sr-only">
                    {" "}
                    out of 5 from {rating.totalRatings}{" "}
                    {rating.totalRatings === 1 ? "rating" : "ratings"}
                  </span>
                </span>
              )}
              {recipe.difficulty && (
                <span className="capitalize">{recipe.difficulty}</span>
              )}
              {showAuthor && recipe.authorName && (
                <span>
                  by{" "}
                  {recipe.authorHandle ? (
                    // z-20 lifts it above the title's stretched-link overlay.
                    <Link
                      href={profilePath(recipe.authorHandle)}
                      className="relative z-20 underline decoration-2 underline-offset-2 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-recipe"
                    >
                      {recipe.authorName}
                    </Link>
                  ) : (
                    recipe.authorName
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Favorite button: sits above the stretched link overlay (z-10) */}
      {showFavorite && (
        <FavoriteButton
          recipeId={recipe.id}
          initialFavorited={initialFavorited ?? recipe.isFavorited ?? false}
          variant="glass"
          size="sm"
          className="absolute bottom-5 right-5 z-20"
        />
      )}
    </article>
  );
}
