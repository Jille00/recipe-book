/**
 * Server-side pipeline behind "import a recipe from a link": fetch the page
 * safely, read schema.org Recipe JSON-LD when present (no AI), otherwise fall
 * back to AI extraction of the page text, and re-host the recipe photo in our
 * own storage. I/O is injected so the pipeline and its error mapping can be
 * tested without network, AI or storage.
 */

import type { ExtractionResponse } from "@/types/extraction";
import { detectImageType, type DetectedImage } from "@/lib/image/detect-image-type";
import {
  extractPageTitle,
  extractReadableText,
  findMetaContent,
} from "./html-text";
import { findRecipeNode } from "./json-ld";
import {
  enforceRecipeCaps,
  isUsableRecipe,
  mapRecipeNode,
  resolveImageUrl,
} from "./map-recipe";
import { SafeFetchError, type SafeFetchResult } from "./safe-fetch";

export const PAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PAGE_TIMEOUT_MS = 10_000;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_TIMEOUT_MS = 8_000;
/** Below this much readable text a page cannot hold a recipe. */
export const MIN_PAGE_TEXT_LENGTH = 200;

export const AI_FALLBACK_WARNING =
  "This page has no structured recipe data, so the recipe was read from the page text. Please check it carefully.";
export const PHOTO_FAILED_WARNING =
  "The photo on this page couldn't be imported. You can add one yourself.";

/** Content types accepted as a web page. */
export function isHtmlContentType(contentType: string): boolean {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return mime === "text/html" || mime === "application/xhtml+xml";
}

