import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Title row */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-3 h-5 w-72" />
        </div>
        <Skeleton className="h-11 w-40 rounded-md" />
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Recent recipes & quick links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 py-3">
                  <Skeleton className="size-12 rounded-[2px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent className="grid gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-md" />
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
