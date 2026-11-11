import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* PageHeader: title and intro */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-14 w-56 max-w-full sm:h-20 sm:w-80" />
        <Skeleton className="mt-4 h-6 w-96 max-w-full" />
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading your favorites
      </span>
    </div>
  );
}
