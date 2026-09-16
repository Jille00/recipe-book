import { describe, expect, it } from "vitest";
import {
  formatBytes,
  IMPORT_IMAGE_TYPES,
  IMPORT_PASSTHROUGH_TYPES,
  IMPORT_REQUEST_BUDGET_BYTES,
  MAX_SOURCE_BYTES,
  parseJsonResponse,
  readResponseError,
  UPLOAD_BUDGET_BYTES,
  UPLOAD_IMAGE_TYPES,
  UPLOAD_PASSTHROUGH_TYPES,
  validateImageFile,
} from "./file-validation";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

/** A File-shaped stand-in for sizes too large to allocate in a test. */
const hugeFile = (name: string, type: string, size: number) => ({ name, type, size }) as File;

describe("constants", () => {
  it("keeps budgets below Vercel's ~4.5MB request limit", () => {
    expect(IMPORT_REQUEST_BUDGET_BYTES).toBeLessThan(4_500_000);
    expect(UPLOAD_BUDGET_BYTES).toBeLessThan(4_500_000);
  });

  it("only passes through types that are also accepted", () => {
    for (const type of UPLOAD_PASSTHROUGH_TYPES) expect(UPLOAD_IMAGE_TYPES).toContain(type);
    for (const type of IMPORT_PASSTHROUGH_TYPES) expect(IMPORT_IMAGE_TYPES).toContain(type);
  });
});

