import { Skeleton } from "@/components/ui";

/** Placeholder labels shaped like RecipeCard, for list pages' loading.tsx. */
export function RecipeGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[21rem] flex-col justify-between rounded-[20px] bg-muted p-5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 bg-border" />
            <Skeleton className="h-7 w-16 rounded-full bg-border" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4 bg-border" />
            <Skeleton className="h-10 w-1/2 bg-border" />
            <Skeleton className="h-4 w-40 bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}
