import { describe, expect, it } from "vitest";
import { CONFIRM_EMAIL_PATH, withConfirmationLanding } from "./auth-links";

const BASE = "https://www.kookboek.app/api/auth/verify-email";

const link = (callbackURL?: string) => {
  const url = new URL(BASE);
  url.searchParams.set("token", "tok.en-123_abc");
  if (callbackURL !== undefined) url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
};

const callbackOf = (result: string) => new URL(result).searchParams.get("callbackURL");

/** The `next` carried inside the rewritten callback, if any. */
const nextOf = (result: string) => {
  const callback = callbackOf(result);
  return callback ? new URL(callback, "https://www.kookboek.app").searchParams.get("next") : null;
};

describe("withConfirmationLanding", () => {
  it("lands the default / callback on the confirmation page", () => {
    const result = withConfirmationLanding(link("/"));
    expect(callbackOf(result)).toBe(CONFIRM_EMAIL_PATH);
    expect(nextOf(result)).toBeNull();
  });

  it("lands a link without a callback on the confirmation page", () => {
    const result = withConfirmationLanding(link());
    expect(callbackOf(result)).toBe("/confirm-email");
  });

  // Regression: these bypassed a "doesn't start with //" check, because
  // browsers treat a backslash as a slash and strip tabs and newlines, so each
  // one really points at another site.
  it.each([
    ["backslash after the slash", "/\\evil.com"],
    ["slash and backslash", "/\\/evil.com"],
    ["tab between slashes", "/\t/evil.com"],
    ["newline between slashes", "/\n/evil.com"],
  ])("drops a destination on another site disguised with a %s", (_label, destination) => {
    const result = withConfirmationLanding(link(destination));
    expect(callbackOf(result)).toBe(CONFIRM_EMAIL_PATH);
    expect(nextOf(result)).toBeNull();
  });

  it("keeps a same-site destination as next", () => {
    const result = withConfirmationLanding(link("/r/aB3xK9pQ/pancakes"));
    expect(new URL(callbackOf(result)!, "https://x.test").pathname).toBe(CONFIRM_EMAIL_PATH);
    expect(nextOf(result)).toBe("/r/aB3xK9pQ/pancakes");
  });

  it("keeps the query string of a same-site destination intact", () => {
    const result = withConfirmationLanding(link("/recipes?tab=mine&page=2"));
    expect(nextOf(result)).toBe("/recipes?tab=mine&page=2");
  });

  it("leaves an existing confirmation callback untouched", () => {
    const original = link("/confirm-email?next=%2Frecipes");
    const result = withConfirmationLanding(original);
    expect(callbackOf(result)).toBe("/confirm-email?next=%2Frecipes");
    expect(result).toBe(original);
  });

  it.each([
    "//evil.com",
    "//evil.com/r/abc",
    "https://evil.com/phish",
    "http://www.kookboek.app.evil.com/",
    "javascript:alert(1)",
    "evil.com",
  ])("drops the external or unsafe destination %j", (callback) => {
    const result = withConfirmationLanding(link(callback));
    expect(callbackOf(result)).toBe(CONFIRM_EMAIL_PATH);
    expect(result).not.toContain("evil");
    expect(result).not.toContain("javascript");
  });

  it("preserves the token and the rest of the link", () => {
    const result = new URL(withConfirmationLanding(link("/recipes")));
    expect(result.origin).toBe("https://www.kookboek.app");
    expect(result.pathname).toBe("/api/auth/verify-email");
    expect(result.searchParams.get("token")).toBe("tok.en-123_abc");
  });

  it("does not duplicate the callbackURL parameter", () => {
    const result = new URL(withConfirmationLanding(link("/recipes")));
    expect(result.searchParams.getAll("callbackURL")).toHaveLength(1);
  });
});
