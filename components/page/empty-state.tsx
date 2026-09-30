import { DelftTile } from "@/components/delft/delft-tile";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Seed for the tile, so the same empty page always shows the same tile. */
  seed: string;
  /** Picks the tile's motif, e.g. ["drinks"] for a cup. */
  tags?: readonly string[];
  /** What's missing, in Gloock. */
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
 * STYLE_GUIDE 04 Empty states: a single Delft tile, a Gloock title that says
 * what's missing, one line of guidance, one action.
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
        "flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center shadow-soft sm:py-16",
        className
      )}
    >
      <DelftTile seed={seed} tags={tags} className="size-24 sm:size-28" />
      <Heading className="mt-6 font-display text-2xl leading-[1.2] text-foreground">
        {title}
      </Heading>
      {children && (
        <p className="mt-2 max-w-md text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
