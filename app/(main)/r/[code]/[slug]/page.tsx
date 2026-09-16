import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRecipeByCode } from "@/lib/db/queries/recipes";
import { getRecipeRatingStats, getUserRating } from "@/lib/db/queries/ratings";
import { getRecipeComments } from "@/lib/db/queries/comments";
import { RecipeDetail } from "@/components/recipe/recipe-detail";
import { RecipeJsonLd } from "@/components/seo/recipe-json-ld";
import { recipePath } from "@/lib/recipe-url";
import { absoluteUrl } from "../../../../site-url";

interface Props {
  params: Promise<{ code: string; slug: string }>;
}

// generateMetadata and the page render in the same request, and Next only
// dedupes `fetch`, not Drizzle calls, so cache the reads ourselves.
const getSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});

const getRecipe = cache((code: string, viewerId: string | undefined) =>
  getRecipeByCode(code, viewerId)
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const session = await getSession();
  const recipe = await getRecipe(code, session?.user?.id);

  if (!recipe) {
    return { title: "Recipe Not Found", robots: { index: false, follow: false } };
  }

  const description = recipe.description || `A delicious ${recipe.title} recipe`;
  const path = recipePath(recipe);

  return {
    title: recipe.title,
    description,
    alternates: { canonical: path },
    // An unlisted recipe is reachable by anyone with its link but must never be
    // discoverable, so keep it out of search engines. Link previews (the Open
    // Graph tags below) still work, which is what makes sharing it pleasant.
    robots: recipe.isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      title: `${recipe.title} | Kookboek`,
      description,
      type: "article",
      siteName: "Kookboek",
      url: path,
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
  const { code, slug } = await params;
  const session = await getSession();
  const viewerId = session?.user?.id;

  const recipe = await getRecipe(code, viewerId);

  if (!recipe) {
    notFound();
  }

  // The code identifies the recipe; the slug is cosmetic. A renamed recipe, or
  // a link typed without its slug, lands on the current address.
  if (slug !== recipe.slug) {
    permanentRedirect(recipePath(recipe));
  }

  const isOwner = viewerId === recipe.userId;

  const [ratingStats, userRating, commentsData] = await Promise.all([
    getRecipeRatingStats(recipe.id),
    viewerId ? getUserRating(viewerId, recipe.id) : Promise.resolve(null),
    getRecipeComments(recipe.id, { limit: 10, offset: 0 }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Structured data only helps search engines, which never see unlisted recipes. */}
      {recipe.isPublic && (
        <RecipeJsonLd recipe={recipe} url={absoluteUrl(recipePath(recipe))} />
      )}
      <RecipeDetail
        recipe={recipe}
        isOwner={isOwner}
        initialFavorited={recipe.isFavorited}
        currentUserId={viewerId}
        isAuthenticated={!!session?.user}
        initialRatingStats={ratingStats}
        initialUserRating={userRating}
        initialComments={commentsData.comments}
        initialCommentTotal={commentsData.total}
      />
    </div>
  );
}
