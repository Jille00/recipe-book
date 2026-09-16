import { describe, expect, it } from "vitest";
import {
  celsiusToFahrenheit,
  convertTemperatureInText,
  convertUnit,
  fahrenheitToCelsius,
  formatAmount,
  formatMetricAmount,
  getSystemDisplayName,
  getUnitsForSystem,
  isRecognizedUnit,
  normalizeUnit,
  parseAmount,
  VULGAR_FRACTIONS,
} from "./unit-conversion";

describe("normalizeUnit", () => {
  it("treats lowercase t as teaspoon and uppercase T as tablespoon", () => {
    expect(normalizeUnit("t")?.symbol).toBe("tsp");
    expect(normalizeUnit("T")?.symbol).toBe("tbsp");
  });

  it.each([
    ["tsp", "tsp"],
    ["TSP", "tsp"],
    ["Teaspoons", "tsp"],
    ["Tbsp", "tbsp"],
    ["TABLESPOON", "tbsp"],
    ["tbs", "tbsp"],
    ["Cups", "cup"],
    ["C", "cup"],
    ["c", "cup"],
    ["FL OZ", "fl oz"],
    ["fl. oz", "fl oz"],
    ["mL", "ml"],
    ["ML", "ml"],
    ["millilitres", "ml"],
    ["L", "L"],
    ["litre", "L"],
    ["Grams", "g"],
    ["KG", "kg"],
    ["Kilos", "kg"],
    ["lbs", "lb"],
    ["Pounds", "lb"],
    ["ozs", "oz"],
    ["pints", "pt"],
    ["qt", "qt"],
    ["gal", "gal"],
  ])("resolves %j case-insensitively to %s", (input, symbol) => {
    expect(normalizeUnit(input)?.symbol).toBe(symbol);
  });

  it("ignores surrounding whitespace", () => {
    expect(normalizeUnit("  cup  ")?.symbol).toBe("cup");
    expect(normalizeUnit(" T ")?.symbol).toBe("tbsp");
  });

  it("returns null for unknown, empty or non-string input", () => {
    expect(normalizeUnit("handful")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit("   ")).toBeNull();
    expect(normalizeUnit(null as unknown as string)).toBeNull();
    expect(normalizeUnit(42 as unknown as string)).toBeNull();
  });
});

describe("isRecognizedUnit", () => {
  it("is true for known units and aliases", () => {
    expect(isRecognizedUnit("t")).toBe(true);
    expect(isRecognizedUnit("T")).toBe(true);
    expect(isRecognizedUnit("Cups")).toBe(true);
  });

  it("is false for unknown or empty units", () => {
    expect(isRecognizedUnit("clove")).toBe(false);
    expect(isRecognizedUnit("")).toBe(false);
  });
});

describe("parseAmount", () => {
  it.each([
    ["½", 0.5],
    ["¼", 0.25],
    ["¾", 0.75],
    ["⅛", 0.125],
    ["1½", 1.5],
    ["1 ½", 1.5],
    ["2¾", 2.75],
    ["-½", -0.5],
    ["½ cup", 0.5],
    ["↉", 0],
  ])("parses the vulgar fraction %j as %d", (input, expected) => {
    expect(parseAmount(input)).toBeCloseTo(expected, 10);
  });

  it("parses thirds exactly", () => {
    expect(parseAmount("⅓")).toBeCloseTo(1 / 3, 10);
    expect(parseAmount("1⅔")).toBeCloseTo(5 / 3, 10);
  });

  it.each([
    ["1/2", 0.5],
    ["3/4", 0.75],
    ["1⁄2", 0.5],
    ["1 1/2", 1.5],
    ["-1 1/2", -1.5],
    ["2 3/4 cups", 2.75],
    ["2", 2],
    ["2.5", 2.5],
    ["  3  ", 3],
    ["3 cups", 3],
  ])("parses %j as %d", (input, expected) => {
    expect(parseAmount(input)).toBeCloseTo(expected, 10);
  });

  it("refuses a zero denominator instead of returning Infinity", () => {
    expect(parseAmount("1/0")).toBeNull();
    expect(parseAmount("1 1/0")).toBeNull();
  });

  it("returns null for text, empty and non-string input", () => {
    expect(parseAmount("to taste")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount(undefined as unknown as string)).toBeNull();
    expect(parseAmount(2 as unknown as string)).toBeNull();
  });

  it("knows every vulgar fraction it exports", () => {
    for (const [glyph, value] of Object.entries(VULGAR_FRACTIONS)) {
      expect(parseAmount(glyph)).toBeCloseTo(value, 10);
    }
  });
});

