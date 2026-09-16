/**
 * HEIC decoding for browsers that can't do it themselves.
 *
 * iPhones save photos as HEIC. Safari (and every iOS browser, which all use
 * WebKit) decodes it natively, but desktop Chrome and Firefox cannot: an <img>
 * shows a broken image and createImageBitmap throws. Without this, those
 * browsers can neither preview a HEIC photo nor shrink it to fit the upload
 * limit, so a large one could not be imported at all.
 *
 * libheif is the same decoder the server already uses to convert HEIC. Its
 * WebAssembly build is about 1.4MB, so it is loaded lazily and only when a
 * browser actually fails to decode a HEIC file.
 *
 * Browser-only. Call from event handlers, never during render.
 */

import type createLibHeif from "libheif-js/libheif-wasm/libheif-bundle.mjs";

type LibHeif = ReturnType<typeof createLibHeif>;

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/** Recognises HEIC by type or, because browsers often report none, by name. */
export function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

let libheifPromise: Promise<LibHeif> | null = null;

function loadLibheif(): Promise<LibHeif> {
  if (!libheifPromise) {
    libheifPromise = import("libheif-js/libheif-wasm/libheif-bundle.mjs").then(
      (mod) => mod.default()
    );
    // A failed download (flaky connection) should not poison later attempts.
    libheifPromise.catch(() => {
      libheifPromise = null;
    });
  }
  return libheifPromise;
}

export interface DecodedHeic {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Decodes a HEIC file onto a canvas, upright. Returns null if it can't be
 * decoded, so callers can fall back instead of failing.
 *
 * A HEIC file can hold several images (thumbnails, bursts, depth maps). The
 * largest one is the photo itself.
 */
export async function decodeHeicToCanvas(file: File): Promise<DecodedHeic | null> {
  if (typeof document === "undefined") return null;

  let images: ReturnType<InstanceType<LibHeif["HeifDecoder"]>["decode"]> = [];
  try {
    const libheif = await loadLibheif();
    const bytes = new Uint8Array(await file.arrayBuffer());
    images = new libheif.HeifDecoder().decode(bytes);
    if (images.length === 0) return null;

    const image = images.reduce((largest, candidate) =>
      candidate.get_width() * candidate.get_height() >
      largest.get_width() * largest.get_height()
        ? candidate
        : largest
    );
    const width = image.get_width();
    const height = image.get_height();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);
    await new Promise<void>((resolve, reject) => {
      image.display(imageData, (result) =>
        result ? resolve() : reject(new Error("HEIC decoding failed"))
      );
    });
    ctx.putImageData(imageData, 0, 0);

    return { canvas, width, height };
  } catch {
    return null;
  } finally {
    // The decoded pixels live in WebAssembly memory until freed; a 12MP photo
    // is about 48MB, so release every image as soon as we're done.
    for (const image of images) image.free?.();
  }
}
