import { Skeleton } from "@/components/ui";

export default function CollectionsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-44" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-11 w-44 rounded-lg" />
      </div>

      <Skeleton className="mb-6 h-4 w-24" />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-4">
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
