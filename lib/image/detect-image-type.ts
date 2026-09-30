/**
 * Server-side image type detection from magic bytes. Client-declared MIME
 * types and file names are attacker controlled, so uploads and imported
 * photos are validated by their content instead.
 */

export type DetectedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/heic";
  ext: "jpg" | "png" | "webp" | "gif" | "heic";
};

const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/**
 * Determine the real image type from the file's magic bytes. The
 * client-declared `file.type` and `file.name` are attacker controlled, so they
 * are never trusted for validation or for the stored object's extension.
 */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // GIF: "GIF87a" / "GIF89a"
  const header6 = buffer.subarray(0, 6).toString("latin1");
  if (header6 === "GIF87a" || header6 === "GIF89a") {
    return { mime: "image/gif", ext: "gif" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // HEIC/HEIF: ISO-BMFF box with "ftyp" at offset 4 and a HEIF brand
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("latin1");
    if (HEIF_BRANDS.has(brand)) {
      return { mime: "image/heic", ext: "heic" };
    }
  }

  return null;
}
