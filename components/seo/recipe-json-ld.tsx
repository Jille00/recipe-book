import type { RecipeWithDetails } from "@/lib/db/queries/recipes";
import type { RatingStats } from "@/lib/db/queries/ratings";
import { absoluteUrl } from "@/app/site-url";
import { profilePath } from "@/lib/handle";

interface RecipeJsonLdProps {
  recipe: RecipeWithDetails;
  url: string;
  /** Already loaded by the recipe page; only emitted once someone has rated. */
  ratingStats?: RatingStats;
  /** Tag names, emitted as keywords and categories. */
  tags?: string[];
}

function formatDuration(minutes: number | null): string | undefined {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${mins}M`;
}

export function RecipeJsonLd({
  recipe,
  url,
  ratingStats,
  tags = [],
}: RecipeJsonLdProps) {
  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description || `A delicious ${recipe.title} recipe`,
    image: recipe.imageUrl ? [recipe.imageUrl] : undefined,
    author: recipe.authorName
      ? {
          "@type": "Person",
          name: recipe.authorName,
          // The public profile, when the author has one (undefined is dropped).
          url: recipe.authorHandle
            ? absoluteUrl(profilePath(recipe.authorHandle))
            : undefined,
        }
      : undefined,
    datePublished: recipe.createdAt?.toISOString(),
    dateModified: recipe.updatedAt?.toISOString(),
    prepTime: formatDuration(recipe.prepTimeMinutes),
    cookTime: formatDuration(recipe.cookTimeMinutes),
    totalTime: totalTime > 0 ? formatDuration(totalTime) : undefined,
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    keywords: tags.length > 0 ? tags.join(", ") : undefined,
    recipeCategory: tags.length > 0 ? tags : undefined,
    recipeIngredient: recipe.ingredients.map((ing) => {
      if (ing.amount && ing.unit) {
        return `${ing.amount} ${ing.unit} ${ing.text}`;
      }
      if (ing.amount) {
        return `${ing.amount} ${ing.text}`;
      }
      return ing.text;
    }),
    recipeInstructions: [...recipe.instructions]
      .sort((a, b) => a.step - b.step)
      .map((inst) => ({
        "@type": "HowToStep",
        text: inst.text,
      })),
    nutrition: recipe.nutrition
      ? {
          "@type": "NutritionInformation",
          calories: recipe.nutrition.calories != null
            ? `${recipe.nutrition.calories} calories`
            : undefined,
          proteinContent: recipe.nutrition.protein != null
            ? `${recipe.nutrition.protein} g`
            : undefined,
          carbohydrateContent: recipe.nutrition.carbs != null
            ? `${recipe.nutrition.carbs} g`
            : undefined,
          fatContent: recipe.nutrition.fat != null
            ? `${recipe.nutrition.fat} g`
            : undefined,
          fiberContent: recipe.nutrition.fiber != null
            ? `${recipe.nutrition.fiber} g`
            : undefined,
          sugarContent: recipe.nutrition.sugar != null
            ? `${recipe.nutrition.sugar} g`
            : undefined,
        }
      : undefined,
    // Google rejects an aggregateRating with no ratings, so leave it out then.
    aggregateRating:
      ratingStats && ratingStats.totalRatings > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(ratingStats.averageRating.toFixed(1)),
            ratingCount: ratingStats.totalRatings,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
    />
  );
}

/**
 * JSON for inside a <script> tag. JSON.stringify leaves "<" alone, so a recipe
 * titled "</script><img onerror=...>" would close the tag and run as HTML for
 * every visitor. Escaping <, > and & as unicode keeps the JSON identical once
 * parsed; U+2028/U+2029 are escaped because older parsers treat them as line
 * breaks. Undefined values are dropped, as JSON.stringify always does.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
