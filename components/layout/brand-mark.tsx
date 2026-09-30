import Link from "next/link";
import { DelftTile } from "@/components/delft/delft-tile";
import { cn } from "@/lib/utils";

/**
 * The Kookboek mark (STYLE_GUIDE 04 Navigation): a small Delft tile with the
 * windmill motif and the lowercase wordmark in Gloock. The seed is fixed, so
 * the mark is the same tile everywhere.
 */
export const BRAND_TILE_SEED = "kookboek";
export const BRAND_TILE_TAGS = ["dinner"] as const;

interface BrandMarkProps {
  className?: string;
  /** Tile edge in Tailwind size classes, e.g. "size-9". */
  tileClassName?: string;
  /** Wordmark size classes, e.g. "text-2xl". */
  wordmarkClassName?: string;
}

export function BrandMark({ className, tileClassName, wordmarkClassName }: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="Kookboek, home"
      className={cn(
        "group inline-flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <DelftTile
        seed={BRAND_TILE_SEED}
        tags={BRAND_TILE_TAGS}
        className={cn("size-9 rounded-[2px] shadow-soft", tileClassName)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "font-display text-2xl leading-none text-foreground transition-colors group-hover:text-primary",
          wordmarkClassName
        )}
      >
        kookboek
      </span>
    </Link>
  );
}
