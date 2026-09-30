import { describe, expect, it } from "vitest";
import { normalizeRecipeLink } from "./link-input";

describe("normalizeRecipeLink", () => {
  it.each([
    ["https://www.bbcgoodfood.com/recipes/easy-chocolate-cake", "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake"],
    ["  http://example.com/recipe  ", "http://example.com/recipe"],
    ["www.example.com/recipe", "https://www.example.com/recipe"],
    ["example.com", "https://example.com/"],
    ["HTTPS://Example.com/Soup", "https://example.com/Soup"],
  ])("accepts %j", (input, expected) => {
    expect(normalizeRecipeLink(input)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["soup"],
    ["not a link"],
    ["ftp://example.com/file"],
    ["javascript:alert(1)"],
    ["mailto:chef@example.com"],
    ["https://"],
    ["https://localhost"],
    ["https://.example.com"],
    ["https://example..com"],
    [`https://example.com/${"a".repeat(2100)}`],
  ])("rejects %j", (input) => {
    expect(normalizeRecipeLink(input)).toBeNull();
  });
});
