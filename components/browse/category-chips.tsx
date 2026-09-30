import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TagPillLink } from "@/components/recipe/tag-pill-link";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  tags: { id: string; name: string; slug: string }[];
  className?: string;
}

/** Shortcuts from /browse to the busiest tag pages, plus the full index. */
export function CategoryChips({ tags, className }: CategoryChipsProps) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="Categories" className={cn("flex flex-wrap items-center gap-2", className)}>
      {tags.map((tag) => (
        <TagPillLink key={tag.id} tag={tag} />
      ))}
      <Link
        href="/tags"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        All categories
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
