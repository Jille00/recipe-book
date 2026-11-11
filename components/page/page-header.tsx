import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  /** One line under the title, in the secondary text colour. */
  intro?: React.ReactNode;
  /** Something small above the title, e.g. a back link. */
  before?: React.ReactNode;
  /** Beside the title: at most one filled (default) Button per page. */
  action?: React.ReactNode;
  /** Id for the h1, so a section can be labelled by it. */
  titleId?: string;
  className?: string;
}

/**
 * The top of a list page (STYLE_GUIDE 02/03): a condensed h1 at 60-96px, an
 * intro line, and the page's main action on the right (below on phones).
 */
export function PageHeader({
  title,
  intro,
  before,
  action,
  titleId,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-8 sm:mb-10", className)}>
      {before}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1
            id={titleId}
            className="font-display text-6xl leading-[0.88] text-foreground text-balance break-words sm:text-7xl lg:text-8xl"
          >
            {title}
          </h1>
          {intro && (
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p>
          )}
        </div>
        {action && (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
