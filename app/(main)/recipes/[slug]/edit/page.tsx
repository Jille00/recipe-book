import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { getAllTags, getTagsForRecipe } from "@/lib/db/queries/tags";
import { RecipeForm } from "@/components/recipe/recipe-form";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return { title: "Edit Recipe - Kookboek" };
  }

  const recipe = await getRecipeBySlug(session.user.id, slug);

  if (!recipe) {
    return { title: "Recipe Not Found - Kookboek" };
  }

  return {
    title: `Edit ${recipe.title} - Kookboek`,
    description: `Edit your ${recipe.title} recipe`,
  };
}

export default async function EditRecipePage({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  const recipe = await getRecipeBySlug(session.user.id, slug);

  if (!recipe) {
    notFound();
  }

  // Only the owner can edit their recipe
  if (recipe.userId !== session.user.id) {
    notFound();
  }

  const [tags, recipeTags] = await Promise.all([
    getAllTags(),
    getTagsForRecipe(recipe.id),
  ]);

  // Transform recipe data to match RecipeForm's initialData format
  const initialData = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || "",
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prep_time_minutes: recipe.prepTimeMinutes,
    cook_time_minutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    image_url: recipe.imageUrl,
    nutrition: recipe.nutrition,
    tag_ids: recipeTags.map((t) => t.id),
    is_public: recipe.isPublic ?? false,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href={`/recipes/${recipe.slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to recipe
        </Link>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Edit Recipe
        </h1>
        <p className="mt-2 text-muted-foreground">
          Make changes to your recipe below.
        </p>
      </div>

      <RecipeForm tags={tags} initialData={initialData} />
    </div>
  );
}
