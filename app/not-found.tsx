import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button, Card, CardContent } from "@/components/ui";
import { ChefHat, Home, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "We could not find that page. Head back to the kitchen and try again.",
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
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <ChefHat className="h-10 w-10 text-primary" />
            </div>

            <p className="font-display text-5xl font-semibold text-primary">
              404
            </p>
            <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
              This page isn&apos;t on the menu
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              We looked through every drawer and cupboard, but this recipe
              page has gone missing. It may have been removed, renamed, or it
              was never here at all.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/">
                <Button className="w-full sm:w-auto">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Search className="h-4 w-4" />
                  Browse Recipes
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
