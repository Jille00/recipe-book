import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

export const metadata = {
  title: "My Recipes - Recipe Book",
  description: "View and manage your recipe collection",
};

export default function RecipesPage() {
  // This will be replaced with actual data fetching
  const recipes: unknown[] = [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            My Recipes
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage and organize your recipe collection
          </p>
        </div>
        <Link href="/recipes/new">
          <Button>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Recipe
          </Button>
        </Link>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              No recipes yet
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
              Start building your collection by creating your first recipe. You
              can add ingredients, instructions, and photos.
            </p>
            <Link href="/recipes/new">
              <Button>Create Your First Recipe</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Recipe cards will go here */}
        </div>
      )}
    </div>
  );
}
