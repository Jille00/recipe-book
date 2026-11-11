import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { CategoryPills } from "@/components/browse/category-pills";
import { PageHeader } from "@/components/page/page-header";
import { EmptyState } from "@/components/page/empty-state";
import { getTagsWithRecipeCount } from "@/lib/db/queries/tags";
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
        // Every category wears its own colour (STYLE_GUIDE 06).
        <CategoryPills tags={tags} />
      )}
    </div>
  );
}
