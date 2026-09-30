import { describe, expect, it } from "vitest";
import { toRatingStats } from "./rating-stats";

describe("toRatingStats", () => {
  it("parses the numeric average Postgres hands back as a string", () => {
    expect(toRatingStats("4.50", 2)).toEqual({ averageRating: 4.5, totalRatings: 2 });
  });

  it("accepts a numeric average", () => {
    expect(toRatingStats(3, 1)).toEqual({ averageRating: 3, totalRatings: 1 });
  });

  it("gives an unrated recipe no stats", () => {
    expect(toRatingStats(null, null)).toBeUndefined();
    expect(toRatingStats(undefined, undefined)).toBeUndefined();
    expect(toRatingStats("0", 0)).toBeUndefined();
  });

  it("ignores an average that is not a number", () => {
    expect(toRatingStats("abc", 3)).toBeUndefined();
  });
});
