import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";

/** Mirrors the account page: header, then one card per setting. */
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <Skeleton className="h-5 w-56" />
      </div>

      <div className="space-y-6">
        {/* Email and password: forms */}
        {[1, 3].map((fields) => (
          <Card key={fields}>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-5">
              {Array.from({ length: fields }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
              <div className="flex justify-end">
                <Skeleton className="h-11 w-40 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Devices, export, delete: a line and a button */}
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-11 w-44 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading your account settings
      </span>
    </div>
  );
}
