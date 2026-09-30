import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./recipe-json-ld";

describe("serializeJsonLd", () => {
  it("cannot close the surrounding script tag", () => {
    const title = "</script><img src=x onerror=alert(1)>";
    const out = serializeJsonLd({ name: title });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({ name: title });
  });

  it("escapes ampersands and line separators without changing the data", () => {
    const value = { a: "salt & pepper", b: "x\u2028y\u2029z" };
    const out = serializeJsonLd(value);
    expect(out).not.toMatch(/[&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(value);
  });

  it("drops undefined values", () => {
    expect(serializeJsonLd({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});
