import { Skeleton } from "@/components/ui";

/** Mirrors CollectionsGrid: PageHeader with "New collection", then CollectionCards. */
export default function CollectionsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <Skeleton className="h-14 w-72 max-w-full sm:h-20 sm:w-96" />
            <Skeleton className="mt-4 h-6 w-72 max-w-full" />
          </div>
          <Skeleton className="h-12 w-48 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[20px] bg-card">
            {/* Stripe cover */}
            <Skeleton className="h-32 w-full rounded-none" />
            <div className="px-5 pt-4 pb-5">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="mt-1.5 h-5 w-20" />
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
