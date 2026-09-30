import sharp from "sharp";

// Far above any real photo (a 50MP camera is 8660x5773) while refusing
// decompression bombs: a small file that claims billions of pixels.
const MAX_INPUT_PIXELS = 60_000_000;

export type StorableImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/**
 * Re-encodes an image before it is stored in the public bucket.
 *
 * Photos straight off a phone carry EXIF: GPS coordinates of where they were
 * taken (often the author's kitchen), the device, and the time. Re-encoding
 * drops all of it. The EXIF orientation is applied to the pixels first, so
 * portrait photos stay upright once that tag is gone. Anything sharp can't
 * decode is rejected, which also catches files that only look like images.
 */
export async function sanitizeImage(
  buffer: Buffer,
  contentType: StorableImageType
): Promise<Buffer> {
  const animated = contentType === "image/gif" || contentType === "image/webp";
  const image = sharp(buffer, {
    limitInputPixels: MAX_INPUT_PIXELS,
    animated,
  }).rotate();

  switch (contentType) {
    case "image/jpeg":
      return image.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    case "image/png":
      return image.png({ compressionLevel: 9 }).toBuffer();
    case "image/webp":
      return image.webp({ quality: 88 }).toBuffer();
    case "image/gif":
      return image.gif().toBuffer();
  }
}

export function isStorableImageType(type: string): type is StorableImageType {
  return (
    type === "image/jpeg" || type === "image/png" || type === "image/webp" || type === "image/gif"
  );
}
