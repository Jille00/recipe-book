"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, Card, CardContent } from "@/components/ui";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
      >
        <Card className="w-full max-w-xl">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive dark:bg-destructive/15">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>

            <h1 className="mt-6 font-display text-[2.25rem] leading-[1.1] tracking-[-0.01em] text-foreground">
              Something boiled over
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              An unexpected error stopped this page from loading. Trying again
              usually fixes it.
            </p>

            {error.digest && (
              <p className="mt-4 font-mono text-xs tabular text-muted-foreground">
                Reference: {error.digest}
              </p>
            )}

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button onClick={reset}>
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
