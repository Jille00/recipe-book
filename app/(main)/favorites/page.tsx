import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

export const metadata = {
  title: "Favorites - Recipe Book",
  description: "View your favorite recipes",
};

export default function FavoritesPage() {
  // This will be replaced with actual data fetching
  const favorites: unknown[] = [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Favorites
        </h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Your saved favorite recipes
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">❤️</div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              No favorites yet
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
              Save your favorite recipes here for quick access. Click the heart
              icon on any recipe to add it to your favorites.
            </p>
            <Link href="/categories">
              <Button variant="outline">Browse Recipes</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Favorite recipe cards will go here */}
        </div>
      )}
    </div>
  );
}
