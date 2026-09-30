import { describe, expect, it } from "vitest";
import { isHeicFile } from "./decode-heic";

const file = (name: string, type: string) => new File([new Uint8Array([1, 2, 3])], name, { type });

describe("isHeicFile", () => {
  it.each(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence", "IMAGE/HEIC"])(
    "recognises the MIME type %s",
    (type) => {
      expect(isHeicFile(file("photo", type))).toBe(true);
    }
  );

  it("trusts a HEIC MIME type whatever the name", () => {
    expect(isHeicFile(file("IMG_0001.jpg", "image/heic"))).toBe(true);
  });

  it.each(["IMG_0001.heic", "IMG_0001.HEIC", "photo.Heif", "photo.HEIF", "my.photo.heic"])(
    "recognises %s by extension when the browser reports no type",
    (name) => {
      expect(isHeicFile(file(name, ""))).toBe(true);
    }
  );

  it("recognises the extension even with a generic type", () => {
    expect(isHeicFile(file("IMG_0001.HEIC", "application/octet-stream"))).toBe(true);
  });

  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.jpg", ""],
    ["heic.jpg", "image/jpeg"],
    ["photo.heic.jpg", ""],
    ["photoheic", ""],
    ["", ""],
  ])("does not treat %j (%j) as HEIC", (name, type) => {
    expect(isHeicFile(file(name, type))).toBe(false);
  });
});
