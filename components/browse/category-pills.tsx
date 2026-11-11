import Link from "next/link";
import { recipeColourClass } from "@/lib/recipe-colour";
import { tagPath } from "@/lib/tag-pages";
import { cn } from "@/lib/utils";

interface CategoryPillsProps {
  tags: { id: string; name: string; slug: string; recipeCount: number }[];
  className?: string;
}

/**
 * Categories as large pills of their own colour, with how many recipes each
 * holds (STYLE_GUIDE 06). An empty category stays in the row as a
 * plain outline (full-contrast text, no colour) and isn't a link to a dead end.
 */
export function CategoryPills({ tags, className }: CategoryPillsProps) {
  return (
    <ul className={cn("flex flex-wrap gap-3", className)}>
      {tags.map((tag) => {
        const shape =
          "inline-flex h-14 items-center gap-3 rounded-full px-6 font-display text-3xl leading-none sm:h-16 sm:px-7 sm:text-4xl";
        const pill = cn(recipeColourClass(tag.slug, [tag.slug]), shape, "bg-recipe text-on-recipe");
        const count = (
          <span className="font-sans text-[15px] font-bold tabular">
            <span className="sr-only">(</span>
            {tag.recipeCount}
            <span className="sr-only"> {tag.recipeCount === 1 ? "recipe" : "recipes"})</span>
          </span>
        );

        return (
          <li key={tag.id}>
            {tag.recipeCount === 0 ? (
              <span className={cn(shape, "border-[1.5px] border-border text-muted-foreground")}>
                {tag.name}
                {count}
              </span>
            ) : (
              <Link
                href={tagPath(tag.slug)}
                className={cn(
                  pill,
                  "transition-[translate,box-shadow] duration-(--duration-fast) hover:-translate-y-0.5 hover:shadow-lifted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                {tag.name}
                {count}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
