import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { extractRecipeFromText } from "@/lib/recipe-import/extract-from-text";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit("ai:import-recipe-text", session.user.id);
    if (limited) return limited;

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

    const extracted = await extractRecipeFromText(text);

    return NextResponse.json(extracted);
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
