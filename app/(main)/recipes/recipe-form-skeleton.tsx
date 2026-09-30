import { Card, Skeleton } from "@/components/ui";

/** One editor section: a Gloock title, a line of guidance, then its body. */
function SectionSkeleton({
  titleWidth,
  children,
}: {
  titleWidth: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="space-y-2 px-5 pt-6 sm:px-6">
        <Skeleton className={`h-6 ${titleWidth}`} />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="px-5 pt-5 pb-6 sm:px-6">{children}</div>
    </Card>
  );
}

/**
 * Loading state shared by the create and edit pages, which render the same
 * form: a back link, the page title, then the form's section cards.
 */
export function RecipeFormSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      {/* Back link, title, intro */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="mb-3 h-11 w-36" />
        <Skeleton className="h-10 w-64 sm:h-12" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Details: title, description, tags */}
        <SectionSkeleton titleWidth="w-24">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full rounded-md" />
            </div>
            <div className="flex flex-wrap gap-2">
              {["w-20", "w-24", "w-16", "w-28", "w-20"].map((width, index) => (
                <Skeleton key={index} className={`h-9 rounded-full ${width}`} />
              ))}
            </div>
          </div>
        </SectionSkeleton>

        {/* Photo */}
        <SectionSkeleton titleWidth="w-20">
          <Skeleton className="h-72 w-full rounded-xl sm:aspect-[2/1] sm:h-auto" />
        </SectionSkeleton>

        {/* Ingredients and method */}
        {[4, 3].map((rows, index) => (
          <SectionSkeleton key={index} titleWidth="w-36">
            <div className="space-y-3">
              {Array.from({ length: rows }).map((_, row) => (
                <Skeleton key={row} className="h-12 w-full rounded-md" />
              ))}
            </div>
          </SectionSkeleton>
        ))}

        <div className="flex justify-end gap-3">
          <Skeleton className="h-11 w-24 rounded-md" />
          <Skeleton className="h-11 w-40 rounded-md" />
        </div>
      </div>

      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  );
}
