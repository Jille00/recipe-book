import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getRecipeByShareToken } from "@/lib/db/queries/recipes";
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
    title: `${recipe.title} - Recipe Book`,
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
  const recipe = await getRecipeByShareToken(shareToken);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Simple header for public view */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <span className="text-xl font-bold text-neutral-900 dark:text-white">
              Recipe Book
            </span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <RecipeDetail recipe={recipe} isPublicView />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-neutral-500">
            Shared via{" "}
            <a href="/" className="text-orange-600 hover:text-orange-700">
              Recipe Book
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
