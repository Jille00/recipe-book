import { Card, CardContent, Skeleton } from "@/components/ui";

const ROW_WIDTHS = ["w-2/5", "w-3/5", "w-1/2", "w-4/5", "w-1/3"];

/** Mirrors ShoppingListView in its default "By recipe" view. */
export default function ShoppingListLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header: title, count, Copy and Print */}
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <Skeleton className="h-14 w-72 max-w-full sm:h-20 sm:w-96" />
            <Skeleton className="mt-4 h-6 w-36" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Add item */}
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-13 min-w-0 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-24 rounded-full" />
      </div>

      {/* View switch and clear actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-60 max-w-full rounded-full" />
        <div className="flex flex-wrap items-center gap-1">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Groups: swatch and recipe name, then checkbox, amount, item, remove */}
      <div className="space-y-6">
        {[5, 3].map((rows, group) => (
          <Card key={group}>
            <CardContent>
              <div className="mb-2 flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-[10px]" />
                <Skeleton className="h-9 w-52 max-w-full" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: rows }).map((_, row) => (
                  <div key={row} className="flex items-start gap-3 py-3 first:pt-2 last:pb-0">
                    <Skeleton className="mt-0.5 size-5 shrink-0 rounded-[6px]" />
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="w-20 shrink-0 sm:w-28">
                        <Skeleton className="h-6 w-12" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Skeleton className={`h-6 ${ROW_WIDTHS[row % ROW_WIDTHS.length]}`} />
                      </div>
                    </div>
                    {/* Remove */}
                    <Skeleton className="-my-1.5 size-10 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading your shopping list
      </span>
    </div>
  );
}
