import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { z } from "zod";

const extractedRecipeSchema = z.object({
  recipe: z.object({
    title: z.string().describe("The recipe title"),
    description: z.string().optional().describe("Brief description of the dish"),
    ingredients: z
      .array(
        z.object({
          text: z
            .string()
            .describe("The ingredient name with any preparation notes"),
          amount: z.string().optional().describe("Numeric quantity as a string"),
          unit: z.string().optional().describe("Unit of measurement"),
        })
      )
      .describe("List of ingredients"),
    instructions: z
      .array(
        z.object({
          step: z.number().describe("Step number starting from 1"),
          text: z.string().describe("The instruction text"),
        })
      )
      .describe("Cooking instructions in order"),
    prepTimeMinutes: z
      .number()
      .optional()
      .describe("Preparation time in minutes"),
    cookTimeMinutes: z.number().optional().describe("Cooking time in minutes"),
    servings: z.number().optional().describe("Number of servings"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    suggestedCategory: z
      .string()
      .optional()
      .describe("Suggested category like Dessert, Main Course, etc."),
  }),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string()).optional(),
});

const TEXT_EXTRACTION_PROMPT = `Extract the recipe information from this text. The text may be copied from a recipe website, cookbook, or other source.

**IMPORTANT**: If the recipe is in a language other than English, translate ALL text to English while preserving the original recipe name in parentheses if it's a well-known dish name (e.g., "Beef Bourguignon (Boeuf Bourguignon)").

Please extract ALL available information following these guidelines:

**Title**: Extract the recipe name

**Description**: Brief description if available, or generate a one-sentence summary

**Ingredients**: For each ingredient:
- "text": The ingredient name with any preparation notes (e.g., "all-purpose flour, sifted")
- "amount": Just the numeric value as a string (e.g., "2", "1/2", "1.5")
- "unit": Use standard abbreviations from this list ONLY:
  Volume (Imperial): tsp, tbsp, fl oz, cup, pint, quart, gallon
  Volume (Metric): ml, cl, dl, l
  Weight (Imperial): oz, lb
  Weight (Metric): mg, g, kg
  Common: piece, slice, clove, sprig, bunch, pinch, dash, to taste
  Leave empty for items measured by count (e.g., "2 eggs")

**Instructions**: Number each step starting from 1. Keep the original wording but ensure each step is clear and complete.

**Times**: Convert all times to minutes (e.g., "1 hour 30 minutes" = 90)

**Servings**: Extract as a number

**Difficulty**: Assess based on technique complexity:
- "easy": Basic techniques, few steps
- "medium": Some technique required, moderate steps
- "hard": Advanced techniques, many steps or precise timing

**Category**: Suggest ONE category from: Appetizer, Main Course, Side Dish, Dessert, Breakfast, Soup, Salad, Beverage, Snack, Sauce, Bread, Other

**Confidence**:
- "high": Recipe content is clear and complete
- "medium": Some parts unclear but extractable
- "low": Significant portions missing or unclear

**Warnings**: Note any issues like:
- "Some ingredient quantities were unclear"
- "Instructions may be incomplete"
- "Could not determine serving size"

If any field cannot be determined, omit it rather than guessing.

If this does not appear to be recipe content, set confidence to "low" and add a warning explaining that no recipe was found.`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      );
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: "Please paste more recipe content (at least a few ingredients and instructions)" },
        { status: 400 }
      );
    }

    // Limit content length to avoid token limits
    const maxLength = 30000;
    const truncatedContent =
      text.length > maxLength
        ? text.slice(0, maxLength) + "\n\n[Content truncated...]"
        : text;

    // Call Claude to extract recipe
    const result = await generateObject({
      model: 'google/gemini-3-flash',
      providerOptions: {
        gateway: {
          order: ['vertex'],
        },
      },
      schema: extractedRecipeSchema,
      messages: [
        {
          role: "user",
          content: `${TEXT_EXTRACTION_PROMPT}\n\n---\n\nRecipe text:\n\n${truncatedContent}`,
        },
      ],
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Text recipe extraction failed:", error);

    if (error instanceof Error && error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Service temporarily busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract recipe. Please try again." },
      { status: 500 }
    );
  }
}
