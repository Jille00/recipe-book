import { describe, expect, it } from "vitest";
import {
  cookStepStorageKey,
  createTimer,
  describeDuration,
  formatClock,
  ingredientQuantity,
  parseStepDurations,
  parseStoredStep,
  pauseTimer,
  resetTimer,
  splitByDurations,
  startTimer,
  tickTimer,
  timerRemaining,
} from "./cook-mode";

const seconds = (text: string) => parseStepDurations(text).map((d) => d.seconds);

describe("parseStepDurations", () => {
  it("finds a plain duration", () => {
    expect(parseStepDurations("Bake 25 minutes until golden.")).toEqual([
      { start: 5, end: 15, text: "25 minutes", seconds: 1500 },
    ]);
  });

  it("understands hours, minutes and seconds in their usual spellings", () => {
    expect(seconds("Simmer for 1 hour.")).toEqual([3600]);
    expect(seconds("Rest 2 hrs")).toEqual([7200]);
    expect(seconds("Stir 5 min.")).toEqual([300]);
    expect(seconds("Stir 5 mins")).toEqual([300]);
    expect(seconds("Blend 30 seconds")).toEqual([30]);
    expect(seconds("Blend 30 sec")).toEqual([30]);
    expect(seconds("Boil 10min")).toEqual([600]);
  });

  it("uses the upper bound of a range", () => {
    expect(seconds("Bake 10-15 min")).toEqual([900]);
    expect(seconds("Bake 10 – 15 minutes")).toEqual([900]);
    expect(seconds("Roast 1 to 2 hours")).toEqual([7200]);
    expect(seconds("Cook 2 or 3 minutes")).toEqual([180]);
  });

  it("reads fractions, decimals and words", () => {
    expect(seconds("Chill 1½ hours")).toEqual([5400]);
    expect(seconds("Chill 1 1/2 hours")).toEqual([5400]);
    expect(seconds("Chill 1.5 hours")).toEqual([5400]);
    expect(seconds("Stir for a minute")).toEqual([60]);
    expect(seconds("Rest an hour")).toEqual([3600]);
    expect(seconds("Knead for ten minutes")).toEqual([600]);
    expect(seconds("Leave for half an hour")).toEqual([1800]);
    expect(seconds("Leave for an hour and a half")).toEqual([5400]);
    expect(seconds("Leave for 2 and a half hours")).toEqual([9000]);
  });

  it("joins a compound duration into one", () => {
    const [duration] = parseStepDurations("Braise 1 hour and 30 minutes, covered.");
    expect(duration.seconds).toBe(5400);
    expect(duration.text).toBe("1 hour and 30 minutes");
    expect(seconds("Braise 2 hours, 15 minutes")).toEqual([8100]);
  });

  it("keeps separate durations apart", () => {
    expect(
      seconds("Sear 2 minutes per side, then rest for 10 minutes.")
    ).toEqual([120, 600]);
    // Units that grow are not one compound duration
    expect(seconds("Boil 30 seconds and 5 minutes")).toEqual([30, 300]);
  });

  it("handles adjectives and extra words", () => {
    expect(seconds("Allow a 5-minute rest")).toEqual([300]);
    expect(seconds("Bake 10 more minutes")).toEqual([600]);
  });

  it("reads Dutch steps", () => {
    expect(seconds("Bak 25 minuten")).toEqual([1500]);
    expect(seconds("Laat 1 uur rusten")).toEqual([3600]);
    expect(seconds("Laat 1,5 uur rusten")).toEqual([5400]);
    expect(seconds("Laat anderhalf uur rusten")).toEqual([5400]);
    expect(seconds("Laat een half uur rusten")).toEqual([1800]);
  });

  it("ignores numbers that are not durations", () => {
    expect(parseStepDurations("Preheat the oven to 180°C (350°F).")).toEqual([]);
    expect(parseStepDurations("Add 2 cups of flour and 3 eggs.")).toEqual([]);
    expect(parseStepDurations("Use a mint leaf")).toEqual([]);
    expect(parseStepDurations("Add the amino acids")).toEqual([]);
    expect(parseStepDurations("Mix the minced garlic")).toEqual([]);
  });

  it("ignores durations too long for a kitchen timer", () => {
    expect(parseStepDurations("Marinate 48 hours")).toEqual([]);
  });

  it("copes with empty or non-string input", () => {
    expect(parseStepDurations("")).toEqual([]);
    expect(parseStepDurations(undefined as unknown as string)).toEqual([]);
  });
});

