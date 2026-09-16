import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { isFavorited } from "@/lib/db/queries/favorites";
import { getRecipeRatingStats, getUserRating } from "@/lib/db/queries/ratings";
import { getRecipeComments } from "@/lib/db/queries/comments";
import { RecipeDetail } from "@/components/recipe/recipe-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

// generateMetadata and the page render in the same request; Next only dedupes
// `fetch`, not Drizzle calls, so cache the reads ourselves.
const getSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});

const getRecipe = cache(async (userId: string, slug: string) =>
  getRecipeBySlug(userId, slug)
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const session = await getSession();

  // Personal recipe pages are never indexable.
  const privateRobots = { index: false, follow: false };

  if (!session?.user) {
    return { title: "Recipe", robots: privateRobots };
  }

  const recipe = await getRecipe(session.user.id, slug);

  if (!recipe) {
    return { title: "Recipe Not Found", robots: privateRobots };
  }

  const description = recipe.description || `A delicious ${recipe.title} recipe`;

  return {
    title: recipe.title,
    description,
    robots: privateRobots,
    // A public recipe lives at /r/{slug} too; point search engines there so the
    // same recipe is not split across two URLs.
    alternates: recipe.isPublic ? { canonical: `/r/${recipe.slug}` } : undefined,
    openGraph: {
      type: "article",
      url: `/r/${recipe.slug}`,
      siteName: "Kookboek",
      title: `${recipe.title} | Kookboek`,
      description,
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

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();

  if (!session?.user) {
    // Match every other protected page: prompt to sign in (and come back here)
    // rather than claiming the recipe does not exist.
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/recipes/${slug}`)}`
    );
  }

  const recipe = await getRecipe(session.user.id, slug);

  if (!recipe) {
    notFound();
  }

  const isOwner = recipe.userId === session.user.id;

  // Fetch all data in parallel
  const [favorited, ratingStats, userRating, commentsData] = await Promise.all([
    isFavorited(session.user.id, recipe.id),
    getRecipeRatingStats(recipe.id),
    getUserRating(session.user.id, recipe.id),
    getRecipeComments(recipe.id, { limit: 10, offset: 0 }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RecipeDetail
        recipe={recipe}
        isOwner={isOwner}
        initialFavorited={favorited}
        currentUserId={session.user.id}
        isAuthenticated={true}
        initialRatingStats={ratingStats}
        initialUserRating={userRating}
        initialComments={commentsData.comments}
        initialCommentTotal={commentsData.total}
      />
    </div>
  );
}
