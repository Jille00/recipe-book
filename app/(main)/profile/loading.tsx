import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-10 w-36 sm:h-12" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full" />
        <Skeleton className="mt-3 h-11 w-56" />
      </div>

      <div className="space-y-6">
        {/* About you */}
        <Card>
          <CardHeader className="gap-1.5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full sm:size-20" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            {["h-12", "h-12", "h-24", "h-12", "h-12"].map((height, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className={`${height} w-full rounded-md`} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Measurement units */}
        <Card>
          <CardHeader className="gap-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-[74px] w-full rounded-lg" />
            <Skeleton className="h-[74px] w-full rounded-lg" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Skeleton className="h-11 w-40 rounded-md" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading your profile
      </span>
    </div>
  );
}
