import Link from "next/link";
import { cn } from "@/lib/utils";
import { tagPath } from "@/lib/tag-pages";

interface TagPillLinkProps {
  tag: { name: string; slug: string };
  /** Shown after the name, e.g. how many recipes carry the tag. */
  count?: number;
  className?: string;
}

/** A tag as a sage pill (STYLE_GUIDE 04 "Category tags") linking to its page. */
export function TagPillLink({ tag, count, className }: TagPillLinkProps) {
  return (
    <Link
      href={tagPath(tag.slug)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-3.5 py-1.5 text-xs font-medium tracking-[0.02em] text-sage-700 transition-colors duration-(--duration-fast) hover:bg-sage-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {tag.name}
      {count !== undefined && (
        // Lighter weight rather than a lighter colour: sage-600 on sage-100
        // falls short of 4.5:1 at this size.
        <span className="font-normal tabular-nums">
          <span className="sr-only">(</span>
          {count}
          <span className="sr-only"> {count === 1 ? "recipe" : "recipes"})</span>
        </span>
      )}
    </Link>
  );
}
