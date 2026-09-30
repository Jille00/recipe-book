import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isUuid,
  invalidIdResponse,
  parsePaginationParam,
  getRequestOrigin,
  canAccessRecipe,
} from "@/lib/api-utils";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isUuid", () => {
  it("accepts uuids in either case", () => {
    expect(isUuid("3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e")).toBe(true);
    expect(isUuid("3F2B8C1E-4D5A-4B6C-8D7E-9F0A1B2C3D4E")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it.each([
    "",
    "abc",
    "3f2b8c1e4d5a4b6c8d7e9f0a1b2c3d4e",
    "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4",
    "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4ef",
    " 3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e",
    "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e\n",
    "gggggggg-4d5a-4b6c-8d7e-9f0a1b2c3d4e",
    "{3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e}",
  ])("rejects %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });

  it("rejects null, undefined and non-strings", () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(123 as unknown as string)).toBe(false);
  });
});

describe("invalidIdResponse", () => {
  it("returns a 400 JSON error naming the resource", async () => {
    const res = invalidIdResponse("recipe");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid recipe id" });
  });

  it("defaults the resource name", async () => {
    expect(await invalidIdResponse().json()).toEqual({ error: "Invalid resource id" });
  });
});

describe("parsePaginationParam", () => {
  const opts = { fallback: 20, min: 1, max: 50 };

  it.each([
    [null, 20],
    ["", 20],
    ["   ", 20],
    ["abc", 20],
    ["Infinity", 20],
    ["NaN", 20],
    ["10", 10],
    [" 10 ", 10],
    ["10.9", 10],
    ["0", 1],
    ["-5", 1],
    ["1000", 50],
    ["50", 50],
    ["1e1", 10],
  ])("parses %j as %d", (raw, expected) => {
    expect(parsePaginationParam(raw, opts)).toBe(expected);
  });

  it("supports a zero minimum (offsets)", () => {
    expect(parsePaginationParam("0", { fallback: 0, min: 0, max: 10_000 })).toBe(0);
    expect(parsePaginationParam("-1", { fallback: 0, min: 0, max: 10_000 })).toBe(0);
  });
});

describe("getRequestOrigin", () => {
  it("prefers NEXT_PUBLIC_APP_URL and strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.kookboek.app///");
    const req = new Request("http://internal:3000/api/x", { headers: { "x-forwarded-host": "other.example" } });
    expect(getRequestOrigin(req)).toBe("https://www.kookboek.app");
  });

  it("falls back to forwarded headers", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const req = new Request("http://internal:3000/api/x", {
      headers: { "x-forwarded-host": "kookboek.app", "x-forwarded-proto": "http" },
    });
    expect(getRequestOrigin(req)).toBe("http://kookboek.app");
  });

  it("assumes https when only the forwarded host is present", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const req = new Request("http://internal:3000/api/x", { headers: { "x-forwarded-host": "kookboek.app" } });
    expect(getRequestOrigin(req)).toBe("https://kookboek.app");
  });

  it("falls back to the request URL origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getRequestOrigin(new Request("http://localhost:3000/api/x?y=1"))).toBe("http://localhost:3000");
  });
});

describe("canAccessRecipe", () => {
  const privateRecipe = { isPublic: false, userId: "owner", code: "secret" };

  it("allows anyone on a public recipe", () => {
    expect(canAccessRecipe({ ...privateRecipe, isPublic: true }, undefined)).toBe(true);
  });

  it("allows the owner", () => {
    expect(canAccessRecipe(privateRecipe, "owner")).toBe(true);
  });

  it("allows anyone presenting the correct code", () => {
    expect(canAccessRecipe(privateRecipe, undefined, "secret")).toBe(true);
    expect(canAccessRecipe(privateRecipe, "stranger", "secret")).toBe(true);
  });

  it("denies others on an unlisted recipe", () => {
    expect(canAccessRecipe(privateRecipe, "stranger")).toBe(false);
    expect(canAccessRecipe(privateRecipe, null)).toBe(false);
    expect(canAccessRecipe(privateRecipe, "stranger", "wrong")).toBe(false);
    expect(canAccessRecipe(privateRecipe, "stranger", "SECRET")).toBe(false);
    expect(canAccessRecipe(privateRecipe, "", "")).toBe(false);
  });

  it("treats isPublic null as unlisted", () => {
    expect(canAccessRecipe({ ...privateRecipe, isPublic: null }, "stranger")).toBe(false);
  });

  it("never matches an empty code, even if the recipe's code is empty", () => {
    expect(canAccessRecipe({ ...privateRecipe, code: "" }, "stranger", "")).toBe(false);
  });

  it("does not treat an empty viewer id as the owner of a recipe with an empty user id", () => {
    expect(canAccessRecipe({ ...privateRecipe, userId: "" }, "")).toBe(false);
  });
});
