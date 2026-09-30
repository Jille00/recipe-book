import { describe, expect, it } from "vitest";
import {
  COMPRESS_MAX_EDGE,
  COMPRESS_MIN_EDGE,
  COMPRESS_QUALITY_STEPS,
  type CompressAttempt,
  fitsRequestBudget,
  initialAttempt,
  minEdgeFor,
  MULTIPART_PART_OVERHEAD_BYTES,
  nextAttempt,
  perImageBudget,
  scaleToEdge,
} from "./compress-image";

// The request budget used by the photo import (components/recipe/file-validation.ts)
const IMPORT_BUDGET = 3_800_000;

describe("constants", () => {
  it("keeps the legibility floor below the starting edge", () => {
    expect(COMPRESS_MIN_EDGE).toBeLessThan(COMPRESS_MAX_EDGE);
  });

  it("tries JPEG qualities from high to low, never below 0.5", () => {
    const steps = [...COMPRESS_QUALITY_STEPS];
    expect(steps).toEqual([...steps].sort((a, b) => b - a));
    expect(steps[steps.length - 1]).toBe(0.5);
    for (const quality of steps) {
      expect(quality).toBeGreaterThan(0);
      expect(quality).toBeLessThanOrEqual(1);
    }
  });

  it("reserves a positive per-part multipart overhead", () => {
    expect(MULTIPART_PART_OVERHEAD_BYTES).toBeGreaterThan(0);
  });
});

describe("perImageBudget", () => {
  it.each(Array.from({ length: 10 }, (_, i) => i + 1))(
    "gives %d image(s) budgets that together fit the request",
    (count) => {
      const budget = perImageBudget(IMPORT_BUDGET, count);
      expect(budget).toBeGreaterThan(0);
      expect(fitsRequestBudget(Array(count).fill(budget), IMPORT_BUDGET)).toBe(true);
      // And it does not waste more than a byte per image to rounding
      expect(fitsRequestBudget(Array(count).fill(budget + 1), IMPORT_BUDGET)).toBe(false);
    }
  );

  it("reserves the multipart overhead for a single image", () => {
    expect(perImageBudget(IMPORT_BUDGET, 1)).toBe(IMPORT_BUDGET - MULTIPART_PART_OVERHEAD_BYTES);
  });

  it("gets smaller as more images share the request", () => {
    let previous = Infinity;
    for (let count = 1; count <= 10; count++) {
      const budget = perImageBudget(IMPORT_BUDGET, count);
      expect(budget).toBeLessThan(previous);
      previous = budget;
    }
  });

  it("treats a count below 1 as a single image", () => {
    expect(perImageBudget(IMPORT_BUDGET, 0)).toBe(perImageBudget(IMPORT_BUDGET, 1));
    expect(perImageBudget(IMPORT_BUDGET, -3)).toBe(perImageBudget(IMPORT_BUDGET, 1));
  });

  it("rounds a fractional count down", () => {
    expect(perImageBudget(IMPORT_BUDGET, 2.7)).toBe(perImageBudget(IMPORT_BUDGET, 2));
  });

  it("never returns a negative budget", () => {
    expect(perImageBudget(500, 1)).toBe(0);
    expect(perImageBudget(0, 10)).toBe(0);
  });

  it("returns whole bytes", () => {
    expect(Number.isInteger(perImageBudget(1_000_003, 7))).toBe(true);
  });
});

describe("fitsRequestBudget", () => {
  it("counts the multipart overhead for every file", () => {
    const size = IMPORT_BUDGET - MULTIPART_PART_OVERHEAD_BYTES;
    expect(fitsRequestBudget([size], IMPORT_BUDGET)).toBe(true);
    expect(fitsRequestBudget([size + 1], IMPORT_BUDGET)).toBe(false);
  });

  it("sums several files", () => {
    const total = 3 * (1_000 + MULTIPART_PART_OVERHEAD_BYTES);
    expect(fitsRequestBudget([1_000, 1_000, 1_000], total)).toBe(true);
    expect(fitsRequestBudget([1_000, 1_000, 1_001], total)).toBe(false);
  });

  it("accepts an empty request", () => {
    expect(fitsRequestBudget([], 0)).toBe(true);
  });
});

