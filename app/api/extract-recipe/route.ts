import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateObject } from "ai";
import { z } from "zod";
import convert from "heic-convert";
import { enforceRateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILES = 10;
// Vercel Functions reject request bodies over ~4.5MB with 413
// FUNCTION_PAYLOAD_TOO_LARGE before this route runs (measured in production:
// 4.0MB arrives, 4.4MB does not), and that cannot be raised. The client
// shrinks photos to fit ~3.8MB in total (components/recipe/file-validation.ts),
// so these caps sit just under the platform ceiling: anything larger could
// never have arrived on Vercel anyway, and locally we answer with a clear
// message instead. Keeping the total small also bounds memory, since every
// image is base64 encoded into a single prompt (~1.4x the upload size).
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // 4MB across all images
const MAX_SIZE_PER_FILE = MAX_TOTAL_BYTES; // one photo may use the whole budget
// Boundaries and per-part headers on top of the file bytes.
const MULTIPART_OVERHEAD_ALLOWANCE = 64 * 1024;
const MAX_MB = MAX_TOTAL_BYTES / (1024 * 1024);

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

/**
 * Read a single upload, convert it if needed and base64-encode it. Kept in its
 * own function so the raw ArrayBuffer / Buffer become unreachable (and
 * collectable) as soon as it returns.
 */
async function encodeImage(
  file: File,
  isHeic: boolean
): Promise<{ base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" }> {
  const bytes = await file.arrayBuffer();

  if (isHeic) {
    const jpegBuffer = await convertHeicToJpeg(bytes);
    return { base64: jpegBuffer.toString("base64"), mimeType: "image/jpeg" };
  }

  return {
    base64: Buffer.from(bytes).toString("base64"),
    mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit("ai:extract-recipe", session.user.id);
    if (limited) return limited;

    // Reject oversized requests before formData() buffers the whole body.
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_TOTAL_BYTES + MULTIPART_OVERHEAD_ALLOWANCE) {
      return NextResponse.json(
        {
          error: `The photos are too large to upload together (maximum ${MAX_MB}MB in total). Try fewer photos.`,
        },
        { status: 413 }
      );
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
          {
            error: `"${file.name}" is too large to upload (maximum ${MAX_SIZE_PER_FILE / (1024 * 1024)}MB). Try a smaller photo.`,
          },
          { status: 400 }
        );
      }
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        {
          error: `The photos are too large to upload together (maximum ${MAX_MB}MB in total). Try fewer photos.`,
        },
        { status: 400 }
      );
    }

    // Convert all images to base64 and build content array
    const imageContents: Array<{ type: "image"; image: string }> = [];

    // Process one file at a time and drop every intermediate buffer as soon as
    // it has been encoded, so only the base64 payloads stay resident.
    for (const file of files) {
      // Check if this is a HEIC file and convert it
      const isHeic = file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");

      const encoded = await encodeImage(file, isHeic);

      imageContents.push({
        type: "image",
        image: `data:${encoded.mimeType};base64,${encoded.base64}`,
      });
    }

    // Build prompt based on number of images
    const promptPrefix = files.length > 1
      ? `I'm providing ${files.length} images of a recipe. They may be multiple pages or screenshots of the same recipe. Please combine the information from ALL images to extract the complete recipe.\n\n`
      : "";

    // Call Claude with vision (multiple images)
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
