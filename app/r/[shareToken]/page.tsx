import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { getRecipeByShareToken } from "@/lib/db/queries/recipes";
import { RecipeDetail } from "@/components/recipe/recipe-detail";
import { ChefHat } from "lucide-react";

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
    <div className="min-h-screen bg-background grain">
      {/* Simple header for public view */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              Recipe Book
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <RecipeDetail recipe={recipe} isPublicView />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            Shared via{" "}
            <Link href="/" className="text-primary hover:text-primary/80 transition-colors">
              Recipe Book
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
