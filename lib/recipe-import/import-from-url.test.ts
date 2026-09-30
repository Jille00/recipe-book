import { describe, expect, it, vi } from "vitest";
import type { ExtractionResponse } from "@/types/extraction";
import {
  AI_FALLBACK_WARNING,
  PHOTO_FAILED_WARNING,
  RecipeImportError,
  decodeHtml,
  describeImportError,
  importRecipeFromUrl,
  isHtmlContentType,
  type ImportDependencies,
} from "./import-from-url";
import { SafeFetchError, type SafeFetchResult } from "./safe-fetch";

const PAGE_URL = "https://recipes.test/soup";
const STORED_URL = "https://abc.supabase.co/storage/v1/object/public/recipe-images/user-1/1-x.jpg";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

function htmlResult(html: string, url = PAGE_URL): SafeFetchResult {
  return { url, status: 200, contentType: "text/html; charset=utf-8", body: Buffer.from(html) };
}

const recipePage = (recipe: Record<string, unknown>) =>
  `<html><head><title>Soup | Site</title><script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Recipe",
    ...recipe,
  })}</script></head><body><p>Soup</p></body></html>`;

const fullRecipe = {
  name: "Tomato Soup",
  image: "/img/soup.jpg",
  recipeIngredient: ["2 cups stock", "1 onion"],
  recipeInstructions: ["Chop.", "Simmer."],
  recipeYield: "4 servings",
};

function makeDeps(overrides: Partial<ImportDependencies> = {}) {
  const deps: ImportDependencies = {
    fetchPage: vi.fn(async () => htmlResult(recipePage(fullRecipe))),
    fetchImage: vi.fn(async (url: string) => ({
      url,
      status: 200,
      contentType: "image/jpeg",
      body: JPEG,
    })),
    beforeAiFallback: vi.fn(),
    extractFromText: vi.fn(async (): Promise<ExtractionResponse> => {
      throw new Error("AI should not be called");
    }),
    storeImage: vi.fn(async () => STORED_URL),
    ...overrides,
  };
  return deps;
}

describe("importRecipeFromUrl - structured data", () => {
  it("maps JSON-LD without calling the AI and re-hosts the photo", async () => {
    const deps = makeDeps();
    const result = await importRecipeFromUrl(PAGE_URL, deps);

    expect(result.source).toBe("json-ld");
    expect(result.confidence).toBe("high");
    expect(result.recipe.title).toBe("Tomato Soup");
    expect(result.recipe.servings).toBe(4);
    expect(result.recipe.imageUrl).toBe(STORED_URL);
    expect(result.warnings).toEqual([]);
    expect(deps.extractFromText).not.toHaveBeenCalled();
    expect(deps.beforeAiFallback).not.toHaveBeenCalled();
    // The relative image URL is resolved against the (final) page URL.
    expect(deps.fetchImage).toHaveBeenCalledWith("https://recipes.test/img/soup.jpg");
    expect(deps.storeImage).toHaveBeenCalledWith(JPEG, { mime: "image/jpeg", ext: "jpg" });
  });

  it("resolves images against the final URL after redirects", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult(recipePage(fullRecipe), "https://www.recipes.test/r/1/")),
    });
    await importRecipeFromUrl(PAGE_URL, deps);
    expect(deps.fetchImage).toHaveBeenCalledWith("https://www.recipes.test/img/soup.jpg");
  });

  it("succeeds without a photo when the image is not really an image", async () => {
    const deps = makeDeps({
      fetchImage: vi.fn(async (url: string) => ({ url, status: 200, contentType: "image/svg+xml", body: SVG })),
    });
    const result = await importRecipeFromUrl(PAGE_URL, deps);
    expect(result.recipe.imageUrl).toBeUndefined();
    expect(result.warnings).toEqual([PHOTO_FAILED_WARNING]);
    expect(deps.storeImage).not.toHaveBeenCalled();
  });

  it.each([
    ["the photo download fails", { fetchImage: vi.fn(async () => { throw new SafeFetchError("blocked_address", "x"); }) }],
    ["the photo is too large", { fetchImage: vi.fn(async () => { throw new SafeFetchError("too_large", "x"); }) }],
    ["storage fails", { storeImage: vi.fn(async () => { throw new Error("upload failed"); }) }],
  ])("never returns the external photo URL when %s", async (_label, overrides) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await importRecipeFromUrl(PAGE_URL, makeDeps(overrides));
    warn.mockRestore();
    expect(result.recipe.imageUrl).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("recipes.test/img");
    expect(result.warnings).toContain(PHOTO_FAILED_WARNING);
  });

  it("stores PNGs with their detected type", async () => {
    const deps = makeDeps({
      fetchImage: vi.fn(async (url: string) => ({ url, status: 200, contentType: "application/octet-stream", body: PNG })),
    });
    await importRecipeFromUrl(PAGE_URL, deps);
    expect(deps.storeImage).toHaveBeenCalledWith(PNG, { mime: "image/png", ext: "png" });
  });

  it("does not fetch anything when there is no photo", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult(recipePage({ ...fullRecipe, image: undefined }))),
    });
    const result = await importRecipeFromUrl(PAGE_URL, deps);
    expect(result.recipe.imageUrl).toBeUndefined();
    expect(deps.fetchImage).not.toHaveBeenCalled();
    expect(result.warnings).toEqual([]);
  });
});

