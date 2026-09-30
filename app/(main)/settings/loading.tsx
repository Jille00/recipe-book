import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/** A card header: Gloock title and a line of guidance. */
function HeaderSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <CardHeader className="gap-1.5">
      <Skeleton className={`h-6 ${titleWidth}`} />
      <Skeleton className="h-4 w-72 max-w-full" />
    </CardHeader>
  );
}

/** Mirrors the account page: header, one card per setting, then the danger zone. */
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-10 w-40 sm:h-12" />
        <Skeleton className="mt-3 h-5 w-72 max-w-full" />
        <Skeleton className="mt-3 h-11 w-64 max-w-full" />
      </div>

      <div className="space-y-6">
        {/* Email and password: forms */}
        {[1, 3].map((fields) => (
          <Card key={fields}>
            <HeaderSkeleton titleWidth="w-40" />
            <CardContent className="space-y-5">
              {Array.from({ length: fields }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              ))}
              <div className="flex justify-end">
                <Skeleton className="h-11 w-40 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Devices and export: a line and a button */}
        {[0, 1].map((index) => (
          <Card key={index}>
            <HeaderSkeleton titleWidth="w-44" />
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-11 w-48 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Danger zone */}
      <Card className="mt-12">
        <CardHeader className="gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-11 w-40 rounded-md" />
        </CardContent>
      </Card>

      <span className="sr-only" role="status">
        Loading your account settings
      </span>
    </div>
  );
}
