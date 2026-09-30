import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { DelftTile } from "@/components/delft/delft-tile";
import { PageHeader } from "@/components/page/page-header";
import { EmptyState } from "@/components/page/empty-state";
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

function recipeCountLabel(count: number) {
  return count === 1 ? "recipe" : "recipes";
}

export default async function TagsPage() {
  const tags = await getTagsWithRecipeCount();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader title="Categories" intro={CATEGORIES_DESCRIPTION} />

      {tags.length === 0 ? (
        <EmptyState
          seed="categories-empty"
          title="No categories yet"
          action={
            <Button asChild>
              <Link href="/browse">Browse recipes</Link>
            </Button>
          }
        >
          Categories appear here once recipes are tagged.
        </EmptyState>
      ) : (
        // A tile panel (STYLE_GUIDE 06): each category is its own tile, laid
        // edge to edge in rows like a Delft frieze, with its name below.
        <ul className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tags.map((tag) => {
            const tile = (
              <DelftTile
                seed={tag.slug}
                tags={[tag.slug]}
                className="aspect-square h-auto w-full"
              />
            );

            // An empty category stays on the panel, dimmed, but isn't a link
            // to a dead end.
            if (tag.recipeCount === 0) {
              return (
                <li key={tag.id}>
                  <div className="opacity-40">{tile}</div>
                  <p className="mt-3 truncate px-2 font-display text-lg leading-[1.3] text-muted-foreground">
                    {tag.name}
                  </p>
                  <p className="px-2 text-[13px] text-muted-foreground">
                    No recipes yet
                  </p>
                </li>
              );
            }

            return (
              <li key={tag.id}>
                <Link
                  href={tagPath(tag.slug)}
                  className="group block rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {/* The tile lifts off the wall on hover (STYLE_GUIDE 05). */}
                  <div className="relative transition-[translate,box-shadow] duration-(--duration-slow) ease-out group-hover:z-10 group-hover:-translate-y-1 group-hover:shadow-lifted">
                    {tile}
                  </div>
                  <p className="mt-3 truncate px-2 font-display text-lg leading-[1.3] text-foreground transition-colors duration-(--duration-fast) group-hover:text-primary">
                    {tag.name}
                  </p>
                  <p className="px-2 text-[13px] text-muted-foreground">
                    <span className="font-mono tabular">{tag.recipeCount}</span>{" "}
                    {recipeCountLabel(tag.recipeCount)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
