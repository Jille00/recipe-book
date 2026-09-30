import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {}, recipe: {}, recipeTag: {}, user: {}, favorite: {} }));

const { containsPattern } = await import("./search");

describe("containsPattern", () => {
  it("wraps plain text in wildcards", () => {
    expect(containsPattern("soup")).toBe("%soup%");
  });

  it("escapes LIKE wildcards and the escape character", () => {
    expect(containsPattern("100%")).toBe("%100\\%%");
    expect(containsPattern("a_b")).toBe("%a\\_b%");
    expect(containsPattern("a\\b")).toBe("%a\\\\b%");
  });
});
