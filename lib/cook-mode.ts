/**
 * Pure logic behind cook mode (components/recipe/cook-mode.tsx): spotting
 * durations in a step so it can offer a timer, the timers themselves, and
 * remembering which step the cook was on.
 */
import { NUMBER_TOKEN, parseAmount } from "@/lib/utils/unit-conversion";

// ─── Durations in step text ────────────────────────────────────────────────

export interface StepDuration {
  /** Offset of the duration in the step text */
  start: number;
  /** Offset just past the duration */
  end: number;
  /** The duration as written ("25-30 minutes") */
  text: string;
  /** Length in seconds; a range uses its upper bound */
  seconds: number;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  "forty-five": 45,
  sixty: 60,
  // Dutch, for recipes imported from Dutch sites
  een: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  tien: 10,
  anderhalf: 1.5,
};

const UNIT_SECONDS: Array<[RegExp, number]> = [
  [/^(?:hours?|hrs?|uur|uren)$/i, 3600],
  [/^(?:minutes?|mins?|minuten|minuut)$/i, 60],
  [/^(?:seconds?|secs?|seconden|seconde)$/i, 1],
];

// Longest first, so "an" wins over "a" and "forty-five" over "forty".
const WORD_NUMBER_PATTERN = Object.keys(WORD_NUMBERS)
  .sort((a, b) => b.length - a.length)
  .join("|");

const NUMBER = `(?:${NUMBER_TOKEN}|${WORD_NUMBER_PATTERN})`;
const UNIT =
  "hours?|hrs?|uur|uren|minutes?|mins?|minuten|minuut|seconds?|secs?|seconden|seconde";
const AND_A_HALF = "\\s+(?:and\\s+a\\s+half|en\\s+een\\s+half)";

const DURATION_PATTERN = new RegExp(
  // Not glued onto a preceding word or number ("B12", "1.5" mid-number)
  `(?<![\\w.,/-])` +
    `(${NUMBER})` +
    // A range: "10-15", "10 to 15", "10 or 15", "10 tot 15"
    `(?:(?:\\s*[-‐‑‒–—]\\s*|\\s+(?:to|or|tot)\\s+)(${NUMBER}))?` +
    `(${AND_A_HALF})?` +
    // "25 minutes", "25min", "a 5-minute rest", "10 more minutes"
    `(?:\\s+|-)?(?:(?:more|extra|additional|further|meer)\\s+)?` +
    `(${UNIT})` +
    `(${AND_A_HALF})?` +
    `(?![A-Za-z])`,
  "gi"
);

const HALF_HOUR_PATTERN =
  /(?<![\w-])(?:(?:a|een)\s+)?half(?:\s+an)?\s+(?:hour|uur)(?![A-Za-z])/gi;

// What may sit between the parts of "1 hour and 30 minutes"
const COMPOUND_GAP = /^\s*(?:,|and|en|&)?\s*$/i;

// Anything longer than this is not a kitchen timer ("marinate for 3 days"
// isn't matched anyway, but "48 hours" would be).
const MAX_SECONDS = 24 * 3600;

function parseNumber(token: string | undefined): number | null {
  if (!token) return null;
  const word = WORD_NUMBERS[token.toLowerCase()];
  if (word !== undefined) return word;
  return parseAmount(token);
}

function unitSeconds(unit: string): number {
  return UNIT_SECONDS.find(([pattern]) => pattern.test(unit))?.[1] ?? 0;
}

interface RawDuration extends StepDuration {
  unit: number;
}

/**
 * Find the durations in a step ("bake 25 minutes", "1 hour", "10-15 min"),
 * in the order they appear. A range counts as its upper bound, and a compound
 * ("1 hour 30 minutes") as one duration.
 */
export function parseStepDurations(text: string): StepDuration[] {
  if (typeof text !== "string" || !text) return [];

  const raw: RawDuration[] = [];

  // "half an hour" first: the main pattern would read its "an hour" as 1 hour.
  for (const match of text.matchAll(HALF_HOUR_PATTERN)) {
    const start = match.index;
    raw.push({
      start,
      end: start + match[0].length,
      text: match[0],
      seconds: 1800,
      unit: 3600,
    });
  }
  const halfHours = raw.slice();

  for (const match of text.matchAll(DURATION_PATTERN)) {
    const [whole, low, high, halfBefore, unitText, halfAfter] = match;
    const lowValue = parseNumber(low);
    const highValue = high ? parseNumber(high) : null;
    const value = highValue ?? lowValue;
    const unit = unitSeconds(unitText);
    if (value === null || !unit) continue;
    const half = halfBefore || halfAfter ? 0.5 : 0;
    const start = match.index;
    const end = start + whole.length;
    if (halfHours.some((d) => start < d.end && end > d.start)) continue;
    raw.push({
      start,
      end,
      text: whole,
      seconds: Math.round((value + half) * unit),
      unit,
    });
  }

  raw.sort((a, b) => a.start - b.start);

  // Join "1 hour" + "30 minutes" when only "and" or a comma separates them
  // and the units get smaller.
  const merged: RawDuration[] = [];
  for (const duration of raw) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.unit > duration.unit &&
      COMPOUND_GAP.test(text.slice(previous.end, duration.start))
    ) {
      previous.end = duration.end;
      previous.text = text.slice(previous.start, duration.end);
      previous.seconds += duration.seconds;
      previous.unit = duration.unit;
    } else {
      merged.push({ ...duration });
    }
  }

  return merged
    .filter((d) => d.seconds > 0 && d.seconds <= MAX_SECONDS)
    .map(({ start, end, text, seconds }) => ({ start, end, text, seconds }));
}

