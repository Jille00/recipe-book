"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, Card, CardContent } from "@/components/ui";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

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
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>

            <h1 className="font-display text-2xl font-semibold text-foreground">
              Something boiled over
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              An unexpected error stopped this page from loading. Give it
              another try — most of the time that is all it takes.
            </p>

            {error.digest && (
              <p className="mt-4 font-mono text-xs text-muted-foreground/70">
                Reference: {error.digest}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={reset} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
