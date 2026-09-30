import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, Card, CardContent } from "@/components/ui";
import { DelftTile } from "@/components/delft/delft-tile";

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
            <DelftTile
              seed="kookboek-404"
              tags={["drinks"]}
              className="size-28 rounded-[2px] shadow-soft"
            />

            <p className="mt-8 font-mono text-sm tabular text-muted-foreground">404</p>
            <h1 className="mt-2 font-display text-[2.25rem] leading-[1.1] tracking-[-0.01em] text-foreground">
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