describe("splitByDurations", () => {
  it("cuts the text around each duration", () => {
    const text = "Bake 25 minutes, then cool 10 min.";
    expect(splitByDurations(text, parseStepDurations(text))).toEqual([
      { text: "Bake ", durationIndex: null },
      { text: "25 minutes", durationIndex: 0 },
      { text: ", then cool ", durationIndex: null },
      { text: "10 min", durationIndex: 1 },
      { text: ".", durationIndex: null },
    ]);
  });

  it("returns the whole text when there are no durations", () => {
    expect(splitByDurations("Serve.", [])).toEqual([
      { text: "Serve.", durationIndex: null },
    ]);
  });
});

describe("timers", () => {
  it("counts down from start and finishes on time", () => {
    let timer = startTimer(createTimer(60), 1_000);
    expect(timer.status).toBe("running");
    expect(timerRemaining(timer, 31_000)).toBe(30_000);
    expect(tickTimer(timer, 31_000)).toBe(timer);
    timer = tickTimer(timer, 61_000);
    expect(timer.status).toBe("done");
    expect(timerRemaining(timer, 99_000)).toBe(0);
  });

  it("pauses and resumes where it left off", () => {
    let timer = startTimer(createTimer(60), 0);
    timer = pauseTimer(timer, 20_000);
    expect(timer.status).toBe("paused");
    expect(timerRemaining(timer, 50_000)).toBe(40_000);
    timer = startTimer(timer, 50_000);
    expect(timerRemaining(timer, 60_000)).toBe(30_000);
  });

  it("restarts a finished timer from the full duration", () => {
    const done = tickTimer(startTimer(createTimer(10), 0), 10_000);
    const again = startTimer(done, 20_000);
    expect(again.status).toBe("running");
    expect(timerRemaining(again, 20_000)).toBe(10_000);
  });

  it("resets to idle at the full duration", () => {
    const timer = resetTimer(pauseTimer(startTimer(createTimer(90), 0), 30_000));
    expect(timer).toEqual(createTimer(90));
  });

  it("leaves timers that are not running alone", () => {
    const idle = createTimer(30);
    expect(pauseTimer(idle, 5)).toBe(idle);
    expect(tickTimer(idle, 99_999)).toBe(idle);
  });
});

describe("formatClock", () => {
  it("formats minutes and seconds, rounding up", () => {
    expect(formatClock(245_000)).toBe("4:05");
    expect(formatClock(244_001)).toBe("4:05");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-5)).toBe("0:00");
  });

  it("adds hours when needed", () => {
    expect(formatClock(3_729_000)).toBe("1:02:09");
  });
});

describe("describeDuration", () => {
  it("spells the duration out", () => {
    expect(describeDuration(1500)).toBe("25 minutes");
    expect(describeDuration(5400)).toBe("1 hour 30 minutes");
    expect(describeDuration(45)).toBe("45 seconds");
    expect(describeDuration(61)).toBe("1 minute 1 second");
  });
});

describe("ingredientQuantity", () => {
  it("prefers the converted amount", () => {
    expect(
      ingredientQuantity({
        text: "flour",
        amount: "1",
        unit: "cup",
        converted: { displayAmount: "240", unit: "ml" },
      })
    ).toBe("240 ml");
  });

  it("uses the scaled amount when scaled", () => {
    expect(
      ingredientQuantity({
        text: "eggs",
        amount: "2",
        scaledAmount: "4",
        wasScaled: true,
      })
    ).toBe("4");
  });

  it("falls back to the amount as written", () => {
    expect(ingredientQuantity({ text: "salt", amount: "1", unit: "tsp" })).toBe("1 tsp");
    expect(ingredientQuantity({ text: "salt to taste" })).toBe("");
  });
});

describe("stored step", () => {
  it("keys the step by recipe", () => {
    expect(cookStepStorageKey("abc")).not.toBe(cookStepStorageKey("abd"));
  });

  it("parses a stored step and clamps it to the recipe", () => {
    expect(parseStoredStep("2", 5)).toBe(2);
    expect(parseStoredStep("9", 5)).toBe(4);
  });

  it("falls back to the first step for anything unusable", () => {
    expect(parseStoredStep(null, 5)).toBe(0);
    expect(parseStoredStep("-1", 5)).toBe(0);
    expect(parseStoredStep("1.5", 5)).toBe(0);
    expect(parseStoredStep("two", 5)).toBe(0);
    expect(parseStoredStep("3", 0)).toBe(0);
  });
});
