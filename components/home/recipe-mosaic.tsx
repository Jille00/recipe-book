import Link from "next/link";
import type { CSSProperties } from "react";
import { recipeColourClass, RECIPE_COLOURS } from "@/lib/recipe-colour";
import { recipePath } from "@/lib/recipe-url";
import { cn } from "@/lib/utils";

export interface MosaicRecipe {
  code: string;
  slug: string;
  title: string;
  tags?: readonly string[] | null;
}

interface RecipeMosaicProps {
  recipes: readonly MosaicRecipe[];
  className?: string;
}

// Six places on a 4x4 grid: where each block sits and how its name is set.
// Every block is two columns wide, so a name always has room to be read: the
// tall ones hold three lines, the single-row ones two. Recipes fill them in
// order, newest in the largest.
const TALL = { title: "text-4xl sm:text-5xl line-clamp-3", category: true } as const;
const WIDE = { title: "text-2xl sm:text-[2.5rem] line-clamp-2", category: false } as const;
const PLACES = [
  { area: "col-span-2 row-span-2", ...TALL },
  { area: "col-span-2", ...WIDE },
  { area: "col-span-2 row-span-2", ...TALL },
  { area: "col-span-2", ...WIDE },
  { area: "col-span-2", ...WIDE },
  { area: "col-span-2", ...WIDE },
] as const;

// Blocks settle in one after another, like labels being pasted up.
const STAGGER_MS = 60;

/**
 * The home page's hero (STYLE_GUIDE 05: the app's one orchestrated moment).
 * The newest recipes as a wall of their own colours; each block links to its
 * recipe. Places without a recipe yet are plain blocks of colour, so the wall
 * always reads as a wall.
 */
export function RecipeMosaic({ recipes, className }: RecipeMosaicProps) {
  return (
    <ul
      aria-label="Recently added recipes"
      className={cn(
        "grid grid-flow-dense grid-cols-4 gap-2.5 [grid-auto-rows:5.5rem] sm:gap-3.5 sm:[grid-auto-rows:8.25rem]",
        className
      )}
    >
      {PLACES.map((place, index) => {
        const recipe = recipes[index];
        const settle: CSSProperties = { animationDelay: `${index * STAGGER_MS}ms` };
        const block =
          "h-full rounded-2xl bg-recipe text-on-recipe animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards duration-500 ease-out motion-reduce:animate-none sm:rounded-[18px]";

        if (!recipe) {
          return (
            <li key={`plain-${index}`} aria-hidden="true" className={place.area}>
              <div
                className={cn(`recipe-${RECIPE_COLOURS[index % RECIPE_COLOURS.length]}`, block)}
                style={settle}
              />
            </li>
          );
        }

        return (
          <li key={recipe.code} className={place.area}>
            <Link
              href={recipePath(recipe)}
              className={cn(
                recipeColourClass(recipe.code, recipe.tags),
                block,
                "flex flex-col justify-between overflow-hidden p-3.5 transition-[translate,box-shadow] hover:-translate-y-1 hover:shadow-lifted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-4"
              )}
              style={settle}
            >
              <span className="truncate text-sm font-bold">
                {place.category ? recipe.tags?.[0] : null}
              </span>
              <span className={cn("font-display leading-[0.9] text-balance break-words hyphens-auto", place.title)}>
                {recipe.title}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
