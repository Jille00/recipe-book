import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, enforceRateLimit, RATE_LIMITS } from "./rate-limit";

// The limiter keeps its counters in module state with no reset hook, so every
// test uses keys nobody else uses.
let keyCounter = 0;
const uniqueKey = (label = "key") => `test:${label}:${++keyCounter}`;

const START = new Date("2026-01-01T12:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  const rule = { limit: 3, windowMs: 60_000 };

  it("allows requests up to the limit and counts down remaining", () => {
    const key = uniqueKey();
    expect(checkRateLimit(key, rule)).toEqual({
      allowed: true,
      limit: 3,
      remaining: 2,
      retryAfterSeconds: 0,
      resetAt: START + 60_000,
    });
    expect(checkRateLimit(key, rule)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit(key, rule)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("denies the request after the limit with a Retry-After until the oldest hit expires", () => {
    const key = uniqueKey();
    checkRateLimit(key, rule);
    vi.setSystemTime(START + 10_000);
    checkRateLimit(key, rule);
    checkRateLimit(key, rule);

    vi.setSystemTime(START + 20_000);
    expect(checkRateLimit(key, rule)).toEqual({
      allowed: false,
      limit: 3,
      remaining: 0,
      retryAfterSeconds: 40,
      resetAt: START + 60_000,
    });
  });

  it("reports at least 1 second to wait", () => {
    const key = uniqueKey();
    const tight = { limit: 1, windowMs: 1_000 };
    checkRateLimit(key, tight);
    vi.setSystemTime(START + 999);
    expect(checkRateLimit(key, tight)).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
  });

  it("rounds a partial second up", () => {
    const key = uniqueKey();
    checkRateLimit(key, { limit: 1, windowMs: 60_000 });
    vi.setSystemTime(START + 58_500);
    expect(checkRateLimit(key, { limit: 1, windowMs: 60_000 }).retryAfterSeconds).toBe(2);
  });

  it("slides the window: each hit frees up once it is a full window old", () => {
    const key = uniqueKey();
    const small = { limit: 2, windowMs: 1_000 };

    checkRateLimit(key, small); // t=0
    vi.setSystemTime(START + 500);
    checkRateLimit(key, small); // t=500
    vi.setSystemTime(START + 600);
    expect(checkRateLimit(key, small).allowed).toBe(false);

    // The t=0 hit is exactly one window old and no longer counts
    vi.setSystemTime(START + 1_000);
    expect(checkRateLimit(key, small)).toMatchObject({ allowed: true, remaining: 0 });

    // t=500 and t=1000 still count
    vi.setSystemTime(START + 1_001);
    expect(checkRateLimit(key, small)).toMatchObject({ allowed: false, resetAt: START + 1_500 });

    vi.setSystemTime(START + 1_500);
    expect(checkRateLimit(key, small).allowed).toBe(true);
  });

  it("does not count denied requests against the caller", () => {
    const key = uniqueKey();
    const one = { limit: 1, windowMs: 10_000 };
    checkRateLimit(key, one);
    for (let i = 1; i <= 9; i++) {
      vi.setSystemTime(START + i * 1_000);
      expect(checkRateLimit(key, one).allowed).toBe(false);
    }
    vi.setSystemTime(START + 10_000);
    expect(checkRateLimit(key, one).allowed).toBe(true);
  });

  it("fully resets after a quiet window", () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, rule);
    vi.setSystemTime(START + 60_001);
    expect(checkRateLimit(key, rule)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("keeps keys isolated", () => {
    const a = uniqueKey("a");
    const b = uniqueKey("b");
    for (let i = 0; i < 3; i++) checkRateLimit(a, rule);
    expect(checkRateLimit(a, rule).allowed).toBe(false);
    expect(checkRateLimit(b, rule)).toMatchObject({ allowed: true, remaining: 2 });
  });
});

describe("enforceRateLimit", () => {
  const NAME = "ai:generate-recipe-image";
  const { limit, windowMs } = RATE_LIMITS[NAME];

  const exhaust = (name: keyof typeof RATE_LIMITS, userId: string) => {
    for (let i = 0; i < RATE_LIMITS[name].limit; i++) {
      expect(enforceRateLimit(name, userId)).toBeNull();
    }
  };

  it("lets requests through up to the named limit", () => {
    exhaust(NAME, uniqueKey("user"));
  });

  it("answers 429 with Retry-After and rate-limit headers once over the limit", async () => {
    const userId = uniqueKey("user");
    exhaust(NAME, userId);

    const response = enforceRateLimit(NAME, userId);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);

    const retryAfter = Math.ceil(windowMs / 1000);
    expect(response!.headers.get("Retry-After")).toBe(String(retryAfter));
    expect(response!.headers.get("X-RateLimit-Limit")).toBe(String(limit));
    expect(response!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response!.headers.get("X-RateLimit-Reset")).toBe(String(Math.ceil((START + windowMs) / 1000)));
    expect(await response!.json()).toEqual({
      error: `Too many requests. Please try again in ${retryAfter} seconds.`,
    });
  });

  it("uses the singular 'second' when one second remains", async () => {
    const userId = uniqueKey("user");
    exhaust(NAME, userId);
    vi.setSystemTime(START + windowMs - 500);
    const response = enforceRateLimit(NAME, userId);
    expect(response!.headers.get("Retry-After")).toBe("1");
    expect(await response!.json()).toEqual({ error: "Too many requests. Please try again in 1 second." });
  });

  it("isolates users", () => {
    const alice = uniqueKey("alice");
    const bob = uniqueKey("bob");
    exhaust(NAME, alice);
    expect(enforceRateLimit(NAME, alice)).not.toBeNull();
    expect(enforceRateLimit(NAME, bob)).toBeNull();
  });

  it("isolates limit names for the same user", () => {
    const userId = uniqueKey("user");
    exhaust(NAME, userId);
    expect(enforceRateLimit(NAME, userId)).not.toBeNull();
    expect(enforceRateLimit("upload", userId)).toBeNull();
    expect(enforceRateLimit("ai:extract-recipe", userId)).toBeNull();
  });

  it("allows the user again once the window has passed", () => {
    const userId = uniqueKey("user");
    exhaust(NAME, userId);
    expect(enforceRateLimit(NAME, userId)).not.toBeNull();
    vi.setSystemTime(START + windowMs);
    expect(enforceRateLimit(NAME, userId)).toBeNull();
  });

  it("does not share counters with checkRateLimit keys that are not namespaced", () => {
    const userId = uniqueKey("user");
    for (let i = 0; i < limit; i++) checkRateLimit(userId, { limit, windowMs });
    expect(enforceRateLimit(NAME, userId)).toBeNull();
  });
});
