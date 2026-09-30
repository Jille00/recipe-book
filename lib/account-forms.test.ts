import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  DELETE_CONFIRMATION,
  firstInvalidField,
  validateChangeEmail,
  validateChangePassword,
  validateDeleteAccount,
} from "./account-forms";

describe("validateChangePassword", () => {
  const valid = { currentPassword: "OldPass1", newPassword: "NewPass12", confirmPassword: "NewPass12" };

  it("accepts a strong, matching, different password", () => {
    expect(validateChangePassword(valid)).toEqual({});
  });

  it("requires every field", () => {
    expect(
      validateChangePassword({ currentPassword: "", newPassword: "", confirmPassword: "" })
    ).toEqual({
      currentPassword: "Enter your current password",
      newPassword: "New password must be at least 8 characters",
      confirmPassword: "Confirm your new password",
    });
  });

  it.each([
    ["short", "Ab1", "New password must be at least 8 characters"],
    ["no uppercase", "newpass12", "New password must contain an uppercase letter"],
    ["no lowercase", "NEWPASS12", "New password must contain a lowercase letter"],
    ["no number", "NewPassword", "New password must contain a number"],
    ["too long", `Aa1${"x".repeat(126)}`, "New password must be 128 characters or less"],
  ])("applies the server's password rules (%s)", (_label, newPassword, message) => {
    expect(
      validateChangePassword({ ...valid, newPassword, confirmPassword: newPassword }).newPassword
    ).toBe(message);
  });

  it("rejects reusing the current password", () => {
    expect(
      validateChangePassword({ currentPassword: "Same1234", newPassword: "Same1234", confirmPassword: "Same1234" })
        .newPassword
    ).toMatch(/differs/);
  });

  it("rejects a mismatched confirmation", () => {
    expect(validateChangePassword({ ...valid, confirmPassword: "NewPass13" })).toEqual({
      confirmPassword: "Passwords don't match",
    });
  });
});

describe("validateChangeEmail", () => {
  it("accepts a new address", () => {
    expect(validateChangeEmail(" new@example.com ", "old@example.com")).toEqual({});
  });

  it.each(["", "   ", "nope", "a@b", "a b@c.de", `${"x".repeat(250)}@example.com`])(
    "rejects %j",
    (email) => {
      expect(validateChangeEmail(email, "old@example.com").newEmail).toBeTruthy();
    }
  );

  it("rejects the current address, ignoring case", () => {
    expect(validateChangeEmail("Old@Example.com", "old@example.com").newEmail).toBe(
      "That's already your email address"
    );
  });
});

describe("validateDeleteAccount", () => {
  it("needs the password and the typed confirmation", () => {
    expect(validateDeleteAccount({ password: "", confirmation: "delete" })).toEqual({
      password: "Enter your password",
      confirmation: `Type ${DELETE_CONFIRMATION} to confirm`,
    });
  });

  it("accepts the exact word, with stray spaces", () => {
    expect(validateDeleteAccount({ password: "x", confirmation: " DELETE " })).toEqual({});
  });
});

describe("firstInvalidField", () => {
  it("follows form order, not object order", () => {
    expect(firstInvalidField(["a", "b", "c"] as const, { c: "x", b: "y" })).toBe("b");
    expect(firstInvalidField(["a"] as const, {})).toBeUndefined();
  });
});

describe("authErrorMessage", () => {
  it("rewords better-auth's codes", () => {
    expect(authErrorMessage({ code: "INVALID_PASSWORD", message: "Invalid password" }, "x")).toBe(
      "That password is incorrect"
    );
    expect(
      authErrorMessage({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "..." }, "x")
    ).toMatch(/already uses/);
  });

  it("explains rate limiting and expired sessions", () => {
    expect(authErrorMessage({ status: 429 }, "x")).toMatch(/Too many attempts/);
    expect(authErrorMessage({ status: 401 }, "x")).toMatch(/sign in again/);
  });

  it("keeps a readable server message and falls back otherwise", () => {
    expect(authErrorMessage({ code: "BAD_REQUEST", message: "Enter your password" }, "x")).toBe(
      "Enter your password"
    );
    expect(authErrorMessage({}, "Fallback")).toBe("Fallback");
    expect(authErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});
