import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/** A card header: a display title and a line of guidance. */
function HeaderSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <CardHeader className="gap-1.5">
      <Skeleton className={`h-7 ${titleWidth}`} />
      <Skeleton className="h-5 w-72 max-w-full" />
    </CardHeader>
  );
}

/** A form card: its fields (some with a hint line), then one button on the right. */
function FormCardSkeleton({ hints }: { hints: boolean[] }) {
  return (
    <Card>
      <HeaderSkeleton titleWidth="w-40" />
      <CardContent className="space-y-5">
        {hints.map((hint, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-13 w-full rounded-xl" />
            {hint && <Skeleton className="h-4 w-80 max-w-full" />}
          </div>
        ))}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-44 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Mirrors the account page: header, one card per setting, then the danger zone. */
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header: title, intro, link to the profile page */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-14 w-44 sm:h-20 sm:w-64" />
        <Skeleton className="mt-4 h-6 w-80 max-w-full" />
        <div className="mt-3 flex min-h-11 items-center">
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Email: one field with a hint */}
        <FormCardSkeleton hints={[true]} />
        {/* Password: current, new (with the rules), confirm */}
        <FormCardSkeleton hints={[false, true, false]} />

        {/* Devices and export: a line and a button */}
        {[0, 1].map((index) => (
          <Card key={index}>
            <HeaderSkeleton titleWidth="w-44" />
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-5 w-52 max-w-full" />
              <Skeleton className="h-12 w-48 shrink-0 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Danger zone */}
      <Card className="mt-12">
        <CardHeader className="gap-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-52 max-w-full" />
          <Skeleton className="h-12 w-44 shrink-0 rounded-full" />
        </CardContent>
      </Card>

      <span className="sr-only" role="status">
        Loading your account settings
      </span>
    </div>
  );
}
