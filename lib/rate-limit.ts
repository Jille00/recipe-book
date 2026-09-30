import { NextResponse } from "next/server";

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * !!! IMPORTANT - PER-INSTANCE ONLY !!!
 * Counters live in the memory of a single Node process. On Vercel (or any
 * multi-instance / serverless deployment) every lambda instance keeps its own
 * counters, so the effective limit is roughly `limit x number of warm
 * instances`, and counters reset whenever an instance is recycled. This is a
 * cheap abuse-brake, NOT a correctness guarantee.
 *
 * For real multi-instance correctness, back this with a shared store
 * (Upstash Redis / Vercel KV / Redis) and keep the same call signature:
 * replace the Map operations below with an atomic INCR + EXPIRE (or a Lua
 * sliding-window script) against that store.
 */

export interface RateLimitRule {
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the caller may retry (0 when allowed). */
  retryAfterSeconds: number;
  /** Epoch ms when the oldest hit in the window expires. */
  resetAt: number;
}

/** Per-user limits for the expensive endpoints. Tuned for normal human usage. */
export const RATE_LIMITS = {
  // AI endpoints - each call costs money and takes seconds.
  "ai:extract-recipe": { limit: 10, windowMs: 60_000 },
  "ai:import-recipe-text": { limit: 15, windowMs: 60_000 },
  "ai:calculate-nutrition": { limit: 20, windowMs: 60_000 },
  "ai:generate-recipe-image": { limit: 5, windowMs: 60_000 },
  // Storage uploads.
  upload: { limit: 30, windowMs: 60_000 },
  // Link import - makes outbound requests to the given site (and its photo).
  "import:recipe-url": { limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

// key -> sorted list of request timestamps (ms) inside the current window
const hits = new Map<string, number[]>();

// Guard against unbounded growth of the map on a long-lived instance.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, timestamps] of hits) {
    // Any entry whose newest hit is older than the longest window is dead.
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 3_600_000) {
      hits.delete(key);
    }
  }
}

/**
 * Record a hit for `key` and report whether it is within `rule`.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();

  if (hits.size > MAX_TRACKED_KEYS) {
    sweep(now);
  }

  const windowStart = now - rule.windowMs;
  const previous = hits.get(key) ?? [];
  const recent = previous.filter((t) => t > windowStart);

  if (recent.length >= rule.limit) {
    hits.set(key, recent);
    const oldest = recent[0];
    const resetAt = oldest + rule.windowMs;
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
    };
  }

  recent.push(now);
  hits.set(key, recent);

  return {
    allowed: true,
    limit: rule.limit,
    remaining: rule.limit - recent.length,
    retryAfterSeconds: 0,
    resetAt: now + rule.windowMs,
  };
}

/**
 * Apply a named per-user limit. Returns a 429 response when the caller is over
 * the limit, or `null` when the request may proceed.
 */
export function enforceRateLimit(
  name: RateLimitName,
  userId: string
): NextResponse | null {
  const result = checkRateLimit(`${name}:${userId}`, RATE_LIMITS[name]);

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: `Too many requests. Please try again in ${result.retryAfterSeconds} second${result.retryAfterSeconds === 1 ? "" : "s"}.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
