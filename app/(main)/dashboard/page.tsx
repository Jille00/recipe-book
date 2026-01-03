import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRecipesByUserId, getUserRecipeStats } from "@/lib/db/queries/recipes";
import { getFavoriteCount } from "@/lib/db/queries/favorites";
import { getUserTagCount } from "@/lib/db/queries/tags";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  Plus,
  BookOpen,
  Heart,
  FolderOpen,
  Share2,
  ChefHat,
  PenLine,
  Library,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Dashboard",
  description: "Manage your recipes and view your cooking statistics",
};

export default async function DashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch all data in parallel
  const [recipes, recipeStats, favoriteCount, tagCount] = await Promise.all([
    getRecipesByUserId(userId),
    getUserRecipeStats(userId),
    getFavoriteCount(userId),
    getUserTagCount(userId),
  ]);

  const recentRecipes = recipes.slice(0, 5);

  const stats = [
    {
      label: "Total Recipes",
      value: recipeStats?.totalRecipes || 0,
      description: "recipes in your collection",
      icon: BookOpen,
    },
    {
      label: "Favorites",
      value: favoriteCount,
      description: "recipes saved",
      icon: Heart,
    },
    {
      label: "Tags Used",
      value: tagCount,
      description: "different tags",
      icon: FolderOpen,
    },
    {
      label: "Shared Recipes",
      value: recipeStats?.publicRecipes || 0,
      description: "public recipes",
      icon: Share2,
    },
  ];

  const quickActions = [
    {
      title: "Create New Recipe",
      description: "Add a new recipe to your collection",
      href: "/recipes/new",
      icon: PenLine,
    },
    {
      title: "View All Recipes",
      description: "Browse your recipe collection",
      href: "/recipes",
      icon: Library,
    },
    {
      title: "Favorites",
      description: "View your saved favorites",
      href: "/favorites",
      icon: Heart,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back{session.user.name ? `, ${session.user.name}` : ""}! Here&apos;s an overview of your recipe collection.
          </p>
        </div>
        <Link href="/recipes/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Recipe
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/50 hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {action.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Recipes</CardTitle>
            {recipes.length > 0 && (
              <Link href="/recipes" className="text-sm text-primary hover:underline">
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recentRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <ChefHat className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">
                  No recipes yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first recipe to get started!
                </p>
                <Link href="/recipes/new" className="mt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                    Create Recipe
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/recipes/${recipe.slug}`}
                    className="group flex items-center gap-4 rounded-lg border border-border p-3 transition-all hover:border-primary/50 hover:bg-muted/50"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                      {recipe.imageUrl ? (
                        <Image
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ChefHat className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {recipe.title}
                      </p>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
