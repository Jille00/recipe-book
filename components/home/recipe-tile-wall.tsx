import Link from "next/link";
import type { CSSProperties } from "react";
import { DelftTile } from "@/components/delft/delft-tile";
import { recipePath } from "@/lib/recipe-url";
import { cn } from "@/lib/utils";

export interface WallRecipe {
  code: string;
  slug: string;
  title: string;
  tags?: readonly string[] | null;
}

interface RecipeTileWallProps {
  recipes: readonly WallRecipe[];
  /** Tiles in the wall; recipes fill it first, plain tiles the rest. */
  size?: number;
  columns?: number;
  className?: string;
}

// Tiles settle in along the diagonal, like a wall being laid from one corner.
const STAGGER_MS = 55;

/**
 * The home page's hero (STYLE_GUIDE 05: the app's one orchestrated moment).
 * Every recipe is a tile; each tile links to its recipe. When there are fewer
 * recipes than places on the wall, the gaps get plain decorative tiles so the
 * wall always reads as a wall.
 */
export function RecipeTileWall({ recipes, size = 12, columns = 4, className }: RecipeTileWallProps) {
  const places = Array.from({ length: size }, (_, index) => recipes[index] ?? null);

  return (
    <ul
      aria-label="Recently added recipes"
      className={cn("grid rounded-[2px] border border-border shadow-medium", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {places.map((recipe, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const settle: CSSProperties = { animationDelay: `${(row + column) * STAGGER_MS}ms` };
        const settleClass =
          "animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards duration-500 ease-out motion-reduce:animate-none";

        if (!recipe) {
          return (
            <li key={`plain-${index}`} aria-hidden="true" className={settleClass} style={settle}>
              <DelftTile seed={`kookboek-wall-${index}`} className="aspect-square w-full" />
            </li>
          );
        }

        return (
          <li key={recipe.code} className={settleClass} style={settle}>
            <Link
              href={recipePath(recipe)}
              title={recipe.title}
              aria-label={recipe.title}
              className="relative block transition-[transform,box-shadow] duration-150 ease-out hover:z-10 hover:-translate-y-1 hover:shadow-lifted focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <DelftTile seed={recipe.code} tags={recipe.tags} className="aspect-square w-full" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
