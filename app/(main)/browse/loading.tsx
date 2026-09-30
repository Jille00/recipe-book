import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-10 w-64 sm:h-12" />
        <Skeleton className="mt-3 h-5 w-full max-w-md" />
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Skeleton className="h-14 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-14 w-14 rounded-md sm:w-28" />
        <Skeleton className="h-14 w-14 rounded-md sm:w-28" />
      </div>

      {/* Category pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[24, 28, 20, 32, 24].map((width, index) => (
          <Skeleton
            key={index}
            className="h-9 rounded-full"
            style={{ width: `${width * 4}px` }}
          />
        ))}
      </div>

      {/* Results count and sort */}
      <div className="mt-6 mb-6 flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading recipes
      </span>
    </div>
  );
}
