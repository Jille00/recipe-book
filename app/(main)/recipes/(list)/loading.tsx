import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

export default function RecipesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Title row */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div>
          <Skeleton className="h-10 w-56 sm:h-12" />
          <Skeleton className="mt-3 h-5 w-52" />
        </div>
        <Skeleton className="h-11 w-40 rounded-md" />
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading your recipes
      </span>
    </div>
  );
}
