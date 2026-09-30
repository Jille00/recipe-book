import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button, Card, CardContent } from "@/components/ui";
import { Heart, BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserFavorites } from "@/lib/db/queries/favorites";
import { FavoritesGrid } from "./favorites-grid";

export const metadata: Metadata = {
  title: "Favorites",
  description: "View your favorite recipes",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/favorites")}`);
  }

  const favorites = await getUserFavorites(session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Favorites
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your saved favorite recipes
        </p>
      </div>

      <FavoritesGrid
        recipes={favorites}
        currentUserId={session.user.id}
        emptyState={
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Heart className="h-10 w-10 text-primary" aria-hidden="true" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                No favorites yet
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Save your favorite recipes here for quick access. Click the heart
                icon on any recipe to add it to your favorites.
              </p>
              <Button asChild variant="outline">
                <Link href="/browse">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Browse Recipes
                </Link>
              </Button>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
