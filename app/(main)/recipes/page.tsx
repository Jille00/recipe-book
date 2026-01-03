import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRecipesByUserId } from "@/lib/db/queries/recipes";
import { Button, Card, CardContent } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Plus, ChefHat } from "lucide-react";

export const metadata = {
  title: "My Recipes",
  description: "View and manage your recipe collection",
};

export default async function RecipesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  const recipes = await getRecipesByUserId(session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            My Recipes
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and organize your recipe collection
          </p>
        </div>
        <Link href="/recipes/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Recipe
          </Button>
        </Link>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              No recipes yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start building your collection by creating your first recipe. You
              can add ingredients, instructions, and photos.
            </p>
            <Link href="/recipes/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Your First Recipe
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
