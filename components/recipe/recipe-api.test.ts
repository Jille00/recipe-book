import { describe, expect, it } from "vitest";
import { withRecipeCode } from "./recipe-api";

describe("withRecipeCode", () => {
  it("adds the code as the first query parameter", () => {
    expect(withRecipeCode("/api/recipes/1/comments", "aB3xK9pQ")).toBe(
      "/api/recipes/1/comments?code=aB3xK9pQ"
    );
  });

  it("appends the code to an existing query", () => {
    expect(withRecipeCode("/api/recipes/1/comments?page=2", "aB3xK9pQ")).toBe(
      "/api/recipes/1/comments?page=2&code=aB3xK9pQ"
    );
  });

  it("leaves the path alone without a code", () => {
    expect(withRecipeCode("/api/recipes/1/comments", undefined)).toBe("/api/recipes/1/comments");
    expect(withRecipeCode("/api/recipes/1/comments?page=2", "")).toBe("/api/recipes/1/comments?page=2");
  });

  it("encodes characters that would change the URL", () => {
    const result = withRecipeCode("/api/r", "a b&c=d/e?#");
    expect(result).toBe("/api/r?code=a%20b%26c%3Dd%2Fe%3F%23");
    expect(new URL(result, "https://x.test").searchParams.get("code")).toBe("a b&c=d/e?#");
  });

  it("produces a URL whose code parameter reads back unchanged", () => {
    const result = withRecipeCode("/api/r?x=1", "Zz_-09");
    const params = new URL(result, "https://x.test").searchParams;
    expect(params.get("code")).toBe("Zz_-09");
    expect(params.get("x")).toBe("1");
  });
});
