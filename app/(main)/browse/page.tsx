import { headers } from "next/headers";
import Link from "next/link";
import { Button, Pagination } from "@/components/ui";
import { PageHeader } from "@/components/page/page-header";
import { EmptyState } from "@/components/page/empty-state";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { BrowseFilters } from "@/components/browse/browse-filters";
import { CategoryChips } from "@/components/browse/category-chips";
import { getTagsWithRecipeCount } from "@/lib/db/queries/tags";
import { getPublicRecipes } from "@/lib/db/queries/search";
import { auth } from "@/lib/auth";
import {
  hasActiveBrowseFilters,
  parseBrowseFilters,
  parseBrowsePage,
  parseBrowseSort,
  type BrowseSearchParams,
} from "@/lib/browse-params";
import { SITE_OG_IMAGE } from "../../site-url";
import type { Metadata } from "next";
import type { RecipeCardData } from "@/types/recipe";
import { topCategories } from "@/lib/tag-pages";

const PAGE_SIZE = 12;
const CATEGORY_CHIP_COUNT = 8;

const BROWSE_DESCRIPTION =
  "Browse and search through our collection of delicious recipes";

interface Props {
  searchParams: Promise<BrowseSearchParams>;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = parseBrowsePage(params.page);
  const filtered = hasActiveBrowseFilters(params);
  const { query } = parseBrowseFilters(params);

  const title = query
    ? `Search: ${query}`
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
  const requestedPage = parseBrowsePage(params.page);

  const filters = parseBrowseFilters(params);
  const sort = parseBrowseSort(params.sort);

  // Fetch tags and recipes in parallel. The counted tags serve both the
  // filter list and the category shortcuts.
  const [tags, firstResult] = await Promise.all([
    getTagsWithRecipeCount(),
    getPublicRecipes(
      filters,
      PAGE_SIZE,
      (requestedPage - 1) * PAGE_SIZE,
      session?.user?.id,
      sort
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
            session?.user?.id,
            sort
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
    sort: params.sort,
  };

  const recipesWithDetails: RecipeCardData[] = recipes.map((recipe) => ({
    ...recipe,
    authorName: recipe.authorName,
  }));

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        title="Browse recipes"
        intro="Recipes shared by Kookboek cooks. Search by name or ingredient, or start from a category."
      />

      {/* Search first: it is the page's main control. Category shortcuts sit
          under it, and the result count shares a row with the sort order. */}
      <BrowseFilters
        tags={tags}
        initialFilters={filters}
        initialSort={sort}
        categories={
          <CategoryChips tags={topCategories(tags, CATEGORY_CHIP_COUNT)} />
        }
        summary={
          recipes.length > 0 && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-mono tabular text-foreground">{total}</span>{" "}
              {total === 1 ? "recipe" : "recipes"}
              {currentPage > 1 && (
                <>
                  {" · page "}
                  <span className="font-mono tabular">{currentPage}</span> of{" "}
                  <span className="font-mono tabular">{totalPages}</span>
                </>
              )}
            </p>
          )
        }
      />

      {/* Results */}
      <section aria-label="Results" className="mt-6">
        {recipes.length === 0 ? (
          <EmptyState
            seed="browse-empty"
            tags={["soups"]}
            title={hasFilters ? "No recipes match" : "No public recipes yet"}
            action={
              hasFilters ? (
                <Button asChild variant="outline">
                  <Link href="/browse">Clear search and filters</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/recipes/new">Add a recipe</Link>
                </Button>
              )
            }
          >
            {hasFilters
              ? "Try fewer filters or a different word. A single ingredient often finds more."
              : "Nobody has shared a recipe yet. Yours could be the first."}
          </EmptyState>
        ) : (
          <>
            {/* Recipe grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recipesWithDetails.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  showAuthor
                  showFavorite={!!session?.user}
                  initialFavorited={recipe.isFavorited}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10">
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
      </section>
    </div>
  );
}
