import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import {
  ArrowRight,
  Coffee,
  Salad,
  UtensilsCrossed,
  Cookie,
  Soup,
  Beef,
  Carrot,
  Cake,
  Popcorn,
  Wine,
  Croissant,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "Categories - Recipe Book",
  description: "Browse recipes by category",
};

interface Category {
  name: string;
  slug: string;
  icon: LucideIcon;
  description: string;
}

const categories: Category[] = [
  { name: "Breakfast", slug: "breakfast", icon: Coffee, description: "Start your day right" },
  { name: "Lunch", slug: "lunch", icon: Salad, description: "Midday meals" },
  { name: "Dinner", slug: "dinner", icon: UtensilsCrossed, description: "Evening dishes" },
  { name: "Appetizers", slug: "appetizers", icon: Cookie, description: "Small bites & starters" },
  { name: "Soups & Salads", slug: "soups-salads", icon: Soup, description: "Light & refreshing" },
  { name: "Main Courses", slug: "main-courses", icon: Beef, description: "Hearty main dishes" },
  { name: "Side Dishes", slug: "side-dishes", icon: Carrot, description: "Perfect accompaniments" },
  { name: "Desserts", slug: "desserts", icon: Cake, description: "Sweet treats" },
  { name: "Snacks", slug: "snacks", icon: Popcorn, description: "Quick bites" },
  { name: "Beverages", slug: "beverages", icon: Wine, description: "Drinks & refreshments" },
  { name: "Baking", slug: "baking", icon: Croissant, description: "Breads & pastries" },
];

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Categories
        </h1>
        <p className="mt-1 text-muted-foreground">
          Browse recipes by category
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.slug} href={`/categories/${category.slug}`}>
            <Card className="group h-full transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:bg-primary group-hover:scale-110">
                  <category.icon className="h-7 w-7 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-foreground">
                    {category.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
