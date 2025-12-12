import { RecipeForm } from "@/components/recipe/recipe-form";

export const metadata = {
  title: "Create Recipe - Recipe Book",
  description: "Add a new recipe to your collection",
};

// For now, hardcode categories until API is connected
const categories = [
  { id: "1", name: "Breakfast", slug: "breakfast", description: null, created_at: "" },
  { id: "2", name: "Lunch", slug: "lunch", description: null, created_at: "" },
  { id: "3", name: "Dinner", slug: "dinner", description: null, created_at: "" },
  { id: "4", name: "Appetizers", slug: "appetizers", description: null, created_at: "" },
  { id: "5", name: "Soups & Salads", slug: "soups-salads", description: null, created_at: "" },
  { id: "6", name: "Main Courses", slug: "main-courses", description: null, created_at: "" },
  { id: "7", name: "Side Dishes", slug: "side-dishes", description: null, created_at: "" },
  { id: "8", name: "Desserts", slug: "desserts", description: null, created_at: "" },
  { id: "9", name: "Snacks", slug: "snacks", description: null, created_at: "" },
  { id: "10", name: "Beverages", slug: "beverages", description: null, created_at: "" },
  { id: "11", name: "Baking", slug: "baking", description: null, created_at: "" },
];

export default function NewRecipePage() {
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
