import { describe, expect, it } from "vitest";
import {
  isUniqueViolation,
  postgresErrorCode,
  profileDescription,
  websiteLink,
} from "./public-profile";

describe("websiteLink", () => {
  it("links http(s) URLs with a readable label", () => {
    expect(websiteLink("https://www.example.com/")).toEqual({
      href: "https://www.example.com/",
      label: "example.com",
    });
    expect(websiteLink("http://blog.example.com/recipes/")).toEqual({
      href: "http://blog.example.com/recipes/",
      label: "blog.example.com/recipes",
    });
  });

  it("refuses anything that is not http(s)", () => {
    expect(websiteLink("javascript:alert(1)")).toBeNull();
    expect(websiteLink("data:text/html,hi")).toBeNull();
    expect(websiteLink("ftp://example.com")).toBeNull();
    expect(websiteLink("example.com")).toBeNull();
    expect(websiteLink("")).toBeNull();
    expect(websiteLink(null)).toBeNull();
  });
});

describe("profileDescription", () => {
  it("uses the bio, shortened to 160 characters", () => {
    expect(profileDescription("Jille", "  I bake bread.  ", 3)).toBe("I bake bread.");
    const long = profileDescription("Jille", "x".repeat(300), 3);
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("...")).toBe(true);
  });

  it("falls back to the recipe count", () => {
    expect(profileDescription("Jille", null, 1)).toBe("Jille on Kookboek: 1 public recipe.");
    expect(profileDescription("Jille", "", 4)).toBe("Jille on Kookboek: 4 public recipes.");
  });
});

describe("postgresErrorCode / isUniqueViolation", () => {
  it("reads the code from the error or its cause chain", () => {
    expect(postgresErrorCode({ code: "23505" })).toBe("23505");
    expect(postgresErrorCode(new Error("wrapped", { cause: { code: "23514" } }))).toBe("23514");
    expect(isUniqueViolation(new Error("wrapped", { cause: { code: "23505" } }))).toBe(true);
  });

  it("ignores non-SQLSTATE codes and plain errors", () => {
    expect(postgresErrorCode({ code: "ECONNRESET" })).toBeUndefined();
    expect(postgresErrorCode(new Error("nope"))).toBeUndefined();
    expect(isUniqueViolation(null)).toBe(false);
  });
});
