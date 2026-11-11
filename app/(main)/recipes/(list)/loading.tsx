import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

export default function RecipesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* PageHeader: title, count, "Add a recipe" */}
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <Skeleton className="h-14 w-64 max-w-full sm:h-20 sm:w-96" />
            <Skeleton className="mt-4 h-6 w-64 max-w-full" />
          </div>
          <Skeleton className="h-12 w-44 rounded-full" />
        </div>
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading your recipes
      </span>
    </div>
  );
}