describe("importRecipeFromUrl - AI fallback", () => {
  const articleHtml = `<html><head><title>Nan's pancakes</title>
    <meta property="og:image" content="https://cdn.recipes.test/pancakes.jpg"></head>
    <body><nav>Menu</nav><article><h1>Nan's pancakes</h1>
    <p>${"Ingredients: 200 g flour, 2 eggs, 300 ml milk. ".repeat(6)}</p>
    <p>${"Whisk everything and fry thin pancakes in butter. ".repeat(6)}</p></article></body></html>`;

  const aiResult: ExtractionResponse = {
    recipe: {
      title: "Nan's Pancakes",
      ingredients: [{ amount: "200", unit: "g", text: "flour" }],
      instructions: [{ step: 1, text: "Whisk and fry." }],
    },
    confidence: "medium",
    warnings: ["Could not determine serving size"],
  };

  it("runs the shared AI extraction on the page text when there is no recipe data", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult(articleHtml)),
      extractFromText: vi.fn(async () => aiResult),
    });
    const result = await importRecipeFromUrl(PAGE_URL, deps);

    expect(deps.beforeAiFallback).toHaveBeenCalledTimes(1);
    const sentText = vi.mocked(deps.extractFromText).mock.calls[0][0];
    expect(sentText).toContain("Page title: Nan's pancakes");
    expect(sentText).toContain("Whisk everything");
    expect(sentText).not.toContain("<p>");
    expect(sentText).not.toContain("Menu");

    expect(result.source).toBe("ai");
    expect(result.confidence).toBe("medium");
    expect(result.warnings).toEqual([AI_FALLBACK_WARNING, "Could not determine serving size"]);
    expect(deps.fetchImage).toHaveBeenCalledWith("https://cdn.recipes.test/pancakes.jpg");
    expect(result.recipe.imageUrl).toBe(STORED_URL);
  });

  it("falls back to AI when the recipe data has no ingredients or steps", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () =>
        htmlResult(articleHtml.replace("</head>", `<script type="application/ld+json">{"@type":"Recipe","name":"Empty"}</script></head>`))
      ),
      extractFromText: vi.fn(async () => aiResult),
    });
    const result = await importRecipeFromUrl(PAGE_URL, deps);
    expect(result.source).toBe("ai");
  });

  it("does not call the AI when the rate-limit hook refuses", async () => {
    const limited = new Error("limited");
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult(articleHtml)),
      beforeAiFallback: vi.fn(() => {
        throw limited;
      }),
    });
    await expect(importRecipeFromUrl(PAGE_URL, deps)).rejects.toBe(limited);
    expect(deps.extractFromText).not.toHaveBeenCalled();
  });

  it("refuses pages with too little text without calling the AI", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult("<html><body><p>Loading…</p><script>app()</script></body></html>")),
    });
    await expect(importRecipeFromUrl(PAGE_URL, deps)).rejects.toMatchObject({ code: "too_little_text" });
    expect(deps.beforeAiFallback).not.toHaveBeenCalled();
    expect(deps.extractFromText).not.toHaveBeenCalled();
  });

  it("reports no recipe when the AI finds nothing", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult(articleHtml)),
      extractFromText: vi.fn(async () => ({
        recipe: { title: "", ingredients: [], instructions: [] },
        confidence: "low" as const,
        warnings: ["No recipe found"],
      })),
    });
    await expect(importRecipeFromUrl(PAGE_URL, deps)).rejects.toMatchObject({ code: "no_recipe_found" });
    expect(deps.fetchImage).not.toHaveBeenCalled();
  });

  it("caps oversized AI output", async () => {
    const deps = makeDeps({
      fetchPage: vi.fn(async () => htmlResult(articleHtml)),
      extractFromText: vi.fn(async () => ({
        recipe: {
          title: "x".repeat(400),
          ingredients: Array.from({ length: 130 }, () => ({ text: "salt" })),
          instructions: [{ step: 9, text: "y".repeat(3000) }],
        },
        confidence: "high" as const,
      })),
    });
    const result = await importRecipeFromUrl(PAGE_URL, deps);
    expect(result.recipe.title.length).toBeLessThanOrEqual(200);
    expect(result.recipe.ingredients).toHaveLength(100);
    expect(result.recipe.instructions[0]).toMatchObject({ step: 1 });
    expect(result.recipe.instructions[0].text.length).toBeLessThanOrEqual(2000);
  });
});

