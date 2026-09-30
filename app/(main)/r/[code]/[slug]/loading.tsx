import { Card, CardContent, Skeleton } from "@/components/ui";

export default function RecipeLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Title, actions, description, badges */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Skeleton className="h-10 w-2/3 max-w-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-6 w-full max-w-2xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>

        {/* Hero image */}
        <Skeleton className="mb-8 aspect-video w-full rounded-2xl" />

        {/* Time and servings cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="flex flex-col items-center gap-2 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Ingredients */}
          <Card className="lg:col-span-1">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="mb-4 h-7 w-32" />
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-7 w-36" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-4">
                <Skeleton className="h-6 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading recipe
      </span>
    </div>
  );
}
