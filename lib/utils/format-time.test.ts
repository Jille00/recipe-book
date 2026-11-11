import { describe, expect, it } from "vitest";
import { formatMinutes } from "./format-time";

describe("formatMinutes", () => {
  it.each([
    [0, "0 min"],
    [40, "40 min"],
    [60, "1 h"],
    [65, "1 h 05"],
    [135, "2 h 15"],
    [-5, "0 min"],
  ])("%d -> %s", (minutes, label) => {
    expect(formatMinutes(minutes)).toBe(label);
  });
});
