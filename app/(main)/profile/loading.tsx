import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      <div className="space-y-6">
        {/* Profile details */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            {[10, 20, 10, 10].map((height, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton
                  className={height === 20 ? "h-20 w-full" : "h-10 w-full"}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Measurement units */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading your profile
      </span>
    </div>
  );
}
