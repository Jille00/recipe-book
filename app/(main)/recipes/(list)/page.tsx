import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRecipesByUserId } from "@/lib/db/queries/recipes";
import { Button } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { PageHeader } from "@/components/page/page-header";
import { EmptyState } from "@/components/page/empty-state";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "My recipes",
  description: "View and manage your recipe collection",
  robots: { index: false, follow: false },
};

export default async function RecipesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/recipes")}`);
  }

  const recipes = await getRecipesByUserId(session.user.id);

  const addRecipe = (
    <Button asChild>
      <Link href="/recipes/new">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add a recipe
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        title="My recipes"
        intro={
          recipes.length === 0 ? (
            "Everything you cook, kept in one place."
          ) : (
            <>
              <span className="font-mono tabular text-foreground">
                {recipes.length}
              </span>{" "}
              {recipes.length === 1 ? "recipe" : "recipes"} in your cookbook.
            </>
          )
        }
        // The empty state carries the one orange action instead.
        action={recipes.length > 0 ? addRecipe : undefined}
      />

      {recipes.length === 0 ? (
        <EmptyState
          seed="my-recipes-empty"
          tags={["baking"]}
          title="No recipes yet"
          action={addRecipe}
        >
          Add your first recipe with its ingredients, steps and a photo, or
          import one from a link.
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
