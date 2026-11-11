import { Card, CardContent, Skeleton } from "@/components/ui";

/**
 * Mirrors the recipe page (components/recipe/recipe-detail.tsx): a full-width
 * hero with the title, actions and the times beside it, then ingredients and
 * method. The recipe's colour isn't known yet, so the hero is a quiet block
 * of the same size.
 */
export default function RecipeLoading() {
  return (
    <div>
      <div className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8 sm:pb-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end lg:gap-16">
            <div>
              {/* Category, title (two lines), description, author */}
              <Skeleton className="h-5 w-24 bg-border" />
              <Skeleton className="mt-4 h-16 w-11/12 bg-border sm:h-24 lg:h-32" />
              <Skeleton className="mt-3 h-16 w-2/3 bg-border sm:h-24 lg:h-32" />
              <Skeleton className="mt-6 h-6 w-full max-w-xl bg-border" />
              <Skeleton className="mt-2 h-6 w-3/4 max-w-md bg-border" />
              <Skeleton className="mt-4 h-5 w-40 bg-border" />

              {/* Actions: one main pill, the rest outlines */}
              <div className="mt-8 flex items-center gap-2">
                <Skeleton className="h-14 w-44 rounded-full bg-border" />
                <Skeleton className="size-12 rounded-full bg-border sm:w-36" />
                <Skeleton className="size-12 rounded-full bg-border sm:w-48" />
                <Skeleton className="size-12 rounded-full bg-border" />
              </div>
            </div>

            {/* Times and servings */}
            <div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-14 items-center justify-between gap-4 border-t-[1.5px] border-border py-2"
                >
                  <Skeleton className="h-5 w-20 bg-border" />
                  <Skeleton className={index === 0 ? "h-10 w-28 bg-border" : "h-5 w-16 bg-border"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mt-8 grid gap-10 sm:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          {/* Ingredients */}
          <Card className="gap-0 self-start py-0">
            <CardContent className="p-5 sm:p-6">
              <Skeleton className="mb-4 h-11 w-44" />
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b-[1.5px] border-border py-3 last:border-b-0"
                >
                  <Skeleton className="size-5 rounded-[6px]" />
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Method */}
          <div>
            <Skeleton className="mb-8 h-11 w-36" />
            <div className="space-y-7">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="grid grid-cols-[3rem_1fr] gap-x-4">
                  <Skeleton className="size-12 rounded-2xl" />
                  <div className="space-y-3 pt-2.5">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-11/12" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading recipe
      </span>
    </div>
  );
}
