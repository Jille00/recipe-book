import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, Card, CardContent } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found",
  description: "We couldn't find that page.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
      >
        <Card className="w-full max-w-xl">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <p className="font-display text-[9rem] leading-[0.8] tabular text-foreground" aria-hidden="true">
              404
            </p>
            <h1 className="mt-6 font-display text-5xl leading-[0.92] text-foreground text-balance sm:text-6xl">
              This page isn&apos;t on the menu
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              We checked every cupboard. The link may be old, or the recipe
              was moved or made private.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/browse">Browse recipes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
