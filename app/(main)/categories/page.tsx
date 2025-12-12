import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { ArrowRight, Tag } from "lucide-react";
import { getTagsWithRecipeCount } from "@/lib/db/queries/tags";

export const metadata = {
  title: "Browse by Tag - Recipe Book",
  description: "Browse recipes by tag",
};

export default async function CategoriesPage() {
  const tags = await getTagsWithRecipeCount();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Browse by Tag
        </h1>
        <p className="mt-1 text-muted-foreground">
          Find recipes by their tags
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tags.map((tag) => (
          <Link key={tag.slug} href={`/categories/${tag.slug}`}>
            <Card className="group h-full transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:bg-primary group-hover:scale-110">
                  <Tag className="h-7 w-7 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-foreground">
                    {tag.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {tag.recipeCount} recipe{tag.recipeCount !== 1 ? "s" : ""}
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
