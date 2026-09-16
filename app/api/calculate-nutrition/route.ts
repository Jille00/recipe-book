import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";

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

const MAX_INGREDIENTS = 100;

// Shape of the request body - validated at runtime, since the TypeScript cast
// that used to describe it is erased and a null/garbage element crashed the
// formatting step with a 500.
const requestSchema = z.object({
  ingredients: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        amount: z.string().max(50).optional().nullable(),
        unit: z.string().max(50).optional().nullable(),
      })
    )
    .min(1, "At least one ingredient is required")
    .max(MAX_INGREDIENTS, `A recipe can have at most ${MAX_INGREDIENTS} ingredients`),
  servings: z.number().int().positive().max(1000),
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

    const limited = enforceRateLimit("ai:calculate-nutrition", session.user.id);
    if (limited) return limited;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ingredients, servings } = parsed.data;

    // Format ingredients for the prompt
    const formattedIngredients = ingredients
      .map((ing, index) => {
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
