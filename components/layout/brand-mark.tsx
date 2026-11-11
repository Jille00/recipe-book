import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Height of the spines in Tailwind classes, e.g. "h-7". */
  spinesClassName?: string;
  /** Wordmark size classes, e.g. "text-4xl". */
  wordmarkClassName?: string;
}

/**
 * Three cookbook spines on a shelf, in tomato, lemon and basil. Sized by its
 * height; the spines scale with it.
 */
export function Spines({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-7 items-end gap-[0.1em]", className)}>
      <span className="recipe-tomato h-full w-[0.3em] rounded-[2px] bg-recipe" />
      <span className="recipe-lemon h-3/4 w-[0.3em] rounded-[2px] bg-recipe" />
      <span className="recipe-basil h-[90%] w-[0.3em] rounded-[2px] bg-recipe" />
    </span>
  );
}

/**
 * The Kookboek mark (STYLE_GUIDE 04 Navigation): the three spines and the
 * lowercase wordmark in the display face. It takes the text colour around it.
 */
export function BrandMark({ className, spinesClassName, wordmarkClassName }: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="Kookboek, home"
      className={cn(
        "inline-flex min-h-11 items-end gap-2.5 rounded-md pb-1.5 font-display text-4xl leading-[0.8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        wordmarkClassName,
        className
      )}
    >
      <Spines className={cn("h-[0.78em] text-[1em]", spinesClassName)} />
      <span aria-hidden="true">kookboek</span>
    </Link>
  );
}
