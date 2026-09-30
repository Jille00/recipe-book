import { describe, it, expect } from "vitest";
import { isHeicFile } from "./decode-heic";

const f = (name: string, type: string) => new File([new Uint8Array(1)], name, { type });

describe("isHeicFile", () => {
  it.each(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence", "IMAGE/HEIC"])(
    "recognises type %s",
    (type) => {
      expect(isHeicFile(f("x.bin", type))).toBe(true);
    }
  );

  it("recognises the extension when the type is missing or generic", () => {
    expect(isHeicFile(f("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeicFile(f("scan.heif", "application/octet-stream"))).toBe(true);
  });

  it("rejects other images", () => {
    expect(isHeicFile(f("photo.jpg", "image/jpeg"))).toBe(false);
    expect(isHeicFile(f("heic.png", "image/png"))).toBe(false);
  });
});
