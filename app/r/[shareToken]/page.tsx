import { cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRecipeByShareToken, getPublicRecipeBySlug } from "@/lib/db/queries/recipes";
import { Header } from "@/components/layout/header";
import { getRecipeRatingStats, getUserRating } from "@/lib/db/queries/ratings";
import { getRecipeComments } from "@/lib/db/queries/comments";
import { RecipeDetail } from "@/components/recipe/recipe-detail";
import { RecipeJsonLd } from "@/components/seo/recipe-json-ld";
import { absoluteUrl } from "../../site-url";

interface Props {
  params: Promise<{ shareToken: string }>;
}

// generateMetadata and the page body both need the session and the recipe.
// Next only dedupes `fetch`, not Drizzle calls, so cache the reads here --
// without this a single view issued up to four queries.
const getSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});

const getSharedRecipe = cache(
  async (shareToken: string, currentUserId: string | undefined) => {
    // Try by share token first, then by slug for public recipes
    const byToken = await getRecipeByShareToken(shareToken, currentUserId);
    if (byToken) return byToken;
    return getPublicRecipeBySlug(shareToken, currentUserId);
  }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  const session = await getSession();
  const recipe = await getSharedRecipe(shareToken, session?.user?.id);

  if (!recipe) {
    return { title: "Recipe Not Found", robots: { index: false, follow: false } };
  }

  const description = recipe.description || `A delicious ${recipe.title} recipe`;
  // The route answers to both the slug and the private share token, so the
  // slug form is the one canonical URL for a public recipe.
  const canonicalPath = `/r/${recipe.slug}`;

  return {
    title: recipe.title,
    description,
    // Private recipes are only reachable with an unguessable token; keep them
    // out of the index entirely.
    alternates: recipe.isPublic ? { canonical: canonicalPath } : undefined,
    robots: recipe.isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      title: `${recipe.title} | Kookboek`,
      description,
      type: "article",
      siteName: "Kookboek",
      url: canonicalPath,
      images: recipe.imageUrl ? [{ url: recipe.imageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${recipe.title} | Kookboek`,
      description,
      images: recipe.imageUrl ? [recipe.imageUrl] : [],
    },
  };
}

export default async function SharedRecipePage({ params }: Props) {
  const { shareToken } = await params;
  const session = await getSession();

  const recipe = await getSharedRecipe(shareToken, session?.user?.id);

  if (!recipe) {
    notFound();
  }

  // Fetch ratings and comments data in parallel
  const [ratingStats, userRating, commentsData] = await Promise.all([
    getRecipeRatingStats(recipe.id),
    session?.user ? getUserRating(session.user.id, recipe.id) : Promise.resolve(null),
    getRecipeComments(recipe.id, { limit: 10, offset: 0 }),
  ]);

  // Always the canonical www URL, matching the <link rel="canonical"> above.
  const recipeUrl = absoluteUrl(
    recipe.isPublic ? `/r/${recipe.slug}` : `/r/${shareToken}`
  );

  return (
    <div className="flex min-h-screen flex-col bg-background grain">
      <RecipeJsonLd recipe={recipe} url={recipeUrl} />
      <Header initialUser={session?.user ?? null} />

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        <RecipeDetail
          recipe={recipe}
          isPublicView
          shareToken={shareToken}
          currentUserId={session?.user?.id}
          isAuthenticated={!!session?.user}
          initialRatingStats={ratingStats}
          initialUserRating={userRating}
          initialComments={commentsData.comments}
          initialCommentTotal={commentsData.total}
        />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border bg-card print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            Shared via{" "}
            <Link href="/" className="text-primary hover:text-primary/80 transition-colors">
              Kookboek
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
