/**
 * Client-side image shrinking for uploads.
 *
 * Vercel Functions reject any request body over ~4.5MB (in practice ~4.0-4.3MB
 * including multipart framing) with `413 FUNCTION_PAYLOAD_TOO_LARGE` before our
 * route code runs, and that limit cannot be raised. Phone photos are 2-5MB
 * each, so images are decoded and re-encoded as JPEG in the browser until they
 * fit a byte budget the caller chooses.
 *
 * Browser-only at call time: nothing here touches `window`, `document`,
 * `createImageBitmap` or canvases at import time, so the module is safe to
 * import from client components that are also server rendered. Only call
 * `compressImage` from event handlers.
 *
 * The step-down planning (`perImageBudget`, `initialAttempt`, `nextAttempt`)
 * is pure so it can be unit tested outside a browser.
 */

/** Longest edge we start from. Plenty for reading cookbook text. */
export const COMPRESS_MAX_EDGE = 2048;
/**
 * Legibility floor: never shrink the long edge below this (unless the source
 * is already smaller). Below ~1200px small print on a cookbook page and
 * handwriting on a recipe card start to blur for the vision model.
 */
export const COMPRESS_MIN_EDGE = 1200;
/** JPEG qualities tried in order. 0.5 is the lowest we accept. */
export const COMPRESS_QUALITY_STEPS = [0.85, 0.72, 0.6, 0.5] as const;
/**
 * Bytes reserved per multipart part for the boundary line and the
 * Content-Disposition / Content-Type headers (a long file name included).
 */
export const MULTIPART_PART_OVERHEAD_BYTES = 1024;

export interface CompressAttempt {
  /** Target long edge in px (never above the source's long edge). */
  edge: number;
  /** Index into COMPRESS_QUALITY_STEPS. */
  qualityIndex: number;
}

/**
 * Split a whole-request byte budget across `count` images, reserving room for
 * the multipart framing of each part.
 */
export function perImageBudget(totalBudgetBytes: number, count: number): number {
  const n = Math.max(1, Math.floor(count));
  return Math.max(
    0,
    Math.floor((totalBudgetBytes - n * MULTIPART_PART_OVERHEAD_BYTES) / n)
  );
}

/**
 * Whether files of these sizes, sent as one multipart request, stay within
 * `totalBudgetBytes` (framing overhead per part included).
 */
export function fitsRequestBudget(
  fileSizes: readonly number[],
  totalBudgetBytes: number
): boolean {
  const total = fileSizes.reduce(
    (sum, size) => sum + size + MULTIPART_PART_OVERHEAD_BYTES,
    0
  );
  return total <= totalBudgetBytes;
}

/** The legibility floor for a given source (no upscaling). */
export function minEdgeFor(sourceLongEdge: number): number {
  return Math.max(1, Math.min(COMPRESS_MIN_EDGE, Math.round(sourceLongEdge)));
}

export function initialAttempt(sourceLongEdge: number): CompressAttempt {
  return {
    edge: Math.max(1, Math.min(COMPRESS_MAX_EDGE, Math.round(sourceLongEdge))),
    qualityIndex: 0,
  };
}

/**
 * Decide what to try after an encode of `encodedBytes`. Returns null when the
 * result fits the budget or nothing smaller is allowed (floor reached).
 *
 * Order: first drop quality once at full size (resolution matters more than
 * quality for text), then shrink the long edge - jumping straight to the size
 * the byte count suggests, since JPEG size scales roughly with pixel count -
 * down to the legibility floor, and only then keep lowering quality.
 */
export function nextAttempt(
  prev: CompressAttempt,
  encodedBytes: number,
  budgetBytes: number,
  sourceLongEdge: number
): CompressAttempt | null {
  if (encodedBytes <= budgetBytes) return null;

  const floor = minEdgeFor(sourceLongEdge);
  const lastQuality = COMPRESS_QUALITY_STEPS.length - 1;

  // 1. At full size and top quality: try a lower quality first.
  if (prev.qualityIndex === 0) {
    return { edge: prev.edge, qualityIndex: 1 };
  }

  // 2. Shrink dimensions towards the floor.
  if (prev.edge > floor) {
    const ratio = Math.sqrt(Math.max(budgetBytes, 1) / encodedBytes);
    const estimated = Math.floor(prev.edge * ratio * 0.92);
    // Always make real progress (at least 10% smaller), never pass the floor.
    const edge = Math.max(floor, Math.min(estimated, Math.floor(prev.edge * 0.9)));
    return { edge, qualityIndex: prev.qualityIndex };
  }

  // 3. At the floor: lower quality until we run out of steps.
  if (prev.qualityIndex < lastQuality) {
    return { edge: prev.edge, qualityIndex: prev.qualityIndex + 1 };
  }

  return null;
}

