import Link from "next/link";
import { DelftTile } from "@/components/delft/delft-tile";
import { cn } from "@/lib/utils";
import { tagPath } from "@/lib/tag-pages";

interface TagPillLinkProps {
  tag: { name: string; slug: string };
  /** Shown after the name, e.g. how many recipes carry the tag. */
  count?: number;
  className?: string;
}

/**
 * A tag as a glaze pill with delft text (STYLE_GUIDE 04 "Tag pills") linking
 * to its page. A tiny tile of the tag's motif leads, the same one the tag
 * wears on /tags and in the /browse category pills.
 */
export function TagPillLink({ tag, count, className }: TagPillLinkProps) {
  return (
    <Link
      href={tagPath(tag.slug)}
      className={cn(
        // 36px pill; the ::after stretches the hit area to 44px, which an 8px
        // row gap leaves room for.
        "relative inline-flex h-9 items-center gap-2 rounded-full bg-secondary pr-3.5 pl-1.5 text-[13px] font-medium text-primary transition-colors duration-(--duration-fast) after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:bg-glaze-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-night-line",
        className
      )}
    >
      <DelftTile seed={tag.slug} tags={[tag.slug]} className="size-6" />
      {tag.name}
      {count !== undefined && (
        <span className="font-mono text-xs tabular text-muted-foreground">
          <span className="sr-only">(</span>
          {count}
          <span className="sr-only"> {count === 1 ? "recipe" : "recipes"})</span>
        </span>
      )}
    </Link>
  );
}
