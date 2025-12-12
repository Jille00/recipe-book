import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { RecipeDetail } from "@/components/recipe/recipe-detail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { title: "Recipe - Recipe Book" };
  }

  const recipe = await getRecipeBySlug(session.user.id, slug);

  if (!recipe) {
    return { title: "Recipe Not Found - Recipe Book" };
  }

  return {
    title: `${recipe.title} - Recipe Book`,
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RecipeDetail recipe={recipe} isOwner={isOwner} />
    </div>
  );
}
