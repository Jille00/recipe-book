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

interface Props {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  // Try by share token first, then by slug for public recipes
  let recipe = await getRecipeByShareToken(shareToken);
  if (!recipe) {
    recipe = await getPublicRecipeBySlug(shareToken);
  }

  if (!recipe) {
    return { title: "Recipe Not Found" };
  }

  return {
    title: `${recipe.title} - Kookboek`,
    description: recipe.description || `A delicious ${recipe.title} recipe`,
    openGraph: {
      title: recipe.title,
      description: recipe.description || `A delicious ${recipe.title} recipe`,
      type: "article",
      images: recipe.imageUrl ? [{ url: recipe.imageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: recipe.title,
      description: recipe.description || `A delicious ${recipe.title} recipe`,
      images: recipe.imageUrl ? [recipe.imageUrl] : [],
    },
  };
}

export default async function SharedRecipePage({ params }: Props) {
  const { shareToken } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Try by share token first, then by slug for public recipes
  let recipe = await getRecipeByShareToken(shareToken, session?.user?.id);
  if (!recipe) {
    recipe = await getPublicRecipeBySlug(shareToken, session?.user?.id);
  }

  if (!recipe) {
    notFound();
  }

  // Fetch ratings and comments data in parallel
  const [ratingStats, userRating, commentsData] = await Promise.all([
    getRecipeRatingStats(recipe.id),
    session?.user ? getUserRating(session.user.id, recipe.id) : Promise.resolve(null),
    getRecipeComments(recipe.id, { limit: 10, offset: 0 }),
  ]);

  return (
    <div className="min-h-screen bg-background grain">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <RecipeDetail
          recipe={recipe}
          isPublicView
          currentUserId={session?.user?.id}
          isAuthenticated={!!session?.user}
          initialRatingStats={ratingStats}
          initialUserRating={userRating}
          initialComments={commentsData.comments}
          initialCommentTotal={commentsData.total}
        />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border bg-card">
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