describe("page decoding", () => {
  it("accepts only HTML content types", () => {
    expect(isHtmlContentType("text/html")).toBe(true);
    expect(isHtmlContentType("text/html; charset=UTF-8")).toBe(true);
    expect(isHtmlContentType("application/xhtml+xml")).toBe(true);
    expect(isHtmlContentType("application/json")).toBe(false);
    expect(isHtmlContentType("image/png")).toBe(false);
    expect(isHtmlContentType("")).toBe(false);
  });

  it("decodes using the header or meta charset", () => {
    const latin1 = Buffer.from([0x63, 0x72, 0xe8, 0x6d, 0x65]); // "crème" in ISO-8859-1
    expect(decodeHtml(latin1, "text/html; charset=iso-8859-1")).toBe("crème");
    const withMeta = Buffer.concat([Buffer.from('<meta charset="windows-1252">'), latin1]);
    expect(decodeHtml(withMeta, "text/html")).toContain("crème");
    expect(decodeHtml(Buffer.from("crème"), "text/html")).toBe("crème");
    expect(decodeHtml(Buffer.from("crème"), "text/html; charset=bogus-charset")).toBe("crème");
  });
});

describe("describeImportError", () => {
  it.each([
    [new SafeFetchError("invalid_url", "raw"), 400],
    [new SafeFetchError("blocked_address", "raw"), 400],
    [new SafeFetchError("not_found_host", "raw"), 422],
    [new SafeFetchError("http_status", "raw", { status: 404 }), 422],
    [new SafeFetchError("http_status", "raw", { status: 410 }), 422],
    [new SafeFetchError("http_status", "raw", { status: 403 }), 502],
    [new SafeFetchError("http_status", "raw", { status: 500 }), 502],
    [new SafeFetchError("unsupported_content_type", "raw"), 422],
    [new SafeFetchError("too_large", "raw"), 422],
    [new SafeFetchError("timeout", "raw"), 504],
    [new SafeFetchError("too_many_redirects", "raw"), 502],
    [new SafeFetchError("network", "raw"), 502],
    [new RecipeImportError("too_little_text", "That page doesn't contain enough text to find a recipe."), 422],
    [new Error("Gateway rate limit exceeded"), 429],
    [new Error("ECONNRESET at internal.host:5432 secret"), 500],
    ["not even an error", 500],
  ])("maps %o to %i with a safe message", (error, status) => {
    const described = describeImportError(error);
    expect(described.status).toBe(status);
    expect(described.message).not.toContain("raw");
    expect(described.message).not.toContain("secret");
    expect(described.message.length).toBeGreaterThan(10);
  });
});
