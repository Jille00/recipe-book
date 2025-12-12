import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export const metadata = {
  title: "Dashboard - Recipe Book",
  description: "Manage your recipes and view your cooking statistics",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Welcome back! Here&apos;s an overview of your recipe collection.
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

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Total Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">
              0
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              recipes in your collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">
              0
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              recipes saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Categories Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">
              0
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              different categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Shared Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900 dark:text-white">
              0
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              public recipes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link
              href="/recipes/new"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-lg dark:bg-orange-900/30">
                ✏️
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Create New Recipe
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Add a new recipe to your collection
                </p>
              </div>
            </Link>
            <Link
              href="/recipes"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-lg dark:bg-orange-900/30">
                📚
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  View All Recipes
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Browse your recipe collection
                </p>
              </div>
            </Link>
            <Link
              href="/favorites"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-lg dark:bg-orange-900/30">
                ❤️
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Favorites
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  View your saved favorites
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-4">🍳</div>
              <p className="text-neutral-600 dark:text-neutral-400">
                No recipes yet
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                Create your first recipe to get started!
              </p>
              <Link href="/recipes/new" className="mt-4">
                <Button variant="outline" size="sm">
                  Create Recipe
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