describe("formatAmount", () => {
  it.each([
    [0.5, "½"],
    [0.25, "¼"],
    [0.75, "¾"],
    [1 / 3, "⅓"],
    [2 / 3, "⅔"],
    [0.125, "⅛"],
    [1.5, "1½"],
    [2.25, "2¼"],
    [2 + 1 / 6, "2⅙"],
  ])("formats %d as %j", (input, expected) => {
    expect(formatAmount(input)).toBe(expected);
  });

  it.each([
    [2, "2"],
    [1.3, "1.3"],
    [473.17, "473.2"],
    [3.99, "4"],
    [1.014, "1"],
  ])("formats %d as the plain number %j", (input, expected) => {
    expect(formatAmount(input)).toBe(expected);
  });

  it("avoids uncommon glyphs for larger amounts", () => {
    // ⅙ is only used below 10: "10⅙" reads worse than a decimal
    expect(formatAmount(10 + 1 / 6)).toBe("10.2");
  });

  it("formats negatives with a leading minus", () => {
    expect(formatAmount(-0.5)).toBe("-½");
    expect(formatAmount(-1.5)).toBe("-1½");
    expect(formatAmount(-3)).toBe("-3");
    expect(formatAmount(-0.02)).toBe("-0.02");
  });

  it.each([0.04, 0.01, 0.001, 0.0000001, 1e-12])(
    "never renders the small positive amount %d as 0",
    (input) => {
      const output = formatAmount(input);
      expect(output).not.toBe("0");
      expect(output).not.toMatch(/e/i);
      expect(Number(output)).toBeGreaterThan(0);
    }
  );

  it("keeps two significant digits for small amounts", () => {
    expect(formatAmount(0.04)).toBe("0.04");
    expect(formatAmount(0.041)).toBe("0.041");
    expect(formatAmount(0.001)).toBe("0.001");
    expect(formatAmount(1e-7)).toBe("0.0000001");
  });

  it("returns 0 for zero and non-finite input", () => {
    expect(formatAmount(0)).toBe("0");
    expect(formatAmount(NaN)).toBe("0");
    expect(formatAmount(Infinity)).toBe("0");
    expect(formatAmount("1" as unknown as number)).toBe("0");
  });

  it("round-trips with parseAmount for every display fraction", () => {
    const fractions = [1 / 8, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 3 / 8, 1 / 2, 5 / 8, 2 / 3, 3 / 4, 7 / 8];
    for (const whole of [0, 1, 3, 9]) {
      for (const fraction of fractions) {
        const value = whole + fraction;
        const formatted = formatAmount(value);
        expect(formatted).not.toMatch(/\./);
        expect(parseAmount(formatted)).toBeCloseTo(value, 10);
      }
    }
  });

  it("round-trips negative fractions", () => {
    expect(parseAmount(formatAmount(-1.75))).toBeCloseTo(-1.75, 10);
  });
});

// Regression: toFixed(1) rounded halfway values down, because 1.95 is stored
// as 1.9499999..., so 1.95 displayed as "1.9".
describe("formatAmount rounds halfway values up", () => {
  it.each([
    [1.95, "2"],
    [2.45, "2.5"],
    [1.05, "1.1"],
    [0.95, "1"],
    [-1.95, "-2"],
  ])("formats %s as %j", (amount, expected) => {
    expect(formatAmount(amount)).toBe(expected);
  });

  it("still rounds down below the halfway point", () => {
    expect(formatAmount(1.94)).toBe("1.9");
  });
});

describe("formatMetricAmount", () => {
  it.each([
    [44.36, "44"],
    [453.592, "454"],
    [4.92892, "4.9"],
    [14.7868, "15"],
    [10, "10"],
    [9.96, "10"],
    [1.25, "1.3"],
    [0.616, "0.62"],
    [0.001, "0.001"],
    [-4.92892, "-4.9"],
    [-453.592, "-454"],
  ])("formats %d as %j", (input, expected) => {
    expect(formatMetricAmount(input)).toBe(expected);
  });

  it("never uses vulgar fractions", () => {
    for (const value of [0.5, 1.5, 44.375, 2.25, 0.125, 1 / 3]) {
      const output = formatMetricAmount(value);
      expect(output).toMatch(/^-?\d+(\.\d+)?$/);
    }
  });

  it("returns 0 for zero and non-finite input", () => {
    expect(formatMetricAmount(0)).toBe("0");
    expect(formatMetricAmount(NaN)).toBe("0");
    expect(formatMetricAmount(-Infinity)).toBe("0");
  });
});

