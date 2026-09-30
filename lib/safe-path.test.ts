import { describe, expect, it } from "vitest";
import { isSafeRelativePath, safeRelativePath } from "./safe-path";

describe("isSafeRelativePath", () => {
  it.each(["/", "/dashboard", "/r/abc/pasta?x=1#top", "/browse?q=a,b"])(
    "accepts %s",
    (path) => {
      expect(isSafeRelativePath(path)).toBe(true);
    }
  );

  it.each([
    null,
    undefined,
    "",
    "dashboard",
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "https://evil.example",
    "javascript:alert(1)",
  ])("rejects %j", (path) => {
    expect(isSafeRelativePath(path)).toBe(false);
  });
});

describe("safeRelativePath", () => {
  it("falls back for unsafe paths", () => {
    expect(safeRelativePath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeRelativePath("/favorites", "/dashboard")).toBe("/favorites");
  });
});
