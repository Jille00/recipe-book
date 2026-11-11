import { Card, Skeleton } from "@/components/ui";

/**
 * One editor section, shaped like the form's FormSection: a display title and
 * a line of guidance, an optional small action on the right, then the body.
 */
function SectionSkeleton({
  titleWidth,
  action,
  children,
}: {
  titleWidth: string;
  /** Width of a size-sm pill beside the title, e.g. "Import". */
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-6 sm:px-6">
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className={`h-7 ${titleWidth}`} />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        {action && <Skeleton className={`h-10 rounded-full ${action}`} />}
      </div>
      <div className="px-5 pt-5 pb-6 sm:px-6">{children}</div>
    </Card>
  );
}

/** A label above a field. */
function FieldSkeleton({
  labelWidth = "w-24",
  field = "h-13",
}: {
  labelWidth?: string;
  field?: string;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-5 ${labelWidth}`} />
      <Skeleton className={`${field} w-full rounded-xl`} />
    </div>
  );
}

const INGREDIENT_COLUMNS =
  "grid-cols-[5.5rem_minmax(0,1fr)_2.75rem] sm:grid-cols-[6rem_10rem_minmax(0,1fr)_2.75rem]";

/**
 * Loading state shared by the create and edit pages, which render the same
 * form: a back link, the page title, then the form's seven section cards in
 * order and its footer.
 */
export function RecipeFormSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      {/* Back link, title, intro */}
      <div className="mb-8 sm:mb-10">
        <div className="mb-3 flex min-h-11 items-center">
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-14 w-64 max-w-full sm:h-20 sm:w-96" />
        <Skeleton className="mt-4 h-6 w-96 max-w-full" />
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Details: title, description, tags, difficulty; Import on the right */}
        <SectionSkeleton titleWidth="w-24" action="w-28">
          <div className="space-y-6">
            <FieldSkeleton labelWidth="w-12" field="h-14" />
            <FieldSkeleton field="h-26" />
            <div className="space-y-3">
              <Skeleton className="mb-1 h-5 w-10" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <div className="flex flex-wrap gap-2">
                {["w-20", "w-24", "w-16", "w-28", "w-20", "w-24"].map((width, index) => (
                  <Skeleton key={index} className={`h-11 rounded-full sm:h-9 ${width}`} />
                ))}
              </div>
            </div>
            <div className="sm:max-w-xs">
              <FieldSkeleton labelWidth="w-20" />
            </div>
          </div>
        </SectionSkeleton>

        {/* Photo */}
        <SectionSkeleton titleWidth="w-20">
          <Skeleton className="h-72 w-full rounded-xl sm:aspect-[2/1] sm:h-auto" />
        </SectionSkeleton>

        {/* Time and servings */}
        <SectionSkeleton titleWidth="w-48">
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton labelWidth="w-20" />
          </div>
        </SectionSkeleton>

        {/* Ingredients: amount, unit, name, remove */}
        <SectionSkeleton titleWidth="w-32">
          <div className={`mb-2 hidden gap-2 sm:grid ${INGREDIENT_COLUMNS}`}>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-3 sm:space-y-2">
            {Array.from({ length: 4 }).map((_, row) => (
              <div
                key={row}
                className={`grid items-center gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0 ${INGREDIENT_COLUMNS}`}
              >
                <Skeleton className="h-13 rounded-xl" />
                <Skeleton className="h-13 rounded-xl" />
                <Skeleton className="col-span-3 row-start-2 h-13 rounded-xl sm:col-span-1 sm:col-start-3 sm:row-start-1" />
                {/* Remove: only shown on hover from sm up */}
                <Skeleton className="col-start-3 row-start-1 size-10 rounded-full sm:invisible sm:col-start-4" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-5 h-10 w-40 rounded-full" />
        </SectionSkeleton>

        {/* Method: step number, text, remove */}
        <SectionSkeleton titleWidth="w-24">
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.75rem] items-start gap-x-3"
              >
                <Skeleton className="mt-2 h-10 w-6 justify-self-end" />
                <Skeleton className="min-h-20 rounded-xl" />
                <Skeleton className="size-10 rounded-full sm:invisible" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-5 h-10 w-32 rounded-full" />
        </SectionSkeleton>

        {/* Nutrition: Calculate on the right, then the estimate */}
        <SectionSkeleton titleWidth="w-28" action="w-32">
          <Skeleton className="h-15 w-full" />
        </SectionSkeleton>

        {/* Visibility: one checkbox with its explanation */}
        <SectionSkeleton titleWidth="w-28">
          <div className="flex items-start gap-3">
            <Skeleton className="mt-0.5 size-5 shrink-0 rounded-[6px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="mt-1.5 h-4 w-80 max-w-full" />
            </div>
          </div>
        </SectionSkeleton>

        {/* Footer: "Required" on the left, Cancel and Save on the right */}
        <div className="flex items-center justify-between gap-3 pt-3 sm:pt-6">
          <Skeleton className="hidden h-5 w-20 sm:block" />
          <div className="flex flex-1 gap-3 sm:flex-none">
            <Skeleton className="h-12 flex-1 rounded-full sm:w-28 sm:flex-none" />
            <Skeleton className="h-12 flex-[2] rounded-full sm:w-40 sm:flex-none" />
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  );
}