describe("convertUnit", () => {
  describe("imperial to metric", () => {
    it("converts 1 t to about 4.9 ml, not tablespoons", () => {
      const result = convertUnit("1", "t", "metric");
      expect(result).toMatchObject({ unit: "ml", displayAmount: "4.9", wasConverted: true });
      expect(result.amount).toBeCloseTo(4.92892, 4);
    });

    it("converts 1 T to 15 ml", () => {
      expect(convertUnit("1", "T", "metric")).toMatchObject({
        unit: "ml",
        displayAmount: "15",
        wasConverted: true,
      });
    });

    it.each([
      ["3", "tbsp", "44", "ml"],
      ["1", "cup", "237", "ml"],
      ["1/2", "cup", "118", "ml"],
      ["1½", "cups", "355", "ml"],
      ["4", "cups", "946", "ml"],
      ["5", "cups", "1.2", "L"],
      ["1", "lb", "454", "g"],
      ["1", "oz", "28", "g"],
      ["1/8", "tsp", "0.62", "ml"],
    ])("converts %s %s to %s %s", (amount, unit, display, target) => {
      expect(convertUnit(amount, unit, "metric")).toMatchObject({
        displayAmount: display,
        unit: target,
        wasConverted: true,
      });
    });

    it("never shows fractions for metric results", () => {
      for (const amount of ["⅓", "1½", "2¾", "3 1/8"]) {
        for (const unit of ["tsp", "tbsp", "cup", "oz", "lb"]) {
          expect(convertUnit(amount, unit, "metric").displayAmount).toMatch(/^\d+(\.\d+)?$/);
        }
      }
    });
  });

  describe("metric to imperial", () => {
    it.each([
      ["5", "ml", "1", "tsp"],
      ["15", "ml", "1", "tbsp"],
      ["100", "g", "3.5", "oz"],
      ["1", "kg", "2⅕", "lb"],
      ["250", "ml", "1.1", "cup"],
      ["1", "l", "1.1", "qt"],
      ["60", "ml", "¼", "cup"],
    ])("picks a natural unit: %s %s becomes %s %s", (amount, unit, display, target) => {
      expect(convertUnit(amount, unit, "imperial")).toMatchObject({
        displayAmount: display,
        unit: target,
        wasConverted: true,
      });
    });

    it("falls back to the smallest unit for tiny amounts without showing 0", () => {
      const result = convertUnit("0.2", "ml", "imperial");
      expect(result.unit).toBe("tsp");
      expect(result.displayAmount).toBe("0.041");
    });
  });

  it("round-trips a common measure through both systems", () => {
    const metric = convertUnit("2", "cups", "metric");
    const back = convertUnit(String(metric.amount), metric.unit, "imperial");
    expect(back.unit).toBe("cup");
    expect(back.displayAmount).toBe("2");
  });

  it("leaves amounts already in the target system unconverted but formatted", () => {
    expect(convertUnit("0.5", "cups", "imperial")).toMatchObject({
      amount: 0.5,
      unit: "cup",
      displayAmount: "½",
      originalAmount: "0.5",
      originalUnit: "cups",
      wasConverted: false,
    });
    expect(convertUnit("44.36", "ml", "metric")).toMatchObject({
      unit: "ml",
      displayAmount: "44",
      wasConverted: false,
    });
  });

  it("returns the original for an unknown unit", () => {
    expect(convertUnit("2", "handful", "metric")).toEqual({
      amount: 2,
      unit: "handful",
      displayAmount: "2",
      originalAmount: "2",
      originalUnit: "handful",
      wasConverted: false,
    });
  });

  it("returns the original for an unparseable amount", () => {
    expect(convertUnit("some", "cup", "metric")).toEqual({
      amount: 0,
      unit: "cup",
      displayAmount: "some",
      originalAmount: "some",
      originalUnit: "cup",
      wasConverted: false,
    });
  });
});

describe("fahrenheitToCelsius / celsiusToFahrenheit", () => {
  it.each([
    [212, 100],
    [32, 0],
    [-40, -40],
    [350, 177],
    [165, 74],
  ])("%d °F is %d °C", (f, c) => {
    expect(fahrenheitToCelsius(f)).toBe(c);
  });

  it.each([
    [100, 212],
    [0, 32],
    [-40, -40],
    [180, 356],
    [200, 392],
  ])("%d °C is %d °F", (c, f) => {
    expect(celsiusToFahrenheit(c)).toBe(f);
  });
});

