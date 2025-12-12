import Link from "next/link";
import { RecipeForm } from "@/components/recipe/recipe-form";
import { getAllCategories } from "@/lib/db/queries/categories";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Create Recipe - Recipe Book",
  description: "Add a new recipe to your collection",
};

export default async function NewRecipePage() {
  const categories = await getAllCategories();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to recipes
        </Link>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Create New Recipe
        </h1>
        <p className="mt-2 text-muted-foreground">
          Add a new recipe to your collection. Fill in the details below.
        </p>
      </div>

      <RecipeForm categories={categories} />
    </div>
  );
}
