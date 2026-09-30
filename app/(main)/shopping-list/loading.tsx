import { Skeleton } from "@/components/ui";

const ROW_WIDTHS = ["w-2/5", "w-3/5", "w-1/2", "w-4/5", "w-1/3"];

export default function ShoppingListLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-10 w-60 sm:h-12" />
        <Skeleton className="mt-3 h-5 w-32" />
      </div>

      {/* Add item */}
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-md" />
        <Skeleton className="h-12 w-24 rounded-md" />
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-52 rounded-md" />
        <Skeleton className="h-9 w-48 rounded-md" />
      </div>

      {/* Groups: checkbox, amount column, item */}
      <div className="space-y-6">
        {[5, 3].map((rows, group) => (
          <div key={group} className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <Skeleton className="mb-4 h-6 w-44" />
            <div className="space-y-4">
              {Array.from({ length: rows }).map((_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded-[4px]" />
                  <Skeleton className="h-4 w-14 sm:w-20" />
                  <Skeleton className={`h-4 ${ROW_WIDTHS[row % ROW_WIDTHS.length]}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading your shopping list
      </span>
    </div>
  );
}
