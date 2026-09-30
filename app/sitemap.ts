import { MetadataRoute } from "next";
import { getPublicRecipesForSitemap } from "@/lib/db/queries/recipes";
import { getTagsWithRecipeCount } from "@/lib/db/queries/tags";
import { tagPath, tagsWithRecipes } from "@/lib/tag-pages";
import { SITE_URL } from "./site-url";
import { recipePath } from "@/lib/recipe-url";

// The sitemap has no dynamic API of its own, so without this it would be
// generated once per deploy and never pick up newly published recipes.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publicRecipes, tags] = await Promise.all([
    getPublicRecipesForSitemap(),
    getTagsWithRecipeCount(),
  ]);

  const recipeUrls: MetadataRoute.Sitemap = publicRecipes.map((recipe) => ({
    url: `${SITE_URL}${recipePath(recipe)}`,
    lastModified: recipe.updatedAt || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Only categories with a public recipe; an empty one is noindexed anyway.
  const tagUrls: MetadataRoute.Sitemap = tagsWithRecipes(tags).map((tag) => ({
    url: `${SITE_URL}${tagPath(tag.slug)}`,
    lastModified: tag.lastModified || new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
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
    {
      url: `${SITE_URL}/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  return [...staticPages, ...tagUrls, ...recipeUrls];
}
