/**
 * Shared client-side validation and response handling for the recipe image
 * uploads (single photo upload and the multi-image import modal).
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB - matches the upload UI copy
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10MB per image in the import modal
export const MAX_IMPORT_FILES = 10;

export const UPLOAD_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const IMPORT_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const EXTENSION_BY_TYPE: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)}MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/**
 * Validate a file picked through the input *or* dropped on the dropzone.
 * Drag-and-drop bypasses the input's `accept` filter entirely, so this has to
 * run for both paths. Returns an error message, or null when the file is fine.
 */
export function validateImageFile(
  file: File,
  maxBytes: number,
  allowedTypes: string[]
): string | null {
  const name = file.name.toLowerCase();
  const allowedExtensions = allowedTypes.flatMap(
    (type) => EXTENSION_BY_TYPE[type] ?? []
  );

  // Some browsers report an empty type for HEIC/HEIF, so fall back to the
  // file extension before rejecting.
  const typeAllowed = file.type
    ? allowedTypes.includes(file.type.toLowerCase())
    : allowedExtensions.some((ext) => name.endsWith(ext));

  if (!typeAllowed) {
    return `"${file.name}" is not a supported image (${allowedExtensions
      .map((ext) => ext.replace(".", "").toUpperCase())
      .filter((ext, i, all) => all.indexOf(ext) === i)
      .join(", ")}).`;
  }

  if (file.size === 0) {
    return `"${file.name}" is empty.`;
  }

  if (file.size > maxBytes) {
    return `"${file.name}" is ${formatBytes(file.size)}; the maximum is ${formatBytes(maxBytes)}.`;
  }

  return null;
}

/**
 * Turn a failed response into a readable message. The body is only parsed as
 * JSON when the server says it is JSON - a 413 from the proxy or a 504 from
 * the gateway answers with HTML, and blindly calling `response.json()` on that
 * surfaces to the user as "Unexpected token '<'".
 */
export async function readResponseError(
  response: Response,
  fallback: string
): Promise<string> {
  if (response.status === 401 || response.status === 403) {
    return "Your session has expired. Please sign in again.";
  }
  if (response.status === 413) {
    return "That file is too large for the server to accept.";
  }
  if (response.status === 504 || response.status === 408) {
    return "The server took too long to respond. Please try again.";
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      if (data?.error) return String(data.error);
    } catch {
      // Fall through to the generic message
    }
  }

  return `${fallback} (${response.status})`;
}

/**
 * Read a successful response as JSON, checking the status first.
 * Throws an `Error` carrying a user-presentable message otherwise.
 */
export async function parseJsonResponse<T>(
  response: Response,
  fallback: string
): Promise<T> {
  if (!response.ok) {
    throw new Error(await readResponseError(response, fallback));
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("The server returned an unexpected response.");
  }
}
