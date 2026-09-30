import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DelftTile } from "@/components/delft/delft-tile";
import { tagPath } from "@/lib/tag-pages";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  tags: { id: string; name: string; slug: string; recipeCount?: number }[];
  className?: string;
}

/**
 * Shortcuts from /browse to the busiest tag pages, plus the full index. Each
 * pill carries a tiny tile of its category's motif (STYLE_GUIDE 04 Tag pills,
 * 06), the same tile the category wears on /tags.
 */
export function CategoryChips({ tags, className }: CategoryChipsProps) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="Categories" className={cn("flex flex-wrap items-center gap-2", className)}>
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={tagPath(tag.slug)}
          // 36px pill; the ::after stretches the hit area to 44px, which the
          // 8px row gap leaves room for.
          className="relative inline-flex h-9 items-center gap-2 rounded-full bg-secondary pr-3.5 pl-1.5 text-[13px] font-medium text-primary transition-colors duration-(--duration-fast) after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:bg-glaze-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-night-line"
        >
          <DelftTile seed={tag.slug} tags={[tag.slug]} className="size-6" />
          {tag.name}
          {tag.recipeCount !== undefined && (
            <span className="font-mono text-xs tabular text-muted-foreground">
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
