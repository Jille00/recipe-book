import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import convert from "heic-convert";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE_PER_FILE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 10;

async function convertHeicToJpeg(buffer: ArrayBuffer): Promise<Buffer> {
  const outputBuffer = await convert({
    buffer: Buffer.from(buffer) as unknown as ArrayBuffer,
    format: "JPEG",
    quality: 0.9,
  });
  return Buffer.from(outputBuffer);
}

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

const EXTRACTION_PROMPT = `Extract the recipe information from this image. The image may contain:
- A photo of a cookbook page
- A handwritten recipe card
- A screenshot of a recipe website
- A printed recipe

**IMPORTANT**: If the recipe is in a language other than English, translate ALL text to English while preserving the original recipe name in parentheses if it's a well-known dish name (e.g., "Beef Bourguignon (Boeuf Bourguignon)").

Please extract ALL available information following these guidelines:

**Title**: Extract the recipe name exactly as shown

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
- "high": Text is clear and complete
- "medium": Some parts unclear but extractable
- "low": Significant portions unclear

**Warnings**: Note any issues like:
- "Some ingredient quantities were unclear"
- "Handwriting partially illegible in step 3"
- "Image quality limited extraction accuracy"

If any field cannot be determined, omit it rather than guessing.`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many images. Maximum is ${MAX_FILES}` },
        { status: 400 }
      );
    }

    // Validate all files
    for (const file of files) {
      // Check for HEIC files by extension if mime type isn't detected
      const isHeic = file.type === "image/heic" ||
                     file.type === "image/heif" ||
                     file.name.toLowerCase().endsWith(".heic") ||
                     file.name.toLowerCase().endsWith(".heif");

      if (!ALLOWED_TYPES.includes(file.type) && !isHeic) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Please upload JPEG, PNG, WebP, or HEIC` },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE_PER_FILE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 10MB per image` },
          { status: 400 }
        );
      }
    }

    // Convert all images to base64 and build content array
    const imageContents: Array<{ type: "image"; image: string }> = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();

      // Check if this is a HEIC file and convert it
      const isHeic = file.type === "image/heic" ||
                     file.type === "image/heif" ||
                     file.name.toLowerCase().endsWith(".heic") ||
                     file.name.toLowerCase().endsWith(".heif");

      let base64: string;
      let mimeType: "image/jpeg" | "image/png" | "image/webp";

      if (isHeic) {
        // Convert HEIC to JPEG
        const jpegBuffer = await convertHeicToJpeg(bytes);
        base64 = jpegBuffer.toString("base64");
        mimeType = "image/jpeg";
      } else {
        base64 = Buffer.from(bytes).toString("base64");
        mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      }

      imageContents.push({
        type: "image",
        image: `data:${mimeType};base64,${base64}`,
      });
    }

    // Build prompt based on number of images
    const promptPrefix = files.length > 1
      ? `I'm providing ${files.length} images of a recipe. They may be multiple pages or screenshots of the same recipe. Please combine the information from ALL images to extract the complete recipe.\n\n`
      : "";

    // Call Claude with vision (multiple images)
    const result = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: extractedRecipeSchema,
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            {
              type: "text",
              text: promptPrefix + EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error("Recipe extraction failed:", error);

    if (error instanceof Error && error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Service temporarily busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract recipe. Please try a clearer image." },
      { status: 500 }
    );
  }
}