/**
 * Cut a step into plain text and duration segments, for highlighting the
 * durations that have a timer.
 */
export function splitByDurations(
  text: string,
  durations: StepDuration[]
): Array<{ text: string; durationIndex: number | null }> {
  const segments: Array<{ text: string; durationIndex: number | null }> = [];
  let cursor = 0;
  durations.forEach((duration, index) => {
    if (duration.start < cursor) return;
    if (duration.start > cursor) {
      segments.push({ text: text.slice(cursor, duration.start), durationIndex: null });
    }
    segments.push({ text: text.slice(duration.start, duration.end), durationIndex: index });
    cursor = duration.end;
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), durationIndex: null });
  }
  return segments;
}

// ─── Timers ────────────────────────────────────────────────────────────────

export type TimerStatus = "idle" | "running" | "paused" | "done";

export interface TimerState {
  status: TimerStatus;
  durationMs: number;
  /** Time left when not running */
  remainingMs: number;
  /** When a running timer reaches zero (epoch ms) */
  endsAt: number | null;
}

export function createTimer(seconds: number): TimerState {
  const durationMs = Math.max(0, Math.round(seconds * 1000));
  return { status: "idle", durationMs, remainingMs: durationMs, endsAt: null };
}

/** Time left on a timer at `now`, never below zero */
export function timerRemaining(timer: TimerState, now: number): number {
  if (timer.status === "running" && timer.endsAt !== null) {
    return Math.max(0, timer.endsAt - now);
  }
  return timer.remainingMs;
}

/** Start or resume. A finished timer starts over. */
export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.status === "running") return timer;
  const remainingMs =
    timer.status === "done" || timer.remainingMs <= 0
      ? timer.durationMs
      : timer.remainingMs;
  return { ...timer, status: "running", remainingMs, endsAt: now + remainingMs };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "running") return timer;
  return {
    ...timer,
    status: "paused",
    remainingMs: timerRemaining(timer, now),
    endsAt: null,
  };
}

export function resetTimer(timer: TimerState): TimerState {
  return createTimer(timer.durationMs / 1000);
}

/** Mark a running timer done once its time is up; otherwise unchanged. */
export function tickTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "running" || timerRemaining(timer, now) > 0) {
    return timer;
  }
  return { ...timer, status: "done", remainingMs: 0, endsAt: null };
}

/** "4:05", "1:02:09" — rounded up, so a timer never shows 0:00 early */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/** "25 minutes", "1 hour 30 minutes", "45 seconds" — for screen readers */
export function describeDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const parts: string[] = [];
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (hours) parts.push(plural(hours, "hour"));
  if (minutes) parts.push(plural(minutes, "minute"));
  if (secs || parts.length === 0) parts.push(plural(secs, "second"));
  return parts.join(" ");
}

// ─── Ingredients ───────────────────────────────────────────────────────────

/**
 * The shape recipe-detail's `convertedIngredients` has: scaled, and converted
 * to the reader's unit system where possible.
 */
export interface CookIngredient {
  id?: string;
  text: string;
  amount?: string;
  unit?: string;
  scaledAmount?: string | null;
  wasScaled?: boolean;
  converted?: { displayAmount: string; unit: string } | null;
}

/** "2 cups", "3", "" — the amount to show, after scaling and conversion */
export function ingredientQuantity(ingredient: CookIngredient): string {
  if (ingredient.converted) {
    return `${ingredient.converted.displayAmount} ${ingredient.converted.unit}`;
  }
  const amount =
    ingredient.wasScaled && ingredient.scaledAmount
      ? ingredient.scaledAmount
      : ingredient.amount;
  return [amount, ingredient.unit].filter(Boolean).join(" ");
}

// ─── Remembering the step ──────────────────────────────────────────────────

export function cookStepStorageKey(recipeId: string): string {
  return `cook-mode:step:${recipeId}`;
}

/** The stored step index, clamped to the recipe's steps; 0 when unusable */
export function parseStoredStep(raw: string | null, stepCount: number): number {
  if (raw === null || stepCount <= 0) return 0;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 0) return 0;
  return Math.min(step, stepCount - 1);
}
