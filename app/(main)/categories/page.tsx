import Link from "next/link";
import { Card, CardContent } from "@/components/ui";

export const metadata = {
  title: "Categories - Recipe Book",
  description: "Browse recipes by category",
};

const categories = [
  { name: "Breakfast", slug: "breakfast", emoji: "🍳", description: "Start your day right" },
  { name: "Lunch", slug: "lunch", emoji: "🥗", description: "Midday meals" },
  { name: "Dinner", slug: "dinner", emoji: "🍽️", description: "Evening dishes" },
  { name: "Appetizers", slug: "appetizers", emoji: "🥟", description: "Small bites & starters" },
  { name: "Soups & Salads", slug: "soups-salads", emoji: "🥣", description: "Light & refreshing" },
  { name: "Main Courses", slug: "main-courses", emoji: "🍖", description: "Hearty main dishes" },
  { name: "Side Dishes", slug: "side-dishes", emoji: "🥔", description: "Perfect accompaniments" },
  { name: "Desserts", slug: "desserts", emoji: "🍰", description: "Sweet treats" },
  { name: "Snacks", slug: "snacks", emoji: "🍿", description: "Quick bites" },
  { name: "Beverages", slug: "beverages", emoji: "🍹", description: "Drinks & refreshments" },
  { name: "Baking", slug: "baking", emoji: "🥐", description: "Breads & pastries" },
];

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Categories
        </h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Browse recipes by category
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.slug} href={`/categories/${category.slug}`}>
            <Card className="h-full transition-all hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-3xl dark:bg-orange-900/30">
                  {category.emoji}
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">
                    {category.name}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {category.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
