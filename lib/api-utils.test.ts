import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canAccessRecipe,
  getRequestOrigin,
  invalidIdResponse,
  isUuid,
  parsePaginationParam,
} from "./api-utils";

describe("isUuid", () => {
  it.each([
    "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "3F2504E0-4F89-41D3-9A0C-0305E82C3301",
    "00000000-0000-0000-0000-000000000000",
  ])("accepts %s", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    "",
    "not-a-uuid",
    "3f2504e04f8941d39a0c0305e82c3301",
    "3f2504e0-4f89-41d3-9a0c-0305e82c330",
    "3f2504e0-4f89-41d3-9a0c-0305e82c33011",
    " 3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "3f2504e0-4f89-41d3-9a0c-0305e82c3301\n",
    "g f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "3f2504e0-4f89-41d3-9a0c-0305e82c3301' OR 1=1",
  ])("rejects %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("invalidIdResponse", () => {
  it("returns a 400 naming the resource", async () => {
    const response = invalidIdResponse("recipe");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid recipe id" });
  });

  it("uses a generic name by default", async () => {
    const response = invalidIdResponse();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid resource id" });
  });
});

describe("parsePaginationParam", () => {
  const range = { fallback: 20, min: 1, max: 100 };

  it.each([
    [null, 20],
    ["", 20],
    ["   ", 20],
    ["abc", 20],
    ["NaN", 20],
    ["Infinity", 20],
    ["-Infinity", 20],
    ["10abc", 20],
  ])("falls back for %j", (raw, expected) => {
    expect(parsePaginationParam(raw, range)).toBe(expected);
  });

  it.each([
    ["1", 1],
    ["50", 50],
    ["100", 100],
    ["2.9", 2],
    ["1e1", 10],
  ])("parses %j as %d", (raw, expected) => {
    expect(parsePaginationParam(raw, range)).toBe(expected);
  });

  it.each([
    ["0", 1],
    ["-5", 1],
    ["101", 100],
    ["999999", 100],
    ["0.5", 1],
  ])("clamps out-of-range %j to %d", (raw, expected) => {
    expect(parsePaginationParam(raw, range)).toBe(expected);
  });

  it("allows an offset of 0 when min is 0", () => {
    expect(parsePaginationParam("0", { fallback: 0, min: 0, max: 1000 })).toBe(0);
    expect(parsePaginationParam("-1", { fallback: 0, min: 0, max: 1000 })).toBe(0);
  });
});

describe("getRequestOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the configured public URL and strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.kookboek.app///");
    const request = new Request("http://internal:3000/api/x", {
      headers: { "x-forwarded-host": "other.example", "x-forwarded-proto": "http" },
    });
    expect(getRequestOrigin(request)).toBe("https://www.kookboek.app");
  });

  it("uses the forwarded host and protocol without a configured URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const request = new Request("http://internal:3000/api/x", {
      headers: { "x-forwarded-host": "preview.example.com", "x-forwarded-proto": "http" },
    });
    expect(getRequestOrigin(request)).toBe("http://preview.example.com");
  });

  it("assumes https when only the forwarded host is present", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const request = new Request("http://internal:3000/api/x", {
      headers: { "x-forwarded-host": "preview.example.com" },
    });
    expect(getRequestOrigin(request)).toBe("https://preview.example.com");
  });

  it("falls back to the request URL's origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const request = new Request("http://localhost:3000/api/recipes?page=2");
    expect(getRequestOrigin(request)).toBe("http://localhost:3000");
  });

  it("never returns an undefined origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    const origin = getRequestOrigin(new Request("https://example.com/a"));
    expect(origin).toBe("https://example.com");
    expect(origin).not.toContain("undefined");
  });
});

describe("canAccessRecipe", () => {
  const OWNER = "owner-1";
  const OTHER = "user-2";
  const CODE = "aB3xK9pQ";

  const unlisted = { isPublic: false, userId: OWNER, code: CODE };
  const unlistedNull = { isPublic: null, userId: OWNER, code: CODE };
  const published = { isPublic: true, userId: OWNER, code: CODE };

  describe("public recipes", () => {
    it("are open to anonymous visitors without a code", () => {
      expect(canAccessRecipe(published, null)).toBe(true);
      expect(canAccessRecipe(published, undefined)).toBe(true);
    });

    it("are open to signed-in non-owners, even with a wrong code", () => {
      expect(canAccessRecipe(published, OTHER)).toBe(true);
      expect(canAccessRecipe(published, OTHER, "wrong")).toBe(true);
    });
  });

  describe("the owner", () => {
    it("can always open their unlisted recipe", () => {
      expect(canAccessRecipe(unlisted, OWNER)).toBe(true);
      expect(canAccessRecipe(unlisted, OWNER, "wrong")).toBe(true);
      expect(canAccessRecipe(unlistedNull, OWNER, null)).toBe(true);
    });
  });

  describe("unlisted recipes with the correct code", () => {
    it("open for anonymous visitors", () => {
      expect(canAccessRecipe(unlisted, null, CODE)).toBe(true);
      expect(canAccessRecipe(unlisted, undefined, CODE)).toBe(true);
    });

    it("open for signed-in non-owners", () => {
      expect(canAccessRecipe(unlisted, OTHER, CODE)).toBe(true);
    });

    it("treat a null isPublic as unlisted", () => {
      expect(canAccessRecipe(unlistedNull, null, CODE)).toBe(true);
      expect(canAccessRecipe(unlistedNull, null)).toBe(false);
    });
  });

  describe("unlisted recipes are refused", () => {
    it.each([
      ["a missing code", undefined],
      ["a null code", null],
      ["an empty code", ""],
      ["a wrong code", "zZ9yY8xX"],
      ["a differently-cased code", CODE.toLowerCase()],
      ["an upper-cased code", CODE.toUpperCase()],
      ["a code with whitespace", ` ${CODE} `],
      ["a prefix of the code", CODE.slice(0, 4)],
    ])("with %s for anonymous visitors and non-owners", (_label, code) => {
      expect(canAccessRecipe(unlisted, null, code)).toBe(false);
      expect(canAccessRecipe(unlisted, OTHER, code)).toBe(false);
    });

    it("for an empty viewer id, which is not the owner", () => {
      expect(canAccessRecipe({ ...unlisted, userId: "" }, "")).toBe(false);
    });

    it("when the recipe itself has an empty code and none is presented", () => {
      expect(canAccessRecipe({ ...unlisted, code: "" }, OTHER, "")).toBe(false);
    });
  });
});
