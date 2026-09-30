import { Skeleton } from "@/components/ui";
import { RecipeGridSkeleton } from "@/components/page/recipe-grid-skeleton";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-10 w-48 sm:h-12" />
        <Skeleton className="mt-3 h-5 w-64" />
      </div>

      <RecipeGridSkeleton />

      <span className="sr-only" role="status">
        Loading your favorites
      </span>
    </div>
  );
}
