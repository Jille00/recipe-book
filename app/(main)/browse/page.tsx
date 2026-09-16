import { headers } from "next/headers";
import { ChefHat } from "lucide-react";
import { Card, CardContent, Pagination } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { BrowseFilters } from "@/components/browse/browse-filters";
import { getAllTags } from "@/lib/db/queries/tags";
import { getPublicRecipes, type SearchFilters } from "@/lib/db/queries/search";
import { auth } from "@/lib/auth";
import { parsePaginationParam } from "@/lib/api-utils";
import { SITE_OG_IMAGE } from "../../site-url";
import type { Metadata } from "next";
import type { RecipeWithDetails } from "@/types/recipe";

const PAGE_SIZE = 12;
const MAX_PAGE = 1000;

const BROWSE_DESCRIPTION =
  "Browse and search through our collection of delicious recipes";

interface BrowseSearchParams {
  q?: string;
  tags?: string | string[];
  difficulty?: string;
  prepTime?: string;
  cookTime?: string;
  minServings?: string;
  maxServings?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<BrowseSearchParams>;
}

function parsePage(raw: string | undefined): number {
  return parsePaginationParam(raw ?? null, {
    fallback: 1,
    min: 1,
    max: MAX_PAGE,
  });
}

function hasActiveFilters(params: BrowseSearchParams): boolean {
  return Boolean(
    params.q ||
      params.tags ||
      params.difficulty ||
      params.prepTime ||
      params.cookTime ||
      params.minServings ||
      params.maxServings
  );
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const filtered = hasActiveFilters(params);

  const title = params.q
    ? `Search: ${params.q}`
    : page > 1
      ? `Browse Recipes - Page ${page}`
      : "Browse Recipes";

  // Filter permutations are endless; only the plain (and paginated) listing is
  // worth indexing, and each page canonicalises to its own URL.
  const canonical = page > 1 ? `/browse?page=${page}` : "/browse";

  return {
    title,
    description: BROWSE_DESCRIPTION,
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} | Kookboek`,
      description: BROWSE_DESCRIPTION,
      siteName: "Kookboek",
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Kookboek`,
      description: BROWSE_DESCRIPTION,
      images: [SITE_OG_IMAGE.url],
    },
  };
}

export default async function BrowsePage({ searchParams }: Props) {
  const params = await searchParams;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Parse search params ("?page=abc" and "?page=-3" both fall back to 1)
  const requestedPage = parsePage(params.page);

  // Build filters
  const filters: SearchFilters = {};

  if (params.q) {
    filters.query = params.q;
  }

  if (params.tags) {
    filters.tagIds = Array.isArray(params.tags) ? params.tags : [params.tags];
  }

  if (params.difficulty && ["easy", "medium", "hard"].includes(params.difficulty)) {
    filters.difficulty = params.difficulty as "easy" | "medium" | "hard";
  }

  if (params.prepTime) {
    const prepTime = parseInt(params.prepTime, 10);
    if (!isNaN(prepTime) && prepTime > 0) {
      filters.maxPrepTime = prepTime;
    }
  }

  if (params.cookTime) {
    const cookTime = parseInt(params.cookTime, 10);
    if (!isNaN(cookTime) && cookTime > 0) {
      filters.maxCookTime = cookTime;
    }
  }

  if (params.minServings) {
    const minServings = parseInt(params.minServings, 10);
    if (!isNaN(minServings) && minServings > 0) {
      filters.minServings = minServings;
    }
  }

  if (params.maxServings) {
    const maxServings = parseInt(params.maxServings, 10);
    if (!isNaN(maxServings) && maxServings > 0) {
      filters.maxServings = maxServings;
    }
  }

  // Fetch tags and recipes in parallel
  const [tags, firstResult] = await Promise.all([
    getAllTags(),
    getPublicRecipes(
      filters,
      PAGE_SIZE,
      (requestedPage - 1) * PAGE_SIZE,
      session?.user?.id
    ),
  ]);

  const { total } = firstResult;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // "?page=9999" would otherwise render an empty list next to a non-zero
  // result count; clamp to the last page that actually has results.
  const currentPage = Math.min(requestedPage, totalPages);
  const recipes =
    currentPage === requestedPage
      ? firstResult.recipes
      : (
          await getPublicRecipes(
            filters,
            PAGE_SIZE,
            (currentPage - 1) * PAGE_SIZE,
            session?.user?.id
          )
        ).recipes;

  // Convert search params to record for pagination
  const searchParamsRecord: Record<string, string | string[] | undefined> = {
    q: params.q,
    tags: params.tags,
    difficulty: params.difficulty,
    prepTime: params.prepTime,
    cookTime: params.cookTime,
    minServings: params.minServings,
    maxServings: params.maxServings,
  };

  // Map recipes to RecipeWithDetails
  const recipesWithDetails: RecipeWithDetails[] = recipes.map((recipe) => ({
    ...recipe,
    authorName: recipe.authorName,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Browse Recipes
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discover delicious recipes from our community
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <BrowseFilters tags={tags} initialFilters={filters} />
      </div>

      {/* Results */}
      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              No recipes found
            </h2>
            <p className="text-muted-foreground max-w-md">
              {Object.keys(filters).length > 0
                ? "Try adjusting your filters or search terms to find what you're looking for."
                : "There are no public recipes yet. Be the first to share one!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-6">
            {total} recipe{total !== 1 ? "s" : ""} found
            {currentPage > 1 && ` (page ${currentPage} of ${totalPages})`}
          </p>

          {/* Recipe grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipesWithDetails.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                showAuthor
                showFavorite
                initialFavorited={recipe.isFavorited}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl="/browse"
                searchParams={searchParamsRecord}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
