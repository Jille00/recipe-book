import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { getTagBySlug, getPublicRecipesByTag } from "@/lib/db/queries/tags";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  if (!tag) {
    return { title: "Tag Not Found - Kookboek" };
  }

  return {
    title: `${tag.name} Recipes - Kookboek`,
    description: `Browse recipes tagged with ${tag.name}`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  if (!tag) {
    notFound();
  }

  const recipes = await getPublicRecipesByTag(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          All Tags
        </Link>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {tag.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Recipes tagged with {tag.name}
        </p>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              No recipes yet
            </h2>
            <p className="text-muted-foreground max-w-md">
              There are no public recipes with this tag yet. Be the first to
              share one!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} showAuthor />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
