import { Skeleton } from "@/components/ui";

export default function CollectionsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div>
          <Skeleton className="h-10 w-56 sm:h-12" />
          <Skeleton className="mt-3 h-5 w-72" />
        </div>
        <Skeleton className="h-11 w-48 rounded-md" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-4 sm:p-5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading your collections
      </span>
    </div>
  );
}