/** Only these photo formats are re-hosted (next/image can show all of them). */
const IMPORTABLE_IMAGE_TYPES = new Set<DetectedImage["mime"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type RecipeImportErrorCode = "too_little_text" | "no_recipe_found";

/** A failure with a user-facing meaning that is not a fetch error. */
export class RecipeImportError extends Error {
  readonly code: RecipeImportErrorCode;
  constructor(code: RecipeImportErrorCode, message: string) {
    super(message);
    this.name = "RecipeImportError";
    this.code = code;
  }
}

export interface ImportDependencies {
  fetchPage(url: string): Promise<SafeFetchResult>;
  fetchImage(url: string): Promise<SafeFetchResult>;
  /** Called right before the AI fallback; may throw to stop it (rate limit). */
  beforeAiFallback(): void;
  extractFromText(text: string): Promise<ExtractionResponse>;
  /** Store a validated image in our storage and return its public URL. */
  storeImage(body: Buffer, image: DetectedImage): Promise<string>;
}

export interface ImportResult extends ExtractionResponse {
  source: "json-ld" | "ai";
  warnings: string[];
}

/** Decode a response body using its declared (or <meta>) charset, default UTF-8. */
export function decodeHtml(body: Buffer, contentType: string): string {
  const fromHeader = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType)?.[1];
  let label = fromHeader;
  if (!label) {
    const head = body.subarray(0, 4096).toString("latin1");
    label =
      /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1] ?? undefined;
  }
  try {
    return new TextDecoder(label ?? "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

/** Run the import. Throws SafeFetchError / RecipeImportError on failure. */
export async function importRecipeFromUrl(
  url: string,
  deps: ImportDependencies
): Promise<ImportResult> {
  const page = await deps.fetchPage(url);
  const html = decodeHtml(page.body, page.contentType);
  const pageUrl = page.url;

  let result: ImportResult | undefined;

  const node = findRecipeNode(html);
  if (node) {
    const mapped = mapRecipeNode(node, {
      pageUrl,
      fallbackTitle: extractPageTitle(html),
    });
    if (isUsableRecipe(mapped)) {
      result = { ...mapped, warnings: mapped.warnings ?? [], source: "json-ld" };
    }
  }

  if (!result) {
    const text = extractReadableText(html);
    if (text.length < MIN_PAGE_TEXT_LENGTH) {
      throw new RecipeImportError(
        "too_little_text",
        "That page doesn't contain enough text to find a recipe."
      );
    }

    deps.beforeAiFallback();
    const title = extractPageTitle(html);
    const extracted = await deps.extractFromText(
      title ? `Page title: ${title}\n\n${text}` : text
    );
    const capped = enforceRecipeCaps({ ...extracted.recipe, imageUrl: undefined });
    delete capped.recipe.imageUrl;

    if (
      capped.recipe.ingredients.length === 0 &&
      capped.recipe.instructions.length === 0
    ) {
      throw new RecipeImportError(
        "no_recipe_found",
        "We couldn't find a recipe on that page."
      );
    }

    const ogImage = findMetaContent(html, "og:image");
    const imageUrl = ogImage ? resolveImageUrl(ogImage, pageUrl) : undefined;
    if (imageUrl) capped.recipe.imageUrl = imageUrl;

    result = {
      recipe: capped.recipe,
      confidence: extracted.confidence,
      warnings: [AI_FALLBACK_WARNING, ...(extracted.warnings ?? []), ...capped.warnings],
      source: "ai",
    };
  }

  // The external photo URL must never reach the client: re-host it or drop it.
  const externalImage = result.recipe.imageUrl;
  delete result.recipe.imageUrl;
  if (externalImage) {
    const stored = await rehostImage(externalImage, deps);
    if (stored) {
      result.recipe.imageUrl = stored;
    } else {
      result.warnings.push(PHOTO_FAILED_WARNING);
    }
  }

  return result;
}

async function rehostImage(
  imageUrl: string,
  deps: ImportDependencies
): Promise<string | null> {
  try {
    const image = await deps.fetchImage(imageUrl);
    const detected = detectImageType(image.body);
    if (!detected || !IMPORTABLE_IMAGE_TYPES.has(detected.mime)) return null;
    return await deps.storeImage(image.body, detected);
  } catch (error) {
    console.warn(
      "Recipe photo import failed:",
      error instanceof SafeFetchError ? error.code : error instanceof Error ? error.name : "unknown"
    );
    return null;
  }
}

export interface ImportErrorResponse {
  status: number;
  message: string;
}

/**
 * Map a failure to a status and a message that is safe to show. Raw error
 * text is never passed through.
 */
export function describeImportError(error: unknown): ImportErrorResponse {
  if (error instanceof SafeFetchError) {
    switch (error.code) {
      case "invalid_url":
        return {
          status: 400,
          message: "That link can't be imported. Please use a normal web address starting with http:// or https://.",
        };
      case "blocked_address":
        return {
          status: 400,
          message: "That address can't be imported. Please use a link to a public recipe website.",
        };
      case "not_found_host":
        return {
          status: 422,
          message: "We couldn't find that website. Check the link and try again.",
        };
      case "http_status":
        if (error.status === 404 || error.status === 410) {
          return {
            status: 422,
            message: "That page wasn't found. Check the link and try again.",
          };
        }
        return {
          status: 502,
          message: "The recipe website refused the request. Some sites block importing; you can copy the recipe into the From Text tab instead.",
        };
      case "unsupported_content_type":
        return {
          status: 422,
          message: "That link doesn't point to a web page. Please link to the recipe page itself.",
        };
      case "too_large":
        return { status: 422, message: "That page is too large to import." };
      case "timeout":
        return {
          status: 504,
          message: "The recipe website took too long to respond. Please try again later.",
        };
      case "too_many_redirects":
        return {
          status: 502,
          message: "That link redirects too many times to import.",
        };
      case "network":
      default:
        return {
          status: 502,
          message: "We couldn't connect to the recipe website. Please try again later.",
        };
    }
  }
  if (error instanceof RecipeImportError) {
    return { status: 422, message: error.message };
  }
  if (error instanceof Error && /rate limit/i.test(error.message)) {
    return {
      status: 429,
      message: "Service temporarily busy. Please try again in a moment.",
    };
  }
  return { status: 500, message: "Failed to import the recipe. Please try again." };
}
