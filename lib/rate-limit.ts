import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";
import { appRateLimit, db, rateLimit } from "@/lib/db";

/**
 * Per-user rate limits for the expensive endpoints.
 *
 * enforceRateLimit counts in Postgres (the app_rate_limit table), so every
 * serverless instance shares the same counters. In memory, each Vercel
 * instance would count on its own and the effective limit would grow with the
 * number of warm instances. If the database is unreachable it falls back to
 * the in-memory checkRateLimit below rather than failing the request.
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
  // Data export - reads every row the user owns; nobody needs it often.
  "account:export": { limit: 5, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily spend caps on top of the per-minute limits, applied to every "ai:"
 * limit: one per user, and one across all users so a burst of new accounts
 * can't run up an unbounded bill either.
 */
export const AI_DAILY_LIMITS = {
  perUser: { limit: 150, windowMs: DAY_MS },
  global: { limit: 3000, windowMs: DAY_MS },
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

/** Where counters live. Swappable so tests run without a database. */
export interface RateLimitStore {
  hit(key: string, rule: RateLimitRule, now: number): Promise<RateLimitResult>;
}

export const memoryRateLimitStore: RateLimitStore = {
  hit: async (key, rule) => checkRateLimit(key, rule),
};

/**
 * Fixed windows in Postgres: one row per key and window, incremented with a
 * single upsert so concurrent requests on different instances can't both
 * slip under the limit.
 */
export const postgresRateLimitStore: RateLimitStore = {
  async hit(key, rule, now) {
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const [row] = await db
      .insert(appRateLimit)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [appRateLimit.key, appRateLimit.windowStart],
        set: { count: sql`${appRateLimit.count} + 1` },
      })
      .returning({ count: appRateLimit.count });

    // Old windows are useless; clear them out now and then.
    if (Math.random() < 0.01) {
      void pruneRateLimits(now).catch(() => {});
    }

    const resetAt = windowStart + rule.windowMs;
    const allowed = row.count <= rule.limit;
    return {
      allowed,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - row.count),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
    };
  },
};

async function pruneRateLimits(now: number) {
  const cutoff = now - 2 * DAY_MS;
  await db.delete(appRateLimit).where(lt(appRateLimit.windowStart, cutoff));
  // better-auth's own counters never expire either.
  await db.delete(rateLimit).where(lt(rateLimit.lastRequest, cutoff));
}

let store: RateLimitStore = postgresRateLimitStore;

export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

async function hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  try {
    return await store.hit(key, rule, Date.now());
  } catch (error) {
    console.error("Rate limit store unavailable, counting in memory:", error);
    return checkRateLimit(key, rule);
  }
}

function tooManyRequests(result: RateLimitResult, message?: string): NextResponse {
  return NextResponse.json(
    {
      error:
        message ??
        `Too many requests. Please try again in ${result.retryAfterSeconds} second${result.retryAfterSeconds === 1 ? "" : "s"}.`,
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

/**
 * Apply a named per-user limit (plus the daily AI caps for "ai:" limits).
 * Returns a 429 response when the caller is over a limit, or `null` when the
 * request may proceed.
 */
export async function enforceRateLimit(
  name: RateLimitName,
  userId: string
): Promise<NextResponse | null> {
  const result = await hit(`${name}:${userId}`, RATE_LIMITS[name]);
  if (!result.allowed) return tooManyRequests(result);

  if (name.startsWith("ai:")) {
    const daily = await hit(`ai:daily:${userId}`, AI_DAILY_LIMITS.perUser);
    if (!daily.allowed) {
      return tooManyRequests(
        daily,
        "You've reached today's limit for AI features. Please try again tomorrow."
      );
    }
    const global = await hit("ai:daily:all", AI_DAILY_LIMITS.global);
    if (!global.allowed) {
      return tooManyRequests(
        global,
        "AI features are busy right now. Please try again later."
      );
    }
  }

  return null;
}
