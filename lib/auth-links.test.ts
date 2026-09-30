import { describe, it, expect } from "vitest";
import { withConfirmationLanding, CONFIRM_EMAIL_PATH } from "@/lib/auth-links";

const BASE = "https://www.kookboek.app/api/auth/verify-email?token=abc123";

function callbackOf(url: string) {
  return new URL(url).searchParams.get("callbackURL");
}

function withCallback(callbackURL: string) {
  return `${BASE}&callbackURL=${encodeURIComponent(callbackURL)}`;
}

describe("withConfirmationLanding", () => {
  it("adds the confirmation landing when no callbackURL is present", () => {
    const out = withConfirmationLanding(BASE);
    expect(callbackOf(out)).toBe(CONFIRM_EMAIL_PATH);
    expect(new URL(out).searchParams.get("token")).toBe("abc123");
  });

  it("replaces the default '/' callback with the landing page", () => {
    expect(callbackOf(withConfirmationLanding(withCallback("/")))).toBe("/confirm-email");
  });

  it("carries a same-site destination forward as `next`", () => {
    const out = withConfirmationLanding(withCallback("/recipes/new?x=1&y=2"));
    const landing = callbackOf(out)!;
    expect(landing.startsWith("/confirm-email?next=")).toBe(true);
    const next = new URL(landing, "https://x.test").searchParams.get("next");
    expect(next).toBe("/recipes/new?x=1&y=2");
  });

  it("drops absolute and protocol-relative destinations", () => {
    expect(callbackOf(withConfirmationLanding(withCallback("https://evil.example/")))).toBe(CONFIRM_EMAIL_PATH);
    expect(callbackOf(withConfirmationLanding(withCallback("//evil.example/")))).toBe(CONFIRM_EMAIL_PATH);
    expect(callbackOf(withConfirmationLanding(withCallback("javascript:alert(1)")))).toBe(CONFIRM_EMAIL_PATH);
    expect(callbackOf(withConfirmationLanding(withCallback("recipes")))).toBe(CONFIRM_EMAIL_PATH);
  });

  it("leaves a callback that already lands on the confirmation page untouched", () => {
    const input = withCallback("/confirm-email?next=%2Fbrowse");
    expect(withConfirmationLanding(input)).toBe(new URL(input).toString());
  });

  it("preserves other query parameters and the path", () => {
    const out = new URL(withConfirmationLanding(`${BASE}&foo=bar`));
    expect(out.pathname).toBe("/api/auth/verify-email");
    expect(out.searchParams.get("foo")).toBe("bar");
  });

  it("throws on a non-absolute verification URL", () => {
    expect(() => withConfirmationLanding("/api/auth/verify-email")).toThrow();
  });

  it("drops backslash-prefixed destinations", () => {
    expect(callbackOf(withConfirmationLanding(withCallback("/\\evil.example")))).toBe(CONFIRM_EMAIL_PATH);
  });
});
