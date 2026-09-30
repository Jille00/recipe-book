import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/**
 * Loading state shared by the create and edit pages, which render the same
 * form: a back link, the page title, then the form's section cards.
 */
export function RecipeFormSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link, title, intro */}
      <div className="mb-8">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-80 max-w-full" />
      </div>

      <div className="space-y-6">
        {/* Basics: image, title, description */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients and instructions */}
        {[4, 3].map((rows, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: rows }).map((_, row) => (
                <Skeleton key={row} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end gap-3">
          <Skeleton className="h-11 w-24 rounded-lg" />
          <Skeleton className="h-11 w-36 rounded-lg" />
        </div>
      </div>

      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  );
}
