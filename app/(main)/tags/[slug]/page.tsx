import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChefHat } from "lucide-react";
import { Button, Card, CardContent, Pagination } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { auth } from "@/lib/auth";
import { getPublicRecipesByTag, getTagBySlug } from "@/lib/db/queries/tags";
import { parseBrowsePage, type RawParam } from "@/lib/browse-params";
import { tagPath } from "@/lib/tag-pages";
import { SITE_OG_IMAGE } from "../../../site-url";

const PAGE_SIZE = 12;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: RawParam }>;
}

// generateMetadata and the page render in the same request; Next only dedupes
// `fetch`, so cache the Drizzle reads ourselves.
const getSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});

const getTag = cache((slug: string) => getTagBySlug(slug.toLowerCase()));

const getRecipePage = cache(
  (tagId: string, page: number, viewerId: string | undefined) =>
    getPublicRecipesByTag(tagId, PAGE_SIZE, (page - 1) * PAGE_SIZE, viewerId)
);

function describeTag(name: string) {
  return `${name} recipes shared by the Kookboek community.`;
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const tag = await getTag(slug);
  if (!tag) notFound();

  const page = parseBrowsePage(rawPage);
  const session = await getSession();
  const { total } = await getRecipePage(tag.id, page, session?.user?.id);

  const title = page > 1 ? `${tag.name} Recipes - Page ${page}` : `${tag.name} Recipes`;
  const description = describeTag(tag.name);
  const canonical = tagPath(tag.slug, page);

  return {
    title,
    description,
    alternates: { canonical },
    // An empty category is a dead end; it stays out of the sitemap and index.
    robots: total === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} | Kookboek`,
      description,
      siteName: "Kookboek",
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Kookboek`,
      description,
      images: [SITE_OG_IMAGE.url],
    },
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const tag = await getTag(slug);
  if (!tag) notFound();

  const requestedPage = parseBrowsePage(rawPage);

  // "/tags/Dessert" finds the tag too, but only one address is canonical.
  if (slug !== tag.slug) redirect(tagPath(tag.slug, requestedPage));

  const session = await getSession();
  const viewerId = session?.user?.id;

  const firstResult = await getRecipePage(tag.id, requestedPage, viewerId);
  const { total } = firstResult;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Same clamp as /browse: a page past the end shows the last one.
  const currentPage = Math.min(requestedPage, totalPages);
  const recipes =
    currentPage === requestedPage
      ? firstResult.recipes
      : (await getRecipePage(tag.id, currentPage, viewerId)).recipes;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/tags"
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All categories
        </Link>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {tag.name}
        </h1>
        <p className="mt-1 text-muted-foreground">{describeTag(tag.name)}</p>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ChefHat className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              No recipes yet
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Nobody has shared a {tag.name.toLowerCase()} recipe yet. Have a
              look around the rest of the collection.
            </p>
            <Button asChild variant="outline">
              <Link href="/browse">Browse Recipes</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            {total} recipe{total !== 1 ? "s" : ""}
            {currentPage > 1 && ` (page ${currentPage} of ${totalPages})`}
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                showAuthor
                showFavorite={!!session?.user}
                initialFavorited={recipe.isFavorited}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl={tagPath(tag.slug)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
