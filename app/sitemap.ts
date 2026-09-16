import { MetadataRoute } from "next";
import { getPublicRecipesForSitemap } from "@/lib/db/queries/recipes";
import { SITE_URL } from "./site-url";

// The sitemap has no dynamic API of its own, so without this it would be
// generated once per deploy and never pick up newly published recipes.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicRecipes = await getPublicRecipesForSitemap();

  const recipeUrls: MetadataRoute.Sitemap = publicRecipes.map((recipe) => ({
    url: `${SITE_URL}/r/${recipe.slug}`,
    lastModified: recipe.updatedAt || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Auth screens are intentionally left out: they carry no indexable content
  // and only compete with the pages we do want ranked.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  return [...staticPages, ...recipeUrls];
}
