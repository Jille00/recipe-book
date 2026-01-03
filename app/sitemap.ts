import { MetadataRoute } from "next";
import { getPublicRecipesForSitemap } from "@/lib/db/queries/recipes";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.kookboek.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicRecipes = await getPublicRecipesForSitemap();

  const recipeUrls: MetadataRoute.Sitemap = publicRecipes.map((recipe) => ({
    url: `${siteUrl}/r/${recipe.slug}`,
    lastModified: recipe.updatedAt || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  return [...staticPages, ...recipeUrls];
}
