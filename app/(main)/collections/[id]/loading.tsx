import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

export default function CollectionLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Skeleton className="mb-4 h-5 w-32" />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div className="flex items-center gap-5 sm:gap-6">
          <Skeleton className="size-20 rounded-[2px] sm:size-28" />
          <div>
            <Skeleton className="h-10 w-56 sm:h-12 sm:w-72" />
            <Skeleton className="mt-3 h-5 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading collection
      </span>
    </div>
  );
}
