import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRecipesByUserId, getUserRecipeStats } from "@/lib/db/queries/recipes";
import { getFavoriteCount } from "@/lib/db/queries/favorites";
import { getUserTagCount } from "@/lib/db/queries/tags";
import { recipePath } from "@/lib/recipe-url";
import { formatMinutes } from "@/lib/utils/format-time";
import { Button, Card, CardHeader, CardContent } from "@/components/ui";
import { ColourSwatch } from "@/components/recipe/recipe-colour";
import {
  Plus,
  BookOpen,
  Heart,
  Tags,
  Globe,
  Library,
  FolderOpen,
  ShoppingBasket,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your recipes, favorites and shortcuts in one place",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/dashboard")}`);
  }

  const userId = session.user.id;

  // Fetch all data in parallel
  const [recipes, recipeStats, favoriteCount, tagCount] = await Promise.all([
    // Only the ones shown; the totals come from getUserRecipeStats.
    getRecipesByUserId(userId, 5),
    getUserRecipeStats(userId),
    getFavoriteCount(userId),
    getUserTagCount(userId),
  ]);

  const stats = [
    {
      label: "Recipes",
      value: recipeStats?.totalRecipes || 0,
      description: "in your cookbook",
      icon: BookOpen,
    },
    {
      label: "Public",
      value: recipeStats?.publicRecipes || 0,
      description: "anyone can find",
      icon: Globe,
    },
    {
      label: "Favorites",
      value: favoriteCount,
      description: "saved to cook again",
      icon: Heart,
    },
    {
      label: "Tags",
      value: tagCount,
      description: "used on your recipes",
      icon: Tags,
    },
  ];

  const quickActions = [
    { title: "My recipes", href: "/recipes", icon: Library },
    { title: "Favorites", href: "/favorites", icon: Heart },
    { title: "Collections", href: "/collections", icon: FolderOpen },
    { title: "Shopping list", href: "/shopping-list", icon: ShoppingBasket },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-6xl leading-[0.88] text-foreground sm:text-7xl lg:text-8xl">
            Dashboard
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Welcome back{session.user.name ? `, ${session.user.name}` : ""}. Here&apos;s your cookbook at a glance.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/recipes/new">
            <Plus aria-hidden="true" />
            Add a recipe
          </Link>
        </Button>
      </div>

      {/* Stats: quiet cards, numbers in tabular figures */}
      <dl className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl bg-card p-5">
            <dt className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <stat.icon className="size-[18px]" aria-hidden="true" />
              {stat.label}
            </dt>
            <dd className="mt-3 font-display text-5xl leading-none tabular text-foreground">
              {stat.value}
            </dd>
            <dd className="mt-1 text-sm text-muted-foreground">{stat.description}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-4xl leading-[0.95]">Recent recipes</h2>
            {recipes.length > 0 && (
              <Link
                href="/recipes"
                className="inline-flex min-h-11 items-center font-bold text-foreground underline decoration-2 underline-offset-4 hover:decoration-[3px] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recipes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <ColourSwatch seed="kookboek-empty-dashboard" tags={["dinner"]} className="h-28 w-24 rounded-2xl" />
                <h3 className="mt-6 text-3xl text-foreground">No recipes yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first one and it gets its own colour.
                </p>
                <Button asChild variant="outline" className="mt-5">
                  <Link href="/recipes/new">
                    <Plus aria-hidden="true" />
                    Add a recipe
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="-mx-2 divide-y divide-border">
                {recipes.map((recipe) => {
                  const totalMinutes = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
                  return (
                    <li key={recipe.id}>
                      <Link
                        href={recipePath(recipe)}
                        className="group flex items-center gap-4 rounded-xl px-2 py-3 transition-colors duration-150 hover:bg-accent"
                      >
                        <div className="relative size-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          {recipe.imageUrl ? (
                            <Image
                              src={recipe.imageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <ColourSwatch seed={recipe.code} tags={recipe.tags} colour={recipe.colour} className="size-full rounded-none" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">
                            {recipe.title}
                          </p>
                          {recipe.description && (
                            <p className="truncate text-sm text-muted-foreground">
                              {recipe.description}
                            </p>
                          )}
                        </div>
                        {totalMinutes > 0 && (
                          <span className="hidden flex-shrink-0 text-sm font-bold tabular text-muted-foreground sm:inline">
                            {formatMinutes(totalMinutes)}
                          </span>
                        )}
                        <ChevronRight className="size-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <h2 className="text-4xl leading-[0.95]">Go to</h2>
          </CardHeader>
          <CardContent>
            <nav aria-label="Quick links" className="grid gap-2">
              {quickActions.map((action) => (
                <Button key={action.href} asChild variant="outline" className="justify-start">
                  <Link href={action.href}>
                    <action.icon aria-hidden="true" />
                    {action.title}
                  </Link>
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
