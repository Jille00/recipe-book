import { describe, expect, it } from "vitest";
import {
  CONFIRM_EMAIL_PATH,
  EMAIL_CHANGE_PARAM,
  isEmailChangeToken,
  parseEmailChangeStage,
  withConfirmationLanding,
} from "./auth-links";

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

describe("withConfirmationLanding for an email change", () => {
  const stageOf = (result: string) =>
    new URL(callbackOf(result)!, "https://www.kookboek.app").searchParams.get(EMAIL_CHANGE_PARAM);

  it("marks the landing with the stage and keeps the destination", () => {
    const result = withConfirmationLanding(link("/settings"), { emailChange: "approved" });
    expect(new URL(callbackOf(result)!, "https://x.test").pathname).toBe(CONFIRM_EMAIL_PATH);
    expect(stageOf(result)).toBe("approved");
    expect(nextOf(result)).toBe("/settings");
  });

  it("marks the landing when there is no destination", () => {
    const result = withConfirmationLanding(link("/"), { emailChange: "done" });
    expect(callbackOf(result)).toBe("/confirm-email?change=done");
  });

  // better-auth builds the second link from the landing of the first one.
  it("replaces the stage on an existing confirmation callback", () => {
    const first = withConfirmationLanding(link("/settings"), { emailChange: "approved" });
    const second = withConfirmationLanding(link(callbackOf(first)!), { emailChange: "done" });
    expect(stageOf(second)).toBe("done");
    expect(nextOf(second)).toBe("/settings");
    expect(new URL(callbackOf(second)!, "https://x.test").searchParams.getAll("change")).toHaveLength(1);
  });

  it("still drops an external destination", () => {
    const result = withConfirmationLanding(link("https://evil.com"), { emailChange: "approved" });
    expect(result).not.toContain("evil");
    expect(stageOf(result)).toBe("approved");
  });
});

describe("parseEmailChangeStage", () => {
  it.each([
    ["approved", "approved"],
    ["done", "done"],
    ["other", null],
    [undefined, null],
    [["done"], null],
  ])("parses %j", (value, expected) => {
    expect(parseEmailChangeStage(value)).toBe(expected);
  });
});

describe("isEmailChangeToken", () => {
  const jwt = (payload: object) => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
  };

  it("recognises a change-email token", () => {
    expect(
      isEmailChangeToken(
        jwt({ email: "old@example.com", updateTo: "new@example.com", requestType: "change-email-verification" })
      )
    ).toBe(true);
  });

  it("treats a sign-up confirmation token as not a change", () => {
    expect(isEmailChangeToken(jwt({ email: "jo@example.com" }))).toBe(false);
  });

  it("decodes base64url payloads that need padding and use - or _", () => {
    // "ÿÿ" style bytes produce - and _ in base64url.
    expect(isEmailChangeToken(jwt({ updateTo: "ÿþ@example.com?>>" }))).toBe(true);
  });

  it.each(["", "not-a-jwt", "a.%%%.c", "a.bnVsbA.c"])("returns false for %j", (token) => {
    expect(isEmailChangeToken(token)).toBe(false);
  });
});
