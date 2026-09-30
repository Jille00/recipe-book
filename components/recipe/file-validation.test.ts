import { describe, it, expect } from "vitest";
import {
  formatBytes,
  validateImageFile,
  readResponseError,
  parseJsonResponse,
  UPLOAD_IMAGE_TYPES,
  IMPORT_IMAGE_TYPES,
  MAX_SOURCE_BYTES,
  IMPORT_REQUEST_BUDGET_BYTES,
  UPLOAD_BUDGET_BYTES,
} from "./file-validation";

function file(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** A File that reports an arbitrary size without allocating it. */
function bigFile(name: string, type: string, size: number): File {
  const f = file(name, type, 1);
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("budgets", () => {
  it("stay under Vercel's ~4.5MB request limit", () => {
    expect(IMPORT_REQUEST_BUDGET_BYTES).toBeLessThan(4_000_000);
    expect(UPLOAD_BUDGET_BYTES).toBeLessThan(IMPORT_REQUEST_BUDGET_BYTES);
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "1KB"],
    [500, "1KB"],
    [1024, "1KB"],
    [1536, "2KB"],
    [500 * 1024, "500KB"],
    [1024 * 1024, "1MB"],
    [1.5 * 1024 * 1024, "1.5MB"],
    [3_500_000, "3.3MB"],
    [MAX_SOURCE_BYTES, "50MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("validateImageFile", () => {
  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.webp", "image/webp"],
    ["photo.gif", "image/gif"],
    ["photo.heic", "image/heic"],
    ["photo.heif", "image/heif"],
    ["photo.jpg", "image/jpg"],
    ["PHOTO.JPG", "IMAGE/JPEG"],
  ])("accepts %s (%s) for uploads", (name, type) => {
    expect(validateImageFile(file(name, type), UPLOAD_IMAGE_TYPES)).toBeNull();
  });

  it("falls back to the extension when the browser reports no type", () => {
    expect(validateImageFile(file("IMG_1234.HEIC", ""), UPLOAD_IMAGE_TYPES)).toBeNull();
    expect(validateImageFile(file("scan.heif", ""), IMPORT_IMAGE_TYPES)).toBeNull();
    expect(validateImageFile(file("photo.jpeg", ""), IMPORT_IMAGE_TYPES)).toBeNull();
  });

  it("rejects unsupported types with a list of allowed formats", () => {
    expect(validateImageFile(file("doc.pdf", "application/pdf"), UPLOAD_IMAGE_TYPES)).toBe(
      '"doc.pdf" is not a supported image (JPG, JPEG, PNG, WEBP, GIF, HEIC, HEIF).'
    );
    expect(validateImageFile(file("x.svg", "image/svg+xml"), IMPORT_IMAGE_TYPES)).toBe(
      '"x.svg" is not a supported image (JPG, JPEG, PNG, WEBP, HEIC, HEIF).'
    );
  });

  it("rejects GIF for imports but not for uploads", () => {
    expect(validateImageFile(file("a.gif", "image/gif"), IMPORT_IMAGE_TYPES)).not.toBeNull();
    expect(validateImageFile(file("a.gif", "image/gif"), UPLOAD_IMAGE_TYPES)).toBeNull();
  });

  it("trusts the reported type over the extension when a type is present", () => {
    expect(validateImageFile(file("photo.jpg", "text/plain"), UPLOAD_IMAGE_TYPES)).not.toBeNull();
  });

  it("rejects an untyped file with an unknown extension", () => {
    expect(validateImageFile(file("notes.txt", ""), UPLOAD_IMAGE_TYPES)).not.toBeNull();
    expect(validateImageFile(file("noextension", ""), UPLOAD_IMAGE_TYPES)).not.toBeNull();
  });

  it("rejects empty files", () => {
    expect(validateImageFile(file("a.png", "image/png", 0), UPLOAD_IMAGE_TYPES)).toBe('"a.png" is empty.');
  });

  it("rejects files over the size cap (default 50MB)", () => {
    expect(validateImageFile(bigFile("a.jpg", "image/jpeg", MAX_SOURCE_BYTES), UPLOAD_IMAGE_TYPES)).toBeNull();
    expect(validateImageFile(bigFile("a.jpg", "image/jpeg", MAX_SOURCE_BYTES + 1), UPLOAD_IMAGE_TYPES)).toBe(
      '"a.jpg" is 50.0MB; the maximum is 50MB.'
    );
  });

  it("honours a custom maximum", () => {
    expect(validateImageFile(file("a.jpg", "image/jpeg", 2048), UPLOAD_IMAGE_TYPES, 1024)).toBe(
      '"a.jpg" is 2KB; the maximum is 1KB.'
    );
  });

  it("returns an error (not a throw) for an empty allow-list", () => {
    expect(validateImageFile(file("a.jpg", "image/jpeg"), [])).toBe('"a.jpg" is not a supported image ().');
  });
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

describe("readResponseError", () => {
  it.each([
    [401, "Your session has expired. Please sign in again."],
    [403, "Your session has expired. Please sign in again."],
    [413, "The photos are too large to upload together. Try fewer photos."],
    [504, "The server took too long to respond. Please try again."],
    [408, "The server took too long to respond. Please try again."],
  ])("maps status %d to a friendly message", async (status, message) => {
    expect(await readResponseError(new Response("<html>", { status }), "Upload failed")).toBe(message);
  });

  it("uses the JSON error field when present", async () => {
    expect(await readResponseError(jsonResponse({ error: "Bad recipe" }, 400), "Failed")).toBe("Bad recipe");
    expect(await readResponseError(jsonResponse({ error: 42 }, 400), "Failed")).toBe("42");
  });

  it("falls back when the JSON has no error field", async () => {
    expect(await readResponseError(jsonResponse({ message: "x" }, 500), "Failed")).toBe("Failed (500)");
    expect(await readResponseError(jsonResponse(null, 500), "Failed")).toBe("Failed (500)");
  });

  it("does not try to parse HTML error pages", async () => {
    const res = new Response("<html>Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } });
    expect(await readResponseError(res, "Import failed")).toBe("Import failed (502)");
  });

  it("survives a JSON content-type with an invalid body", async () => {
    const res = new Response("<html>", { status: 500, headers: { "content-type": "application/json" } });
    expect(await readResponseError(res, "Failed")).toBe("Failed (500)");
  });
});

describe("parseJsonResponse", () => {
  it("returns the parsed body for ok responses", async () => {
    expect(await parseJsonResponse<{ a: number }>(jsonResponse({ a: 1 }, 200), "x")).toEqual({ a: 1 });
  });

  it("throws the readable error for failed responses", async () => {
    await expect(parseJsonResponse(jsonResponse({ error: "Nope" }, 400), "x")).rejects.toThrow("Nope");
    await expect(parseJsonResponse(new Response("", { status: 413 }), "x")).rejects.toThrow(/too large/);
  });

  it("throws a generic error for an ok response with a non-JSON body", async () => {
    await expect(parseJsonResponse(new Response("<html>", { status: 200 }), "x")).rejects.toThrow(
      "The server returned an unexpected response."
    );
  });
});
