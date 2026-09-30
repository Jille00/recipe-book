import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { getAllTags, getTagsForRecipe } from "@/lib/db/queries/tags";
import { RecipeForm } from "@/components/recipe/recipe-form";
import { ArrowLeft } from "lucide-react";
import { recipePath } from "@/lib/recipe-url";

interface Props {
  params: Promise<{ slug: string }>;
}

// generateMetadata and the page run in the same request; Next only dedupes
// `fetch`, not Drizzle calls, so cache the reads ourselves.
const getSession = cache(async () => {
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
});

const getRecipe = cache(async (userId: string, slug: string) =>
  getRecipeBySlug(userId, slug)
);

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();

  if (!session?.user) {
    return { title: "Edit Recipe", robots: { index: false, follow: false } };
  }

  const recipe = await getRecipe(session.user.id, slug);

  if (!recipe) {
    return { title: "Recipe Not Found", robots: { index: false, follow: false } };
  }

  return {
    title: `Edit ${recipe.title}`,
    description: `Edit your ${recipe.title} recipe`,
    robots: { index: false, follow: false },
  };
}

export default async function EditRecipePage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/recipes/${slug}/edit`)}`);
  }

  const recipe = await getRecipe(session.user.id, slug);

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
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      <header className="mb-8 sm:mb-10">
        <Link
          href={recipePath(recipe)}
          className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to recipe
        </Link>
        <h1 className="text-4xl leading-[1.1] tracking-[-0.01em] text-foreground sm:text-[44px]">
          Edit recipe
        </h1>
        <p className="mt-2 truncate text-muted-foreground">{recipe.title}</p>
      </header>

      <RecipeForm tags={tags} initialData={initialData} tileSeed={recipe.code} />
    </div>
  );
}
