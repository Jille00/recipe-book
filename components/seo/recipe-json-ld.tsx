import type { RecipeWithDetails } from "@/lib/db/queries/recipes";

interface RecipeJsonLdProps {
  recipe: RecipeWithDetails;
  url: string;
}

function formatDuration(minutes: number | null): string | undefined {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${mins}M`;
}

export function RecipeJsonLd({ recipe, url }: RecipeJsonLdProps) {
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
        }
      : undefined,
    datePublished: recipe.createdAt?.toISOString(),
    dateModified: recipe.updatedAt?.toISOString(),
    prepTime: formatDuration(recipe.prepTimeMinutes),
    cookTime: formatDuration(recipe.cookTimeMinutes),
    totalTime: totalTime > 0 ? formatDuration(totalTime) : undefined,
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    recipeIngredient: recipe.ingredients.map((ing) => {
      if (ing.amount && ing.unit) {
        return `${ing.amount} ${ing.unit} ${ing.text}`;
      }
      if (ing.amount) {
        return `${ing.amount} ${ing.text}`;
      }
      return ing.text;
    }),
    recipeInstructions: recipe.instructions
      .sort((a, b) => a.step - b.step)
      .map((inst) => ({
        "@type": "HowToStep",
        text: inst.text,
      })),
    nutrition: recipe.nutrition
      ? {
          "@type": "NutritionInformation",
          calories: recipe.nutrition.calories
            ? `${recipe.nutrition.calories} calories`
            : undefined,
          proteinContent: recipe.nutrition.protein
            ? `${recipe.nutrition.protein} g`
            : undefined,
          carbohydrateContent: recipe.nutrition.carbs
            ? `${recipe.nutrition.carbs} g`
            : undefined,
          fatContent: recipe.nutrition.fat
            ? `${recipe.nutrition.fat} g`
            : undefined,
          fiberContent: recipe.nutrition.fiber
            ? `${recipe.nutrition.fiber} g`
            : undefined,
          sugarContent: recipe.nutrition.sugar
            ? `${recipe.nutrition.sugar} g`
            : undefined,
        }
      : undefined,
    url,
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}