describe("convertTemperatureInText", () => {
  describe("converts real temperatures", () => {
    it.each([
      ["bake at 180 C", "imperial", "bake at 356°F (180°C)"],
      ["Bake at 180°C for 20 minutes", "imperial", "Bake at 356°F (180°C) for 20 minutes"],
      ["preheat oven to 200 degrees Celsius", "imperial", "preheat oven to 392°F (200°C)"],
      ["Heat to 200 deg C", "imperial", "Heat to 392°F (200°C)"],
      ["350°F", "metric", "177°C (350°F)"],
      ["350F", "metric", "177°C (350°F)"],
      ["Roast at 425 F", "metric", "Roast at 218°C (425°F)"],
      ["until the internal temperature reaches 165 °F", "metric", "until the internal temperature reaches 74°C (165°F)"],
      ["Preheat to 400 Fahrenheit", "metric", "Preheat to 204°C (400°F)"],
    ] as const)("%j (to %s) becomes %j", (input, system, expected) => {
      expect(convertTemperatureInText(input, system)).toBe(expected);
    });

    it("converts every temperature in a sentence", () => {
      expect(
        convertTemperatureInText("Start at 220°C, then lower to 180°C.", "imperial")
      ).toBe("Start at 428°F (220°C), then lower to 356°F (180°C).");
    });
  });

  // Regression: ranges used to convert only their second number, producing
  // mixed units like "350-191°C (375°F)".
  describe("converts both ends of a temperature range", () => {
    it.each([
      ["bake at 350-375°F", "metric", "bake at 177-191°C (350-375°F)"],
      ["bake at 350–375°F", "metric", "bake at 177–191°C (350–375°F)"],
      ["preheat to 350—375F", "metric", "preheat to 177—191°C (350—375°F)"],
      ["bake at 180-200 C", "imperial", "bake at 356-392°F (180-200°C)"],
      ["bake at 180-200°C", "imperial", "bake at 356-392°F (180-200°C)"],
      ["bake at 180 to 200°C", "imperial", "bake at 356 to 392°F (180 to 200°C)"],
      ["bake at 180°-200°C", "imperial", "bake at 356-392°F (180-200°C)"],
      ["bake at 180°C-200°C", "imperial", "bake at 356-392°F (180-200°C)"],
    ] as const)("%j (to %s) -> %j", (text, system, expected) => {
      expect(convertTemperatureInText(text, system)).toBe(expected);
    });

    it("leaves a range in the other scale alone", () => {
      expect(convertTemperatureInText("bake at 180-200°C", "metric")).toBe(
        "bake at 180-200°C"
      );
    });

    it("does not treat a quantity range as temperatures", () => {
      expect(convertTemperatureInText("stir in 2-3 c rice", "imperial")).toBe(
        "stir in 2-3 c rice"
      );
      expect(convertTemperatureInText("cook 1-2 f", "metric")).toBe("cook 1-2 f");
    });

    it("converts a range and a single temperature in the same text once each", () => {
      expect(
        convertTemperatureInText(
          "Bake at 350-375°F, then broil at 450°F.",
          "metric"
        )
      ).toBe("Bake at 177-191°C (350-375°F), then broil at 232°C (450°F).");
    });
  });

  describe("leaves quantities that look like units alone", () => {
    it.each([
      ["2 c flour", "imperial"],
      ["Add 2 c flour", "imperial"],
      ["heat 2 c milk", "imperial"],
      ["salt and 2 c flour", "imperial"],
      ["1 f", "metric"],
      ["Use 1 f", "metric"],
      ["3 C sugar", "imperial"],
    ] as const)("%j (to %s) is unchanged", (input, system) => {
      expect(convertTemperatureInText(input, system)).toBe(input);
    });
  });

  it("does not convert temperatures already in the target system", () => {
    expect(convertTemperatureInText("bake at 180°C", "metric")).toBe("bake at 180°C");
    expect(convertTemperatureInText("bake at 350°F", "imperial")).toBe("bake at 350°F");
  });

  it("ignores implausible temperatures even with a degree sign", () => {
    expect(convertTemperatureInText("5000°F", "metric")).toBe("5000°F");
  });

  it("leaves text without temperatures unchanged", () => {
    expect(convertTemperatureInText("Stir for 5 minutes.", "metric")).toBe("Stir for 5 minutes.");
  });

  it("returns empty and non-string input as-is", () => {
    expect(convertTemperatureInText("", "metric")).toBe("");
    expect(convertTemperatureInText(null as unknown as string, "metric")).toBeNull();
    expect(convertTemperatureInText(undefined as unknown as string, "imperial")).toBeUndefined();
  });
});

describe("getSystemDisplayName", () => {
  it("names both systems", () => {
    expect(getSystemDisplayName("metric")).toBe("Metric");
    expect(getSystemDisplayName("imperial")).toBe("Imperial");
  });
});

describe("getUnitsForSystem", () => {
  it("lists units of one category and system only", () => {
    expect(getUnitsForSystem("weight", "metric").map((u) => u.symbol)).toEqual(["mg", "g", "kg"]);
    expect(getUnitsForSystem("weight", "imperial").map((u) => u.symbol)).toEqual(["oz", "lb"]);
    for (const unit of getUnitsForSystem("volume", "imperial")) {
      expect(unit).toMatchObject({ category: "volume", system: "imperial" });
    }
  });

  it("has no table units for temperature", () => {
    expect(getUnitsForSystem("temperature", "metric")).toEqual([]);
  });
});
