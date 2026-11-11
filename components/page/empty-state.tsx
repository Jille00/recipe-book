import { ColourSwatch } from "@/components/recipe/recipe-colour";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Seed for the swatch, so the same empty page always shows the same colour. */
  seed: string;
  /** Picks the swatch's colour, e.g. ["drinks"] for lemon. */
  tags?: readonly string[];
  /** What's missing, in the display face. */
  title: React.ReactNode;
  /** One line of guidance. */
  children?: React.ReactNode;
  /** One action. */
  action?: React.ReactNode;
  /** Heading level for the title; h2 unless the page has no h1 above it. */
  headingLevel?: "h2" | "h3";
  className?: string;
}

/**
 * STYLE_GUIDE 04 Empty states: one blank label waiting for a recipe, a title
 * that says what's missing, one line of guidance, one action.
 */
export function EmptyState({
  seed,
  tags,
  title,
  children,
  action,
  headingLevel: Heading = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl bg-card px-6 py-12 text-center sm:py-16",
        className
      )}
    >
      <ColourSwatch seed={seed} tags={tags} className="h-28 w-24 rounded-2xl sm:h-32 sm:w-28" />
      <Heading className="mt-6 font-display text-4xl leading-[0.95] text-foreground">
        {title}
      </Heading>
      {children && (
        <p className="mt-2 max-w-md text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
