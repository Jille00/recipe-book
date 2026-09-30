import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { storeRecipeImage } from "@/lib/supabase/recipe-images";
import { extractRecipeFromText } from "@/lib/recipe-import/extract-from-text";
import {
  IMAGE_MAX_BYTES,
  IMAGE_TIMEOUT_MS,
  PAGE_MAX_BYTES,
  PAGE_TIMEOUT_MS,
  describeImportError,
  importRecipeFromUrl,
  isHtmlContentType,
} from "@/lib/recipe-import/import-from-url";
import { SafeFetchError, safeFetch } from "@/lib/recipe-import/safe-fetch";
import { MAX_URL_LENGTH, checkFetchUrl } from "@/lib/recipe-import/url-safety";
import type { ExtractionResponse } from "@/types/extraction";

// node:http(s) with a validating DNS lookup is required for SSRF protection.
export const runtime = "nodejs";
// Page fetch (10s) + photo fetch (8s) + a possible AI call.
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().trim().min(1).max(MAX_URL_LENGTH),
});

const INVALID_URL_MESSAGE =
  "Please enter a valid link to a recipe page, starting with http:// or https://.";

/** Thrown inside the pipeline when the AI fallback is over its rate limit. */
class AiRateLimitedError extends Error {
  constructor(readonly response: NextResponse) {
    super("AI rate limited");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Every call makes outbound requests, so it is limited even without AI.
    const limited = enforceRateLimit("import:recipe-url", userId);
    if (limited) return limited;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: INVALID_URL_MESSAGE }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: INVALID_URL_MESSAGE }, { status: 400 });
    }

    const check = checkFetchUrl(parsed.data.url);
    if (!check.ok) {
      const { message } = describeImportError(
        new SafeFetchError(
          check.reason === "address" ? "blocked_address" : "invalid_url",
          "Rejected URL",
          { reason: check.reason }
        )
      );
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await importRecipeFromUrl(check.url.toString(), {
      fetchPage: (url) =>
        safeFetch(url, {
          maxBytes: PAGE_MAX_BYTES,
          timeoutMs: PAGE_TIMEOUT_MS,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          acceptContentType: isHtmlContentType,
        }),
      fetchImage: (url) =>
        safeFetch(url, {
          maxBytes: IMAGE_MAX_BYTES,
          timeoutMs: IMAGE_TIMEOUT_MS,
          accept: "image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1",
        }),
      beforeAiFallback: () => {
        const aiLimited = enforceRateLimit("ai:import-recipe-text", userId);
        if (aiLimited) throw new AiRateLimitedError(aiLimited);
      },
      extractFromText: extractRecipeFromText,
      storeImage: async (body, image) => {
        const stored = await storeRecipeImage(userId, body, {
          contentType: image.mime,
          ext: image.ext,
        });
        if (!stored.ok) {
          console.error("Supabase upload error:", stored.error);
          throw new Error("Photo upload failed");
        }
        return stored.url;
      },
    });

    const response: ExtractionResponse = {
      recipe: result.recipe,
      confidence: result.confidence,
      warnings: result.warnings,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AiRateLimitedError) return error.response;

    const { status, message } = describeImportError(error);
    if (status >= 500 && status !== 502 && status !== 504) {
      console.error("Recipe link import failed:", error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
