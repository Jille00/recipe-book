import Link from "next/link";
import { GitFork } from "lucide-react";

export interface AdaptedFromInfo {
  title: string;
  href: string;
}

/**
 * "Adapted from {original}" on a recipe saved as a copy. Only rendered when
 * the viewer may open the original (canLinkToOriginal); otherwise nothing is
 * shown, so a private original's current title doesn't leak either.
 */
export function AdaptedFrom({ origin }: { origin: AdaptedFromInfo }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <GitFork className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Adapted from{" "}
        <Link
          href={origin.href}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {origin.title}
        </Link>
      </span>
    </p>
  );
}
