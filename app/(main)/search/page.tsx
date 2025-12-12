import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { searchRecipes, type SearchFilters } from "@/lib/db/queries/search";
import { getAllTags } from "@/lib/db/queries/tags";
import { Card, CardContent } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { SearchFiltersForm } from "@/components/search/search-filters";
import { Search, ChefHat } from "lucide-react";
import type { Difficulty } from "@/types/recipe";

export const metadata = {
  title: "Search Recipes - Kookboek",
  description:
    "Search and discover recipes by ingredients, tags, difficulty, and more",
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    tags?: string | string[];
    difficulty?: string;
    prepTime?: string;
    cookTime?: string;
    minServings?: string;
    maxServings?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Parse search params into filters
  const filters: SearchFilters = {
    query: params.q || undefined,
    tagIds: params.tags
      ? Array.isArray(params.tags)
        ? params.tags
        : [params.tags]
      : undefined,
    difficulty: (params.difficulty as Difficulty) || undefined,
    maxPrepTime: params.prepTime ? parseInt(params.prepTime) : undefined,
    maxCookTime: params.cookTime ? parseInt(params.cookTime) : undefined,
    minServings: params.minServings ? parseInt(params.minServings) : undefined,
    maxServings: params.maxServings ? parseInt(params.maxServings) : undefined,
  };

  // Fetch tags and recipes in parallel
  const [tags, recipes] = await Promise.all([
    getAllTags(),
    searchRecipes(filters, session?.user?.id),
  ]);

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Search Recipes
        </h1>
        <p className="mt-1 text-muted-foreground">
          {session?.user
            ? "Search your recipes and public community recipes"
            : "Discover delicious recipes from our community"}
        </p>
      </div>

      {/* Filters */}
      <SearchFiltersForm tags={tags} initialFilters={filters} />

      {/* Results */}
      <div className="mt-8">
        {hasFilters && (
          <p className="text-sm text-muted-foreground mb-6">
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
          </p>
        )}

        {recipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                {hasFilters ? (
                  <Search className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <ChefHat className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                {hasFilters ? "No recipes found" : "Start your search"}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {hasFilters
                  ? "Try adjusting your filters or search terms to find more recipes."
                  : "Use the search box and filters above to find recipes by name, ingredients, or other criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                showAuthor={!recipe.isOwn}
                href={
                  recipe.isOwn
                    ? `/recipes/${recipe.slug}`
                    : `/r/${recipe.shareToken}`
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
