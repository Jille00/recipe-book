import { Card, CardContent, Skeleton } from "@/components/ui";

export default function RecipeLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        {/* Title */}
        <div className="mb-8 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-full max-w-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>

        {/* Hero image */}
        <Skeleton className="mb-8 aspect-video w-full rounded-2xl" />

        {/* Meta cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="text-center">
              <CardContent className="py-4">
                <div className="mb-2 flex justify-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="mx-auto h-8 w-10" />
                <Skeleton className="mx-auto mt-2 h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ingredients + instructions */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="mb-4 h-6 w-32" />
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-4">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <span className="sr-only" role="status">
        Loading recipe
      </span>
    </div>
  );
}
