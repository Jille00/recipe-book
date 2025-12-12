import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { getRecipeByShareToken } from "@/lib/db/queries/recipes";
import { getRecipeRatingStats, getUserRating } from "@/lib/db/queries/ratings";
import { getRecipeComments } from "@/lib/db/queries/comments";
import { RecipeDetail } from "@/components/recipe/recipe-detail";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  const recipe = await getRecipeByShareToken(shareToken);

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

  const recipe = await getRecipeByShareToken(shareToken);

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
      {/* Simple header for public view */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.svg"
              alt="Kookboek"
              width={120}
              height={48}
              className="h-12 w-auto"
            />
          </Link>
        </div>
      </header>

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
