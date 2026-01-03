import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { z } from "zod";

const nutritionSchema = z.object({
  nutrition: z.object({
    calories: z.number().nullable().describe("Calories per serving (kcal)"),
    protein: z.number().nullable().describe("Protein per serving (grams)"),
    carbs: z.number().nullable().describe("Carbohydrates per serving (grams)"),
    fat: z.number().nullable().describe("Total fat per serving (grams)"),
    fiber: z.number().nullable().describe("Fiber per serving (grams)"),
    sugar: z.number().nullable().describe("Sugar per serving (grams)"),
    confidence: z.enum(["high", "medium", "low"]).describe("Confidence level of the estimates"),
    warnings: z.array(z.string()).optional().describe("Any warnings about the calculation"),
  }),
});

const NUTRITION_PROMPT = `You are a nutrition expert. Calculate the estimated nutritional values for this recipe based on the provided ingredients.

**Instructions:**
1. For each ingredient, estimate its nutritional contribution based on standard USDA nutritional data
2. Sum all values and divide by the number of servings to get per-serving values
3. Round values appropriately: calories to whole numbers, macros to 1 decimal place
4. If an ingredient is vague (e.g., "salt to taste", "seasonings", "garnish"), exclude it from calculations but note in warnings
5. If an ingredient amount is unclear, make a reasonable assumption based on typical recipes

**Required nutrients (all per serving):**
- calories (kcal) - total energy
- protein (g) - total protein
- carbs (g) - total carbohydrates
- fat (g) - total fat
- fiber (g) - dietary fiber
- sugar (g) - total sugars

**Confidence levels:**
- "high": All ingredients are common, amounts are clear, calculation is straightforward
- "medium": Some assumptions made, or 1-2 uncommon ingredients
- "low": Multiple unclear ingredients or amounts, or very unusual ingredients

**Warnings to include:**
- Note any ingredients that couldn't be analyzed
- Note if you had to make significant assumptions
- Note if the recipe seems incomplete

Provide your best estimates. If you truly cannot determine a value, use null.`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ingredients, servings } = body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "At least one ingredient is required" },
        { status: 400 }
      );
    }

    if (!servings || typeof servings !== "number" || servings < 1) {
      return NextResponse.json(
        { error: "Servings must be a positive number" },
        { status: 400 }
      );
    }

    // Format ingredients for the prompt
    const formattedIngredients = ingredients
      .map((ing: { text: string; amount?: string; unit?: string }, index: number) => {
        const parts = [];
        if (ing.amount) parts.push(ing.amount);
        if (ing.unit) parts.push(ing.unit);
        parts.push(ing.text);
        return `${index + 1}. ${parts.join(" ")}`;
      })
      .join("\n");

    const result = await generateObject({
      model: 'google/gemini-3-flash',
      providerOptions: {
        gateway: {
          order: ['vertex'],
        },
      },
      schema: nutritionSchema,
      messages: [
        {
          role: "user",
          content: `${NUTRITION_PROMPT}

**Ingredients:**
${formattedIngredients}

**Servings:** ${servings}

Calculate the nutritional values per serving.`,
        },
      ],
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Nutrition calculation failed:", error);

    if (error instanceof Error && error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Service temporarily busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to calculate nutrition. Please try again." },
      { status: 500 }
    );
  }
}
