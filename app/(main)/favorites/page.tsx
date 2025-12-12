import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button, Card, CardContent } from "@/components/ui";
import { Heart, BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserFavorites } from "@/lib/db/queries/favorites";
import { RecipeCard } from "@/components/recipe/recipe-card";

export const metadata = {
  title: "Favorites - Kookboek",
  description: "View your favorite recipes",
};

export default async function FavoritesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/sign-in");
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

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              No favorites yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Save your favorite recipes here for quick access. Click the heart
              icon on any recipe to add it to your favorites.
            </p>
            <Link href="/categories">
              <Button variant="outline">
                <BookOpen className="h-4 w-4" />
                Browse Recipes
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              showAuthor={recipe.userId !== session.user.id}
              initialFavorited={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
