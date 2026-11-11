import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

const CHIP_WIDTHS = ["w-24", "w-28", "w-20", "w-32", "w-24"];

/** Mirrors /browse: PageHeader, BrowseFilters (search, chips, count and sort), grid. */
export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* PageHeader: title and intro */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-14 w-80 max-w-full sm:h-20 sm:w-[30rem]" />
        <Skeleton className="mt-4 h-6 w-full max-w-2xl" />
      </div>

      <div className="space-y-6">
        {/* Search field, Filters, Search */}
        <div className="flex gap-2">
          <Skeleton className="h-14 min-w-0 flex-1 rounded-xl" />
          <Skeleton className="h-14 w-12 shrink-0 rounded-full sm:w-28" />
          <Skeleton className="h-14 w-12 shrink-0 rounded-full sm:w-32" />
        </div>

        {/* Category chips and "All categories" */}
        <div className="flex flex-wrap items-center gap-2">
          {CHIP_WIDTHS.map((width, index) => (
            <Skeleton key={index} className={`h-10 rounded-full ${width}`} />
          ))}
          <div className="flex min-h-11 items-center px-2">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* Results count and sort */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      <div className="mt-6">
        <RecipeGridSkeleton />
      </div>

      <span className="sr-only" role="status">
        Loading recipes
      </span>
    </div>
  );
}
