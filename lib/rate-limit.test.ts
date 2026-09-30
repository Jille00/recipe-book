import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const T0 = new Date("2026-01-01T00:00:00Z").getTime();
let keyCounter = 0;
// The limiter keeps module-level state, so each test uses fresh keys.
const freshKey = () => `test-key-${++keyCounter}`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  const rule = { limit: 3, windowMs: 1000 };

  it("allows up to the limit and counts down remaining", () => {
    const key = freshKey();
    expect(checkRateLimit(key, rule)).toEqual({
      allowed: true,
      limit: 3,
      remaining: 2,
      retryAfterSeconds: 0,
      resetAt: T0 + 1000,
    });
    expect(checkRateLimit(key, rule).remaining).toBe(1);
    expect(checkRateLimit(key, rule).remaining).toBe(0);
  });

  it("blocks once the limit is reached", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, rule);
    vi.advanceTimersByTime(100);
    expect(checkRateLimit(key, rule)).toEqual({
      allowed: false,
      limit: 3,
      remaining: 0,
      retryAfterSeconds: 1,
      resetAt: T0 + 1000,
    });
  });

  it("keeps keys independent", () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(a, rule);
    expect(checkRateLimit(a, rule).allowed).toBe(false);
    expect(checkRateLimit(b, rule).allowed).toBe(true);
  });

  it("allows again exactly when the window has passed", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, rule);
    vi.advanceTimersByTime(999);
    expect(checkRateLimit(key, rule).allowed).toBe(false);
    vi.advanceTimersByTime(1);
    expect(checkRateLimit(key, rule).allowed).toBe(true);
  });

  it("is a sliding window: old hits expire individually", () => {
    const key = freshKey();
    checkRateLimit(key, rule); // t=0
    vi.advanceTimersByTime(400);
    checkRateLimit(key, rule); // t=400
    checkRateLimit(key, rule); // t=400
    vi.advanceTimersByTime(600); // t=1000: the t=0 hit expires
    const r = checkRateLimit(key, rule);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
    expect(checkRateLimit(key, rule)).toMatchObject({ allowed: false, resetAt: T0 + 1400 });
  });

  it("does not count rejected requests against the caller", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) checkRateLimit(key, rule);
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(50);
      checkRateLimit(key, rule);
    }
    vi.advanceTimersByTime(1000 - 500);
    expect(checkRateLimit(key, rule).allowed).toBe(true);
  });

  it("rounds retryAfterSeconds up, with a minimum of 1", () => {
    const key = freshKey();
    const minute = { limit: 1, windowMs: 60_000 };
    checkRateLimit(key, minute);
    vi.advanceTimersByTime(1500);
    expect(checkRateLimit(key, minute).retryAfterSeconds).toBe(59);
    vi.advanceTimersByTime(58_400);
    expect(checkRateLimit(key, minute).retryAfterSeconds).toBe(1);
  });

  it("blocks everything with a limit of 0", () => {
    expect(checkRateLimit(freshKey(), { limit: 0, windowMs: 1000 }).allowed).toBe(false);
  });

  it("keeps working when more than 10,000 keys are tracked (sweep path)", () => {
    for (let i = 0; i < 10_001; i++) checkRateLimit(`sweep-${i}`, rule);
    vi.advanceTimersByTime(2 * 3_600_000);
    const key = freshKey();
    expect(checkRateLimit(key, rule).allowed).toBe(true);
    // A swept key starts from scratch
    expect(checkRateLimit("sweep-0", rule).remaining).toBe(2);
  });
});

describe("enforceRateLimit", () => {
  it("returns null while under the limit", () => {
    expect(enforceRateLimit("upload", freshKey())).toBeNull();
  });

  it("returns a 429 with headers once over the limit", async () => {
    const user = freshKey();
    const { limit } = RATE_LIMITS["ai:generate-recipe-image"];
    for (let i = 0; i < limit; i++) {
      expect(enforceRateLimit("ai:generate-recipe-image", user)).toBeNull();
    }
    vi.advanceTimersByTime(30_000);
    const res = enforceRateLimit("ai:generate-recipe-image", user)!;
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("X-RateLimit-Limit")).toBe(String(limit));
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe(String(Math.ceil((T0 + 60_000) / 1000)));
    expect(await res.json()).toEqual({ error: "Too many requests. Please try again in 30 seconds." });
  });

  it("uses the singular 'second' for a 1-second wait", async () => {
    const user = freshKey();
    for (let i = 0; i < RATE_LIMITS["ai:generate-recipe-image"].limit; i++) {
      enforceRateLimit("ai:generate-recipe-image", user);
    }
    vi.advanceTimersByTime(59_500);
    const res = enforceRateLimit("ai:generate-recipe-image", user)!;
    expect(await res.json()).toEqual({ error: "Too many requests. Please try again in 1 second." });
  });

  it("scopes limits per endpoint name and per user", () => {
    const user = freshKey();
    for (let i = 0; i < RATE_LIMITS["ai:generate-recipe-image"].limit; i++) {
      enforceRateLimit("ai:generate-recipe-image", user);
    }
    expect(enforceRateLimit("ai:generate-recipe-image", user)).not.toBeNull();
    expect(enforceRateLimit("ai:extract-recipe", user)).toBeNull();
    expect(enforceRateLimit("ai:generate-recipe-image", freshKey())).toBeNull();
  });
});
