import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeImage } from "./sanitize-image";

async function photoWithGps() {
  return sharp({
    create: { width: 40, height: 20, channels: 3, background: "#c0634b" },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "PhoneCo", Model: "Phone 15" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "52/1 22/1 0/1" },
    })
    .toBuffer();
}

describe("sanitizeImage", () => {
  it("removes EXIF (GPS, device) from a JPEG", async () => {
    const input = await photoWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const output = await sanitizeImage(input, "image/jpeg");
    const meta = await sharp(output).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe("jpeg");
  });

  it("applies the EXIF orientation before dropping it", async () => {
    // Orientation 6 = rotate 90° clockwise: 40x20 becomes 20x40.
    const rotated = await sharp(await photoWithGps())
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);
    const output = await sanitizeImage(rotated, "image/jpeg");
    const meta = await sharp(output).metadata();
    expect([meta.width, meta.height]).toEqual([20, 40]);
    expect(meta.orientation).toBeUndefined();
  });

  it("keeps the format of PNG and WebP", async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 4, background: "#fff" } });
    const png = await sanitizeImage(await base.clone().png().toBuffer(), "image/png");
    const webp = await sanitizeImage(await base.clone().webp().toBuffer(), "image/webp");
    expect((await sharp(png).metadata()).format).toBe("png");
    expect((await sharp(webp).metadata()).format).toBe("webp");
  });

  it("rejects data that isn't a decodable image", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("not really a jpeg")]);
    await expect(sanitizeImage(fake, "image/jpeg")).rejects.toThrow();
  });
});
