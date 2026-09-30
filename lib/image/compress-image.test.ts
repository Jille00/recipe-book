import { describe, it, expect } from "vitest";
import {
  perImageBudget,
  fitsRequestBudget,
  minEdgeFor,
  initialAttempt,
  nextAttempt,
  scaleToEdge,
  COMPRESS_MAX_EDGE,
  COMPRESS_MIN_EDGE,
  COMPRESS_QUALITY_STEPS,
  MULTIPART_PART_OVERHEAD_BYTES,
  type CompressAttempt,
} from "./compress-image";

describe("perImageBudget", () => {
  it("splits the budget and reserves framing per part", () => {
    expect(perImageBudget(3_800_000, 1)).toBe(3_800_000 - MULTIPART_PART_OVERHEAD_BYTES);
    expect(perImageBudget(3_800_000, 10)).toBe(Math.floor((3_800_000 - 10 * 1024) / 10));
  });

  it("treats zero, negative and fractional counts sensibly", () => {
    expect(perImageBudget(10_000, 0)).toBe(perImageBudget(10_000, 1));
    expect(perImageBudget(10_000, -3)).toBe(perImageBudget(10_000, 1));
    expect(perImageBudget(10_000, 2.9)).toBe(perImageBudget(10_000, 2));
  });

  it("never returns a negative budget", () => {
    expect(perImageBudget(500, 3)).toBe(0);
  });

  it("the per-image budgets always fit the request budget", () => {
    for (const count of [1, 2, 5, 10]) {
      const each = perImageBudget(3_800_000, count);
      expect(fitsRequestBudget(Array(count).fill(each), 3_800_000)).toBe(true);
    }
  });
});

describe("fitsRequestBudget", () => {
  it("includes framing overhead", () => {
    expect(fitsRequestBudget([1000], 1000 + MULTIPART_PART_OVERHEAD_BYTES)).toBe(true);
    expect(fitsRequestBudget([1001], 1000 + MULTIPART_PART_OVERHEAD_BYTES)).toBe(false);
    expect(fitsRequestBudget([], 0)).toBe(true);
  });
});

describe("minEdgeFor / initialAttempt", () => {
  it("never upscales and never exceeds the bounds", () => {
    expect(minEdgeFor(4000)).toBe(COMPRESS_MIN_EDGE);
    expect(minEdgeFor(800)).toBe(800);
    expect(minEdgeFor(0)).toBe(1);
    expect(minEdgeFor(799.6)).toBe(800);

    expect(initialAttempt(4000)).toEqual({ edge: COMPRESS_MAX_EDGE, qualityIndex: 0 });
    expect(initialAttempt(1000)).toEqual({ edge: 1000, qualityIndex: 0 });
    expect(initialAttempt(0)).toEqual({ edge: 1, qualityIndex: 0 });
  });
});

describe("nextAttempt", () => {
  it("stops once the encode fits", () => {
    expect(nextAttempt({ edge: 2048, qualityIndex: 0 }, 1000, 1000, 4000)).toBeNull();
  });

  it("drops quality once at full size first", () => {
    expect(nextAttempt({ edge: 2048, qualityIndex: 0 }, 5_000_000, 1_000_000, 4000)).toEqual({
      edge: 2048,
      qualityIndex: 1,
    });
  });

  it("then shrinks by at least 10%, never below the floor", () => {
    const step = nextAttempt({ edge: 2048, qualityIndex: 1 }, 1_100_000, 1_000_000, 4000)!;
    expect(step.qualityIndex).toBe(1);
    expect(step.edge).toBeLessThanOrEqual(Math.floor(2048 * 0.9));
    const big = nextAttempt({ edge: 2048, qualityIndex: 1 }, 100_000_000, 1_000_000, 4000)!;
    expect(big.edge).toBe(COMPRESS_MIN_EDGE);
  });

  it("then lowers quality at the floor until it runs out", () => {
    const last = COMPRESS_QUALITY_STEPS.length - 1;
    expect(nextAttempt({ edge: COMPRESS_MIN_EDGE, qualityIndex: 1 }, 2, 1, 4000)).toEqual({
      edge: COMPRESS_MIN_EDGE,
      qualityIndex: 2,
    });
    expect(nextAttempt({ edge: COMPRESS_MIN_EDGE, qualityIndex: last }, 2, 1, 4000)).toBeNull();
  });

  it("always terminates and never goes below the floor", () => {
    let attempt: CompressAttempt | null = initialAttempt(4032);
    let steps = 0;
    while (attempt && steps < 100) {
      expect(attempt.edge).toBeGreaterThanOrEqual(COMPRESS_MIN_EDGE);
      attempt = nextAttempt(attempt, 10_000_000, 100_000, 4032);
      steps++;
    }
    expect(attempt).toBeNull();
    expect(steps).toBeLessThan(20);
  });

  it("handles a zero budget without dividing by zero", () => {
    const r = nextAttempt({ edge: 2048, qualityIndex: 1 }, 1000, 0, 4000)!;
    expect(Number.isFinite(r.edge)).toBe(true);
  });
});

describe("scaleToEdge", () => {
  it("keeps images that already fit", () => {
    expect(scaleToEdge(800, 600, 2048)).toEqual({ width: 800, height: 600 });
    expect(scaleToEdge(2048, 1000, 2048)).toEqual({ width: 2048, height: 1000 });
  });

  it("scales landscape and portrait by the long edge", () => {
    expect(scaleToEdge(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(scaleToEdge(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("never produces a zero dimension", () => {
    expect(scaleToEdge(10_000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});
