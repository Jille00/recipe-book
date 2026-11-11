import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/** Mirrors the dashboard: title row, four stats, recent recipes beside the quick links. */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Title row */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-14 w-64 max-w-full sm:h-20 sm:w-80" />
          <Skeleton className="mt-4 h-6 w-80 max-w-full" />
        </div>
        <Skeleton className="h-12 w-44 shrink-0 self-start rounded-full sm:self-auto" />
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-3xl bg-card p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-3 h-12 w-12" />
            <Skeleton className="mt-1 h-5 w-28 max-w-full" />
          </div>
        ))}
      </div>

      {/* Recent recipes & quick links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-9 w-48" />
            {/* "View all" */}
            <div className="flex min-h-11 items-center">
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="-mx-2 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-2 py-3">
                  <Skeleton className="size-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-5 w-48 max-w-full" />
                    <Skeleton className="mt-1.5 h-4 w-32 max-w-full" />
                  </div>
                  <Skeleton className="hidden h-4 w-12 shrink-0 sm:block" />
                  <Skeleton className="size-4 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <Skeleton className="h-9 w-24" />
          </CardHeader>
          <CardContent className="grid gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      <span className="sr-only" role="status">
        Loading your dashboard
      </span>
    </div>
  );
}
