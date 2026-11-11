import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

/** Mirrors CollectionDetail: back link, stripes beside the name, Rename and Delete. */
export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 sm:mb-10">
        {/* Back link */}
        <div className="mb-4 flex min-h-11 items-center">
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            {/* Stripe cover */}
            <Skeleton className="h-20 w-14 shrink-0 rounded-xl sm:h-28 sm:w-20" />
            <div className="min-w-0">
              <Skeleton className="h-14 w-56 max-w-full sm:h-20 sm:w-80" />
              <Skeleton className="mt-2 h-6 w-24" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading collection
      </span>
    </div>
  );
}
