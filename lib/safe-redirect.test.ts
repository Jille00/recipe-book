import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

const FALLBACK = "/dashboard";

describe("safeRedirectPath", () => {
  it.each([
    ["/favorites", "/favorites"],
    ["/r/abc123/pasta", "/r/abc123/pasta"],
    ["/browse?q=soup&page=2", "/browse?q=soup&page=2"],
    ["/recipes#top", "/recipes#top"],
    ["/", "/"],
  ])("keeps the same-site path %j", (input, expected) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(expected);
  });

  // Every one of these is a link to another site once a browser normalises it.
  it.each([
    ["protocol-relative", "//evil.com"],
    ["backslash after the slash", "/\\evil.com"],
    ["slash and backslash", "/\\/evil.com"],
    ["backslash and slash", "//\\evil.com"],
    ["tab between slashes", "/\t/evil.com"],
    ["newline between slashes", "/\n/evil.com"],
    ["carriage return between slashes", "/\r/evil.com"],
    ["several tabs between slashes", "/\t\t/evil.com"],
    ["protocol-relative with credentials", "//user@evil.com"],
  ])("refuses %s", (_label, input) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    ["absolute URL to another site", "https://evil.com/x"],
    ["absolute URL to this site", "https://www.kookboek.app/x"],
    ["javascript: URL", "javascript:alert(1)"],
    ["data: URL", "data:text/html,hi"],
    ["relative path without a leading slash", "favorites"],
    ["leading backslashes", "\\\\evil.com"],
    ["empty string", ""],
  ])("refuses %s", (_label, input) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(FALLBACK);
  });

  it("refuses missing values", () => {
    expect(safeRedirectPath(null, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("returns the browser-normalised path, not the raw input", () => {
    // A tab inside an ordinary path is removed, as a browser would.
    expect(safeRedirectPath("/fav\torites", FALLBACK)).toBe("/favorites");
    // Dot segments are resolved.
    expect(safeRedirectPath("/a/../favorites", FALLBACK)).toBe("/favorites");
  });
});
