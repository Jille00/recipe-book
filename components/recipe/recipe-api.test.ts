import { describe, it, expect } from "vitest";
import { withRecipeCode } from "./recipe-api";

describe("withRecipeCode", () => {
  it("returns the path unchanged without a code", () => {
    expect(withRecipeCode("/api/recipes/1/comments", undefined)).toBe("/api/recipes/1/comments");
    expect(withRecipeCode("/api/recipes/1/comments", "")).toBe("/api/recipes/1/comments");
  });

  it("appends ?code= to a path without a query", () => {
    expect(withRecipeCode("/api/recipes/1/rating", "abc")).toBe("/api/recipes/1/rating?code=abc");
  });

  it("appends &code= to a path with a query", () => {
    expect(withRecipeCode("/api/x?limit=10", "abc")).toBe("/api/x?limit=10&code=abc");
  });

  it("URL-encodes the code", () => {
    expect(withRecipeCode("/api/x", "a b&c=d")).toBe("/api/x?code=a%20b%26c%3Dd");
  });
});
