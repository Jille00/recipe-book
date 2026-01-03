import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateText } from "ai";
import { getStorageClient } from "@/lib/supabase/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, ingredients, instructions } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Recipe title is required" },
        { status: 400 }
      );
    }

    // Build a descriptive prompt for the image generation
    const ingredientList = ingredients
      ?.slice(0, 8)
      .map((i: { text: string }) => i.text)
      .join(", ");

    // Extract visual cues from instructions (garnishes, presentation, cooking style)
    const instructionHints = instructions
      .map((i: { text: string }) => i.text)
      .join(" ")

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

    // Get storage client
    const supabase = getStorageClient();

    // Generate unique filename
    const ext = imageFile.mediaType === "image/png" ? "png" : "jpg";
    const fileName = `${session.user.id}/${Date.now()}-ai-generated.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, imageBuffer, {
        contentType: imageFile.mediaType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Failed to save generated image" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
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
