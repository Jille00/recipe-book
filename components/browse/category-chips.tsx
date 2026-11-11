import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ColourDot } from "@/components/recipe/recipe-colour";
import { tagPath } from "@/lib/tag-pages";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  tags: { id: string; name: string; slug: string; recipeCount?: number }[];
  className?: string;
}

/**
 * Shortcuts from /browse to the busiest tag pages, plus the full index. Each
 * pill carries a dot of its category's colour (STYLE_GUIDE 04 Chips, 06), the
 * same colour the category wears on /tags.
 */
export function CategoryChips({ tags, className }: CategoryChipsProps) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="Categories" className={cn("flex flex-wrap items-center gap-2", className)}>
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={tagPath(tag.slug)}
          // 40px pill; the ::after stretches the hit area to 44px, which the
          // 8px row gap leaves room for.
          className="relative inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 text-[15px] font-semibold text-foreground transition-colors duration-(--duration-fast) after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ColourDot seed={tag.slug} tags={[tag.slug]} />
          {tag.name}
          {tag.recipeCount !== undefined && (
            <span className="text-sm tabular text-muted-foreground">
              <span className="sr-only">(</span>
              {tag.recipeCount}
              <span className="sr-only">
                {" "}
                {tag.recipeCount === 1 ? "recipe" : "recipes"})
              </span>
            </span>
          )}
        </Link>
      ))}
      <Link
        href="/tags"
        className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        All categories
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
