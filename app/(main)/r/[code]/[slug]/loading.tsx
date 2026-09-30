import { Card, CardContent, Skeleton } from "@/components/ui";

/** Mirrors the recipe page: title block, action row, hero, meta strip, body. */
export default function RecipeLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Eyebrow, title, description */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-11 w-4/5 max-w-xl sm:h-14" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-5 w-2/3 max-w-lg" />
      </div>

      {/* Action row */}
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-11 w-28 rounded-md" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-11 rounded-md sm:w-32" />
        ))}
      </div>

      {/* Hero */}
      <Skeleton className="mt-8 aspect-[4/3] w-full rounded-xl sm:aspect-[16/9]" />

      {/* Meta strip */}
      <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-5 border-y border-border py-5 sm:flex sm:gap-x-10">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-10 sm:mt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        {/* Ingredients */}
        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <Skeleton className="mb-2 h-8 w-36" />
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Method */}
        <div className="space-y-7">
          <Skeleton className="h-8 w-28" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="h-8 w-8" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading recipe
      </span>
    </div>
  );
}
