import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateText } from "ai";
import { z } from "zod";
import { storeRecipeImage } from "@/lib/supabase/recipe-images";
import { enforceRateLimit } from "@/lib/rate-limit";

// Runtime validation of the request body: `instructions.map(...)` used to throw
// a TypeError (surfacing as a 500) when the field was missing or not an array.
const requestSchema = z.object({
  title: z.string().min(1, "Recipe title is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  ingredients: z
    .array(z.object({ text: z.string().max(500) }))
    .max(100)
    .optional()
    .default([]),
  instructions: z
    .array(z.object({ text: z.string().max(2000) }))
    .max(100)
    .optional()
    .default([]),
});

// AI calls routinely take 10-30 seconds; don't let the platform default cut
// them off halfway (a paid call with nothing to show for it).
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimit("ai:generate-recipe-image", session.user.id);
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

    const { title, description, ingredients, instructions } = parsed.data;

    // Build a descriptive prompt for the image generation
    const ingredientList = ingredients
      .slice(0, 8)
      .map((i) => i.text)
      .join(", ");

    // Extract visual cues from instructions (garnishes, presentation, cooking
    // style). Capped: the full method can be ~200KB of text, all of it billed.
    const instructionHints = instructions
      .map((i) => i.text)
      .join(" ")
      .slice(0, 1000);

    const prompt = `A beautiful, appetizing food photography shot of "${title}". ${description ? description + ". " : ""
      }${ingredientList ? `Made with ${ingredientList}. ` : ""}${instructionHints ? `Cooking style: ${instructionHints}. ` : ""
      }Professional food photography, natural lighting, shallow depth of field, on a rustic wooden table with elegant plating, top-down or 45-degree angle view, warm cozy atmosphere.`;

    // Generate image using Vercel AI Gateway
    const result = await generateText({
      model: 'google/gemini-3-pro-image',
      providerOptions: {
        gateway: {
          order: ['vertex'],
        },
      },
      prompt,
    });

    // Find the generated image in the files
    const imageFile = result.files?.find((file) =>
      file.mediaType.startsWith("image/")
    );

    if (!imageFile) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Get the image data - it could be base64 or a Uint8Array
    let imageBuffer: Buffer;
    if (imageFile.base64) {
      imageBuffer = Buffer.from(imageFile.base64, "base64");
    } else if (imageFile.uint8Array) {
      imageBuffer = Buffer.from(imageFile.uint8Array);
    } else {
      return NextResponse.json(
        { error: "Invalid image data format" },
        { status: 500 }
      );
    }

    // Stored as JPEG whatever the model returns: a fraction of the size of a
    // PNG for a photo, and re-encoding validates the bytes on the way.
    const stored = await storeRecipeImage(session.user.id, imageBuffer, {
      contentType: "image/jpeg",
      ext: "jpg",
    });

    if (!stored.ok) {
      console.error("Saving generated image failed:", stored.error);
      return NextResponse.json(
        { error: "Failed to save generated image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: stored.url });
  } catch (error) {
    console.error("Image generation failed:", error);

    if (error instanceof Error && error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Service temporarily busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate image. Please try again." },
      { status: 500 }
    );
  }
}
