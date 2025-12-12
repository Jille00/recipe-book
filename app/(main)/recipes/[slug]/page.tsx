import { notFound } from "next/navigation";
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

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { title: "Recipe - Kookboek" };
  }

  const recipe = await getRecipeBySlug(session.user.id, slug);

  if (!recipe) {
    return { title: "Recipe Not Found - Kookboek" };
  }

  return {
    title: `${recipe.title} - Kookboek`,
    description: recipe.description || `A delicious ${recipe.title} recipe`,
  };
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    notFound();
  }

  const recipe = await getRecipeBySlug(session.user.id, slug);

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