describe("minEdgeFor", () => {
  it("is the legibility floor for large sources", () => {
    expect(minEdgeFor(4032)).toBe(COMPRESS_MIN_EDGE);
    expect(minEdgeFor(COMPRESS_MIN_EDGE)).toBe(COMPRESS_MIN_EDGE);
  });

  it("never exceeds a smaller source (no upscaling)", () => {
    expect(minEdgeFor(800)).toBe(800);
    expect(minEdgeFor(799.6)).toBe(800);
  });

  it("is at least 1", () => {
    expect(minEdgeFor(0)).toBe(1);
    expect(minEdgeFor(-10)).toBe(1);
  });
});

describe("initialAttempt", () => {
  it("starts at the maximum edge and top quality for large sources", () => {
    expect(initialAttempt(4032)).toEqual({ edge: COMPRESS_MAX_EDGE, qualityIndex: 0 });
  });

  it("never upscales a smaller source", () => {
    expect(initialAttempt(1000)).toEqual({ edge: 1000, qualityIndex: 0 });
    expect(initialAttempt(1000.4)).toEqual({ edge: 1000, qualityIndex: 0 });
  });

  it("is at least 1px", () => {
    expect(initialAttempt(0).edge).toBe(1);
  });
});

describe("nextAttempt", () => {
  it("stops as soon as the encode fits", () => {
    expect(nextAttempt({ edge: 2048, qualityIndex: 0 }, 1_000, 1_000, 4032)).toBeNull();
    expect(nextAttempt({ edge: 1200, qualityIndex: 3 }, 10, 1_000, 4032)).toBeNull();
  });

  it("first lowers quality once at full size", () => {
    expect(nextAttempt({ edge: 2048, qualityIndex: 0 }, 5_000_000, 1_000_000, 4032)).toEqual({
      edge: 2048,
      qualityIndex: 1,
    });
  });

  it("then shrinks the edge, keeping the quality", () => {
    const next = nextAttempt({ edge: 2048, qualityIndex: 1 }, 2_000_000, 1_500_000, 4032);
    expect(next).not.toBeNull();
    expect(next!.qualityIndex).toBe(1);
    expect(next!.edge).toBeLessThan(2048);
  });

  it("makes at least 10% progress when only slightly over budget", () => {
    const next = nextAttempt({ edge: 2000, qualityIndex: 1 }, 1_000_001, 1_000_000, 4032);
    expect(next!.edge).toBeLessThanOrEqual(1800);
  });

  it("jumps towards the size the byte count suggests", () => {
    // 4x over budget: the edge should roughly halve, not step down by 10%
    const next = nextAttempt({ edge: 2048, qualityIndex: 1 }, 4_000_000, 1_000_000, 4032);
    expect(next!.edge).toBeLessThan(1500);
    expect(next!.edge).toBeGreaterThanOrEqual(COMPRESS_MIN_EDGE);
  });

  it("does not shrink past the legibility floor", () => {
    const next = nextAttempt({ edge: 1300, qualityIndex: 1 }, 50_000_000, 100_000, 4032);
    expect(next).toEqual({ edge: COMPRESS_MIN_EDGE, qualityIndex: 1 });
  });

  it("lowers quality further once at the floor", () => {
    expect(nextAttempt({ edge: COMPRESS_MIN_EDGE, qualityIndex: 1 }, 2_000_000, 1_000_000, 4032)).toEqual({
      edge: COMPRESS_MIN_EDGE,
      qualityIndex: 2,
    });
  });

  it("gives up at the floor with the lowest quality", () => {
    const last = COMPRESS_QUALITY_STEPS.length - 1;
    expect(nextAttempt({ edge: COMPRESS_MIN_EDGE, qualityIndex: last }, 2_000_000, 1_000_000, 4032)).toBeNull();
  });

  it("only lowers quality for a source already below the floor", () => {
    let attempt: CompressAttempt | null = initialAttempt(800);
    const seen: CompressAttempt[] = [];
    while (attempt) {
      seen.push(attempt);
      attempt = nextAttempt(attempt, 10_000_000, 1_000, 800);
    }
    expect(seen.map((a) => a.edge)).toEqual(Array(COMPRESS_QUALITY_STEPS.length).fill(800));
    expect(seen.map((a) => a.qualityIndex)).toEqual(COMPRESS_QUALITY_STEPS.map((_, i) => i));
  });

  describe("full step-down plans", () => {
    const sources = [1, 2, 640, 1199, 1200, 1201, 2047, 2048, 3024, 4032, 8000, 12_000];
    const budgets = [0, 1, 50_000, 350_000, 1_000_000, 3_500_000];
    // JPEG size grows roughly with pixel count; a higher factor never fits
    const byteModels: Record<string, (a: CompressAttempt) => number> = {
      typical: (a) => Math.round(a.edge * a.edge * 0.9 * COMPRESS_QUALITY_STEPS[a.qualityIndex]),
      incompressible: () => Number.MAX_SAFE_INTEGER,
      flat: () => 400_000,
    };

    for (const [modelName, bytesFor] of Object.entries(byteModels)) {
      it(`always terminates, never upscales and respects the floor (${modelName} encoder)`, () => {
        for (const source of sources) {
          for (const budget of budgets) {
            const floor = minEdgeFor(source);
            let attempt: CompressAttempt | null = initialAttempt(source);
            let previous: CompressAttempt | null = null;
            let steps = 0;

            while (attempt) {
              steps++;
              expect(steps).toBeLessThanOrEqual(30);

              expect(Number.isInteger(attempt.edge)).toBe(true);
              expect(attempt.edge).toBeLessThanOrEqual(Math.max(1, source));
              expect(attempt.edge).toBeLessThanOrEqual(COMPRESS_MAX_EDGE);
              expect(attempt.edge).toBeGreaterThanOrEqual(Math.min(floor, initialAttempt(source).edge));
              expect(attempt.qualityIndex).toBeGreaterThanOrEqual(0);
              expect(attempt.qualityIndex).toBeLessThan(COMPRESS_QUALITY_STEPS.length);

              if (previous) {
                // Every step makes the output smaller or lower quality, never both worse
                expect(attempt.edge).toBeLessThanOrEqual(previous.edge);
                expect(attempt.qualityIndex).toBeGreaterThanOrEqual(previous.qualityIndex);
                expect(attempt.edge < previous.edge || attempt.qualityIndex > previous.qualityIndex).toBe(true);
              }

              previous = attempt;
              attempt = nextAttempt(attempt, bytesFor(attempt), budget, source);
            }
          }
        }
      });
    }

    it("stops at the first attempt that fits", () => {
      const source = 4032;
      const budget = 1_500_000;
      const bytesFor = byteModels.typical;
      let attempt: CompressAttempt | null = initialAttempt(source);
      let last: CompressAttempt = attempt;
      while (attempt) {
        last = attempt;
        attempt = nextAttempt(attempt, bytesFor(attempt), budget, source);
      }
      expect(bytesFor(last)).toBeLessThanOrEqual(budget);
      expect(last.edge).toBeGreaterThanOrEqual(COMPRESS_MIN_EDGE);
    });
  });
});

describe("scaleToEdge", () => {
  it("fits a landscape photo inside the edge, keeping aspect ratio", () => {
    expect(scaleToEdge(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
  });

  it("fits a portrait photo inside the edge", () => {
    expect(scaleToEdge(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  it("scales squares evenly", () => {
    expect(scaleToEdge(3000, 3000, 1200)).toEqual({ width: 1200, height: 1200 });
  });

  it("never upscales", () => {
    expect(scaleToEdge(800, 600, 2048)).toEqual({ width: 800, height: 600 });
    expect(scaleToEdge(2048, 1000, 2048)).toEqual({ width: 2048, height: 1000 });
  });

  it("keeps extreme aspect ratios at least 1px wide", () => {
    expect(scaleToEdge(1, 10_000, 100)).toEqual({ width: 1, height: 100 });
    expect(scaleToEdge(10_000, 3, 100)).toEqual({ width: 100, height: 1 });
  });
});
