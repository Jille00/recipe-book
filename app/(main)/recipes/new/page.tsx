import { RecipeForm } from "@/components/recipe/recipe-form";
import { getAllCategories } from "@/lib/db/queries/categories";

export const metadata = {
  title: "Create Recipe - Recipe Book",
  description: "Add a new recipe to your collection",
};

export default async function NewRecipePage() {
  const categories = await getAllCategories();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Create New Recipe
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Add a new recipe to your collection. Fill in the details below.
        </p>
      </div>

      <RecipeForm categories={categories} />
    </div>
  );
}
