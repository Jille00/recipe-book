import { describe, expect, it } from "vitest";
import { nameProblem, passwordProblem } from "./auth-rules";

describe("passwordProblem", () => {
  it("accepts a password with lower, upper and a digit", () => {
    expect(passwordProblem("Kookboek1")).toBeNull();
  });

  it.each([
    [undefined, "Password is required"],
    ["Ab1", "Password must be at least 8 characters"],
    ["aaaaaaaa", "Password must contain an uppercase letter"],
    ["AAAAAAAA1", "Password must contain a lowercase letter"],
    ["Aaaaaaaaa", "Password must contain a number"],
    [`Aa1${"x".repeat(200)}`, "Password must be 128 characters or less"],
  ])("rejects %j", (password, message) => {
    expect(passwordProblem(password)).toBe(message);
  });
});

describe("nameProblem", () => {
  it.each(["Jille", "  Jo  "])("accepts %j", (name) => {
    expect(nameProblem(name)).toBeNull();
  });

  it.each([undefined, 42, "", "   ", "x".repeat(101)])("rejects %j", (name) => {
    expect(nameProblem(name)).not.toBeNull();
  });
});
