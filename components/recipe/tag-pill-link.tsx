import Link from "next/link";
import { ColourDot } from "@/components/recipe/recipe-colour";
import { cn } from "@/lib/utils";
import { tagPath } from "@/lib/tag-pages";

interface TagPillLinkProps {
  tag: { name: string; slug: string };
  /** Shown after the name, e.g. how many recipes carry the tag. */
  count?: number;
  className?: string;
}

/**
 * A tag as a white pill (STYLE_GUIDE 04 "Chips") linking to its page. A dot
 * of the tag's colour leads, the same colour the tag wears on /tags and in
 * the /browse category pills.
 */
export function TagPillLink({ tag, count, className }: TagPillLinkProps) {
  return (
    <Link
      href={tagPath(tag.slug)}
      className={cn(
        // 40px pill; the ::after stretches the hit area to 44px, which an 8px
        // row gap leaves room for.
        "relative inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-border bg-card px-4 text-[15px] font-semibold text-foreground transition-colors duration-(--duration-fast) after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <ColourDot seed={tag.slug} tags={[tag.slug]} />
      {tag.name}
      {count !== undefined && (
        <span className="text-sm tabular text-muted-foreground">
          <span className="sr-only">(</span>
          {count}
          <span className="sr-only"> {count === 1 ? "recipe" : "recipes"})</span>
        </span>
      )}
    </Link>
  );
}