describe("formatBytes", () => {
  // Regression: one byte over a whole megabyte printed "50.0MB".
  it("drops a trailing .0 for sizes just over a whole megabyte", () => {
    expect(formatBytes(50 * 1024 * 1024 + 1)).toBe("50MB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5MB");
  });


  it.each([
    [0, "1KB"],
    [500, "1KB"],
    [1024, "1KB"],
    [1536, "2KB"],
    [900 * 1024, "900KB"],
    [1024 * 1024, "1MB"],
    [1.5 * 1024 * 1024, "1.5MB"],
    [3_800_000, "3.6MB"],
    [50 * 1024 * 1024, "50MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("validateImageFile", () => {
  describe("by MIME type", () => {
    it.each(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])(
      "accepts %s for imports",
      (type) => {
        expect(validateImageFile(file("photo", type), IMPORT_IMAGE_TYPES)).toBeNull();
      }
    );

    it("accepts GIF for uploads but not for imports", () => {
      expect(validateImageFile(file("a.gif", "image/gif"), UPLOAD_IMAGE_TYPES)).toBeNull();
      expect(validateImageFile(file("a.gif", "image/gif"), IMPORT_IMAGE_TYPES)).not.toBeNull();
    });

    it("compares the type case-insensitively", () => {
      expect(validateImageFile(file("a.png", "IMAGE/PNG"), IMPORT_IMAGE_TYPES)).toBeNull();
    });

    it("rejects a disallowed type even when the name looks right", () => {
      expect(validateImageFile(file("photo.jpg", "application/pdf"), IMPORT_IMAGE_TYPES)).not.toBeNull();
    });
  });

  describe("by extension when the browser reports no type", () => {
    it.each(["IMG_0001.HEIC", "photo.heif", "photo.JPG", "photo.jpeg", "photo.webp"])(
      "accepts %s",
      (name) => {
        expect(validateImageFile(file(name, ""), IMPORT_IMAGE_TYPES)).toBeNull();
      }
    );

    it("rejects an unknown extension", () => {
      expect(validateImageFile(file("recipe.pdf", ""), IMPORT_IMAGE_TYPES)).not.toBeNull();
      expect(validateImageFile(file("noextension", ""), IMPORT_IMAGE_TYPES)).not.toBeNull();
    });
  });

  it("lists the supported formats once each in the error", () => {
    expect(validateImageFile(file("a.gif", ""), IMPORT_IMAGE_TYPES)).toBe(
      '"a.gif" is not a supported image (JPG, JPEG, PNG, WEBP, HEIC, HEIF).'
    );
  });

  it("rejects an empty file", () => {
    expect(validateImageFile(file("a.jpg", "image/jpeg", 0), IMPORT_IMAGE_TYPES)).toBe('"a.jpg" is empty.');
  });

  it("accepts a file exactly at the size limit and rejects one byte more", () => {
    expect(validateImageFile(file("a.jpg", "image/jpeg", 1024), IMPORT_IMAGE_TYPES, 1024)).toBeNull();
    expect(validateImageFile(file("a.jpg", "image/jpeg", 2048), IMPORT_IMAGE_TYPES, 1024)).toBe(
      '"a.jpg" is 2KB; the maximum is 1KB.'
    );
  });

  it("allows large phone photos under the default sanity cap", () => {
    expect(validateImageFile(hugeFile("big.jpg", "image/jpeg", 20 * 1024 * 1024), IMPORT_IMAGE_TYPES)).toBeNull();
  });

  it("rejects files over the default sanity cap", () => {
    expect(
      validateImageFile(hugeFile("huge.jpg", "image/jpeg", MAX_SOURCE_BYTES + 1), IMPORT_IMAGE_TYPES)
    ).toMatch(/^"huge\.jpg" is 50(\.0)?MB; the maximum is 50MB\.$/);
  });

  it("checks the type before the size", () => {
    expect(validateImageFile(file("a.txt", "text/plain", 0), IMPORT_IMAGE_TYPES)).toContain("not a supported image");
  });
});

describe("readResponseError", () => {
  const json = (status: number, body: unknown, contentType = "application/json") =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": contentType } });
  const html = (status: number) =>
    new Response("<html><body>Error</body></html>", { status, headers: { "content-type": "text/html" } });

  it.each([401, 403])("tells the user to sign in again on %d", async (status) => {
    expect(await readResponseError(json(status, { error: "Unauthorized" }), "Upload failed")).toBe(
      "Your session has expired. Please sign in again."
    );
  });

  it("explains a 413 from the proxy even with an HTML body", async () => {
    expect(await readResponseError(html(413), "Upload failed")).toBe(
      "The photos are too large to upload together. Try fewer photos."
    );
  });

  it.each([504, 408])("explains a timeout on %d", async (status) => {
    expect(await readResponseError(html(status), "Upload failed")).toBe(
      "The server took too long to respond. Please try again."
    );
  });

  it("uses the error message from a JSON body", async () => {
    expect(await readResponseError(json(422, { error: "Title is required" }), "Save failed")).toBe(
      "Title is required"
    );
  });

  it("accepts a JSON content type with a charset", async () => {
    expect(
      await readResponseError(json(400, { error: "Bad input" }, "application/json; charset=utf-8"), "Save failed")
    ).toBe("Bad input");
  });

  it("stringifies a non-string error value", async () => {
    expect(await readResponseError(json(400, { error: 42 }), "Save failed")).toBe("42");
  });

  it("falls back with the status when the JSON has no error", async () => {
    expect(await readResponseError(json(500, { message: "nope" }), "Save failed")).toBe("Save failed (500)");
  });

  it("falls back when a JSON response has an invalid body", async () => {
    const response = new Response("<html>oops", { status: 502, headers: { "content-type": "application/json" } });
    expect(await readResponseError(response, "Save failed")).toBe("Save failed (502)");
  });

  it("does not parse an HTML error page as JSON", async () => {
    expect(await readResponseError(html(500), "Save failed")).toBe("Save failed (500)");
  });

  it("falls back when there is no content type", async () => {
    expect(await readResponseError(new Response(null, { status: 500 }), "Save failed")).toBe("Save failed (500)");
  });
});

describe("parseJsonResponse", () => {
  it("returns the JSON of a successful response", async () => {
    const response = new Response(JSON.stringify({ id: "1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    expect(await parseJsonResponse<{ id: string }>(response, "Failed")).toEqual({ id: "1" });
  });

  it("throws the readable error of a failed response", async () => {
    const response = new Response(JSON.stringify({ error: "Recipe not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
    await expect(parseJsonResponse(response, "Failed")).rejects.toThrow("Recipe not found");
  });

  it("throws the mapped message for a 413", async () => {
    await expect(parseJsonResponse(new Response("Too large", { status: 413 }), "Failed")).rejects.toThrow(
      "The photos are too large to upload together. Try fewer photos."
    );
  });

  it("throws a friendly message when a successful response is not JSON", async () => {
    const response = new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
    await expect(parseJsonResponse(response, "Failed")).rejects.toThrow(
      "The server returned an unexpected response."
    );
  });
});
