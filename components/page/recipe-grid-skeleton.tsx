import { Skeleton } from "@/components/ui";

/** Placeholder cards shaped like RecipeCard, for list pages' loading.tsx. */
export function RecipeGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="ml-auto h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