/** Fit `width` x `height` inside a square of `edge`, keeping aspect ratio. */
export function scaleToEdge(
  width: number,
  height: number,
  edge: number
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= edge) return { width, height };
  const scale = edge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface CompressImageOptions {
  /** Byte budget for this single image. */
  maxBytes: number;
  /**
   * MIME types the server accepts as-is. A file of one of these types that
   * already fits `maxBytes` is returned untouched.
   */
  keepTypes: readonly string[];
}

export interface CompressImageResult {
  file: File;
  /** True when `file` is a re-encoded JPEG rather than the original. */
  compressed: boolean;
  /** False when the browser could not decode the image (e.g. HEIC on Chrome). */
  decoded: boolean;
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

function effectiveType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  return "";
}

async function decodeWithBitmap(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (err) {
    // Older engines reject the options bag itself with a TypeError; retry
    // without it. Anything else (undecodable data) falls through to <img>.
    if (!(err instanceof TypeError)) return null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return null;
    }
  }

  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  };
}

async function decodeWithImageElement(file: File): Promise<DecodedImage | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return null;
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    // <img> applies EXIF orientation by default (`image-orientation:
    // from-image`), and naturalWidth/Height reflect the rotated image.
    if (!img.naturalWidth || !img.naturalHeight) {
      URL.revokeObjectURL(url);
      return null;
    }
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

async function decodeImage(file: File): Promise<DecodedImage | null> {
  return (await decodeWithBitmap(file)) ?? (await decodeWithImageElement(file));
}

type Encoder = (
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number
) => Promise<Blob | null>;

function prepareContext(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number
) {
  // JPEG has no alpha: paint white so transparent PNG areas don't turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
}

async function encodeWithHtmlCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  prepareContext(ctx, source, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  // Free the backing store right away (matters under iOS memory limits).
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

async function encodeWithOffscreenCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number
): Promise<Blob | null> {
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      prepareContext(ctx, source, width, height);
      return await canvas.convertToBlob({ type: "image/jpeg", quality });
    }
  } catch {
    // Some engines expose OffscreenCanvas without a working 2D/JPEG path.
  }
  return encodeWithHtmlCanvas(source, width, height, quality);
}

function pickEncoder(): Encoder | null {
  if (
    typeof OffscreenCanvas !== "undefined" &&
    typeof OffscreenCanvas.prototype.convertToBlob === "function"
  ) {
    return encodeWithOffscreenCanvas;
  }
  return typeof document === "undefined" ? null : encodeWithHtmlCanvas;
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.jpg`;
}

/**
 * Shrink an image so it fits `maxBytes`, re-encoding as JPEG when needed.
 *
 * - Keeps the original when it is already an accepted type within budget.
 * - Never returns something larger than an accepted original.
 * - If the browser cannot decode the file (HEIC on desktop Chrome/Firefox),
 *   returns the original with `decoded: false`; the caller decides whether
 *   its size is still acceptable.
 * - If the floor is reached and it still does not fit, returns the smallest
 *   encode; the caller checks `file.size`.
 */
export async function compressImage(
  file: File,
  { maxBytes, keepTypes }: CompressImageOptions
): Promise<CompressImageResult> {
  const type = effectiveType(file);
  const keepable = keepTypes.includes(type);

  if (keepable && file.size <= maxBytes) {
    return { file, compressed: false, decoded: true };
  }

  const encode = pickEncoder();
  if (!encode) return { file, compressed: false, decoded: false };

  const decoded = await decodeImage(file);
  if (!decoded) return { file, compressed: false, decoded: false };

  try {
    const sourceLongEdge = Math.max(decoded.width, decoded.height);
    let attempt: CompressAttempt | null = initialAttempt(sourceLongEdge);
    let best: Blob | null = null;

    while (attempt) {
      const { width, height } = scaleToEdge(
        decoded.width,
        decoded.height,
        attempt.edge
      );
      const blob = await encode(
        decoded.source,
        width,
        height,
        COMPRESS_QUALITY_STEPS[attempt.qualityIndex]
      );
      if (!blob) break;
      if (!best || blob.size < best.size) best = blob;
      attempt = nextAttempt(attempt, blob.size, maxBytes, sourceLongEdge);
    }

    if (!best || (keepable && best.size >= file.size)) {
      return { file, compressed: false, decoded: true };
    }

    return {
      file: new File([best], jpegName(file.name), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      }),
      compressed: true,
      decoded: true,
    };
  } finally {
    decoded.release();
  }
}
