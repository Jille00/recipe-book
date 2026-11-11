import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/** A labelled field: label, 52px field, and hint lines where the form has them. */
function FieldSkeleton({
  field = "h-13",
  hintLines = 0,
}: {
  field?: string;
  hintLines?: number;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-28" />
      <Skeleton className={`${field} w-full rounded-xl`} />
      {Array.from({ length: hintLines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-4 max-w-full ${index === hintLines - 1 && hintLines > 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Mirrors the profile page: header, "About you", "Measurement units", Save. */
export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header: title, intro, link to the account page */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-14 w-40 sm:h-20 sm:w-56" />
        <Skeleton className="mt-4 h-6 w-96 max-w-full" />
        <div className="mt-3 flex min-h-11 items-center">
          <Skeleton className="h-5 w-56" />
        </div>
      </div>

      <div className="space-y-6">
        {/* About you */}
        <Card>
          <CardHeader className="gap-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            {/* Display name, handle (with its hint), bio, location, website */}
            <FieldSkeleton />
            <FieldSkeleton hintLines={2} />
            <FieldSkeleton field="h-26" />
            <FieldSkeleton />
            <FieldSkeleton />
          </CardContent>
        </Card>

        {/* Measurement units */}
        <Card>
          <CardHeader className="gap-1.5">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-5 w-80 max-w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-[74px] w-full" />
              <Skeleton className="h-[74px] w-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading your profile
      </span>
    </div>
  );
}
