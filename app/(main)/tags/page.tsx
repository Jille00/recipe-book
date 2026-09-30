import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { getTagsWithRecipeCount } from "@/lib/db/queries/tags";
import { tagPath } from "@/lib/tag-pages";
import { SITE_OG_IMAGE } from "../../site-url";

const CATEGORIES_DESCRIPTION =
  "Explore recipes by category, from quick breakfasts to slow-cooked dinners.";

export const metadata: Metadata = {
  title: "Categories",
  description: CATEGORIES_DESCRIPTION,
  alternates: { canonical: "/tags" },
  openGraph: {
    type: "website",
    url: "/tags",
    title: "Categories | Kookboek",
    description: CATEGORIES_DESCRIPTION,
    siteName: "Kookboek",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Categories | Kookboek",
    description: CATEGORIES_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
};

export default async function TagsPage() {
  const tags = await getTagsWithRecipeCount();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Categories
        </h1>
        <p className="mt-1 text-muted-foreground">{CATEGORIES_DESCRIPTION}</p>
      </div>

      {tags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              No categories yet
            </h2>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tags.map((tag) => {
            const count = `${tag.recipeCount} recipe${tag.recipeCount !== 1 ? "s" : ""}`;

            // An empty category stays listed but isn't a link to a dead end.
            if (tag.recipeCount === 0) {
              return (
                <li
                  key={tag.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-medium text-muted-foreground">
                      {tag.name}
                    </p>
                    <p className="text-sm text-muted-foreground">No recipes yet</p>
                  </div>
                </li>
              );
            }

            return (
              <li key={tag.id}>
                {/* STYLE_GUIDE 04/05 card: soft shadow, lift on hover. */}
                <Link
                  href={tagPath(tag.slug)}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 transition-transform duration-300 ease-out group-hover:scale-110">
                    <FolderOpen className="h-5 w-5 text-sage-700" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-medium text-foreground transition-colors group-hover:text-primary">
                      {tag.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{count}</p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
