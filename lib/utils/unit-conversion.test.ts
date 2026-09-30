import { describe, it, expect } from "vitest";
import {
  normalizeUnit,
  parseAmount,
  formatAmount,
  formatMetricAmount,
  convertUnit,
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  convertTemperatureInText,
  getSystemDisplayName,
  isRecognizedUnit,
  getUnitsForSystem,
  VULGAR_FRACTIONS,
} from "./unit-conversion";

describe("normalizeUnit", () => {
  it.each([
    ["tsp", "tsp"],
    ["teaspoon", "tsp"],
    ["Teaspoons", "tsp"],
    ["TSP", "tsp"],
    ["tbsp", "tbsp"],
    ["Tbsp", "tbsp"],
    ["tablespoons", "tbsp"],
    ["tbs", "tbsp"],
    ["cup", "cup"],
    ["Cups", "cup"],
    ["c", "cup"],
    ["fl oz", "fl oz"],
    ["floz", "fl oz"],
    ["fl. oz", "fl oz"],
    ["fluid ounces", "fl oz"],
    ["pint", "pt"],
    ["pts", "pt"],
    ["qt", "qt"],
    ["gallons", "gal"],
    ["ml", "ml"],
    ["mL", "ml"],
    ["millilitres", "ml"],
    ["cl", "cl"],
    ["dl", "dl"],
    ["l", "L"],
    ["L", "L"],
    ["Litres", "L"],
    ["oz", "oz"],
    ["ounces", "oz"],
    ["lb", "lb"],
    ["lbs", "lb"],
    ["pounds", "lb"],
    ["mg", "mg"],
    ["g", "g"],
    ["grams", "g"],
    ["kg", "kg"],
    ["kgs", "kg"],
    ["kilo", "kg"],
    ["kilos", "kg"],
  ])("resolves %j to %s", (input, symbol) => {
    expect(normalizeUnit(input)?.symbol).toBe(symbol);
  });

  it("distinguishes 't' (teaspoon) from 'T' (tablespoon) by case", () => {
    expect(normalizeUnit("t")?.name).toBe("teaspoon");
    expect(normalizeUnit("T")?.name).toBe("tablespoon");
  });

  it("handles the case-sensitive abbreviations in plural form", () => {
    expect(normalizeUnit("ts")?.name).toBe("teaspoon");
    expect(normalizeUnit("Ts")?.name).toBe("tablespoon");
  });

  it("trims surrounding whitespace, including around case-sensitive aliases", () => {
    expect(normalizeUnit("  cup  ")?.symbol).toBe("cup");
    expect(normalizeUnit(" T ")?.name).toBe("tablespoon");
  });

  it("returns null for empty, whitespace and non-string input", () => {
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit("   ")).toBeNull();
    expect(normalizeUnit(null as unknown as string)).toBeNull();
    expect(normalizeUnit(42 as unknown as string)).toBeNull();
  });

  it("returns null for unknown units", () => {
    expect(normalizeUnit("pinch")).toBeNull();
    expect(normalizeUnit("clove")).toBeNull();
    expect(normalizeUnit("handful")).toBeNull();
    expect(normalizeUnit("ms")).toBeNull();
    expect(normalizeUnit("fl oz.")).toBeNull();
  });

  it("reports category and system", () => {
    expect(normalizeUnit("cup")).toMatchObject({ category: "volume", system: "imperial" });
    expect(normalizeUnit("g")).toMatchObject({ category: "weight", system: "metric" });
  });
});

describe("parseAmount", () => {
  it.each([
    ["2", 2],
    ["0", 0],
    ["1.5", 1.5],
    [".5", 0.5],
    ["  3  ", 3],
    ["1/2", 0.5],
    ["3/4", 0.75],
    ["1.5/2", 0.75],
    ["1 1/2", 1.5],
    ["12 1/2", 12.5],
    ["-1 1/2", -1.5],
    ["-2", -2],
    ["-1/2", -0.5],
    ["1⁄2", 0.5], // unicode fraction slash
    ["1 1⁄4", 1.25],
    ["½", 0.5],
    ["¼", 0.25],
    ["¾", 0.75],
    ["⅓", 1 / 3],
    ["⅛", 0.125],
    ["1½", 1.5],
    ["1 ½", 1.5],
    ["2¾", 2.75],
    ["-½", -0.5],
    ["½ cup", 0.5],
    ["2 cups", 2],
    ["1 1/2 cups", 1.5],
    ["↉", 0],
  ])("parses %j as %d", (input, expected) => {
    expect(parseAmount(input)).toBeCloseTo(expected, 10);
  });

  it("understands every vulgar fraction it advertises", () => {
    for (const [glyph, value] of Object.entries(VULGAR_FRACTIONS)) {
      expect(parseAmount(glyph)).toBeCloseTo(value, 10);
    }
  });

  it("returns null for zero denominators", () => {
    expect(parseAmount("1/0")).toBeNull();
    expect(parseAmount("1 1/0")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("to taste")).toBeNull();
    expect(parseAmount("a pinch")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseAmount(undefined as unknown as string)).toBeNull();
    expect(parseAmount(null as unknown as string)).toBeNull();
    expect(parseAmount(2 as unknown as string)).toBeNull();
  });

  it("reads only the first number of a range", () => {
    expect(parseAmount("1-2")).toBe(1);
    expect(parseAmount("2 to 3")).toBe(2);
  });

  it("parses a fraction immediately followed by a unit", () => {
    expect(parseAmount("1/2cup")).toBe(0.5);
  });

  it("parses a mixed number immediately followed by a unit", () => {
    expect(parseAmount("1 1/2cups")).toBe(1.5);
  });

  it("parses a decimal comma", () => {
    expect(parseAmount("1,5")).toBe(1.5);
    expect(parseAmount("12,25")).toBe(12.25);
    expect(parseAmount("1,5 kg")).toBe(1.5);
    expect(parseAmount("-0,5")).toBe(-0.5);
  });

  it("reads a comma followed by three digits as a thousands separator", () => {
    expect(parseAmount("1,000")).toBe(1000);
    expect(parseAmount("1,250.5")).toBe(1250.5);
    expect(parseAmount("12,345,678 g")).toBe(12345678);
  });
});

describe("formatAmount", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2"],
    [0.5, "½"],
    [0.25, "¼"],
    [0.75, "¾"],
    [1 / 3, "⅓"],
    [2 / 3, "⅔"],
    [0.125, "⅛"],
    [0.375, "⅜"],
    [0.625, "⅝"],
    [0.875, "⅞"],
    [1.5, "1½"],
    [2.25, "2¼"],
    [1 / 6, "⅙"],
    [0.2, "⅕"],
    [0.9, "0.9"],
    [0.1, "0.1"],
    [3.527, "3.5"],
    [1.99, "2"],
    [2.95, "3"],
    [-1.5, "-1½"],
    [-2, "-2"],
  ])("formats %d as %j", (input, expected) => {
    expect(formatAmount(input)).toBe(expected);
  });

  it("only uses sixths/fifths for small whole parts", () => {
    expect(formatAmount(3 + 1 / 6)).toBe("3⅙");
    expect(formatAmount(10 + 1 / 6)).toBe("10.2");
    expect(formatAmount(473 + 1 / 6)).toBe("473.2");
    expect(formatAmount(12.2)).toBe("12.2");
  });

  it("never renders a tiny non-zero amount as 0", () => {
    expect(formatAmount(0.05)).toBe("0.05");
    expect(formatAmount(0.099)).toBe("0.099");
    expect(formatAmount(0.001)).toBe("0.001");
    expect(formatAmount(0.0001234)).toBe("0.00012");
    expect(formatAmount(1e-7)).toBe("0.0000001");
    expect(formatAmount(-0.05)).toBe("-0.05");
  });

  it("returns '0' for non-finite and non-number input", () => {
    expect(formatAmount(NaN)).toBe("0");
    expect(formatAmount(Infinity)).toBe("0");
    expect(formatAmount(-Infinity)).toBe("0");
    expect(formatAmount("1" as unknown as number)).toBe("0");
  });

  it("round-trips with parseAmount for common fractions", () => {
    for (const value of [0.25, 0.5, 0.75, 1.5, 2.75, 1 / 3, 2 / 3, 0.125]) {
      expect(parseAmount(formatAmount(value))).toBeCloseTo(value, 5);
    }
  });
});

describe("formatMetricAmount", () => {
  it.each([
    [0, "0"],
    [453.592, "454"],
    [10, "10"],
    [10.4, "10"],
    [236.588, "237"],
    [4.92892, "4.9"],
    [1, "1"],
    [1.04, "1"],
    [0.123, "0.12"],
    [0.005, "0.005"],
    [-15.4, "-15"],
    [-0.5, "-0.5"],
  ])("formats %d as %j", (input, expected) => {
    expect(formatMetricAmount(input)).toBe(expected);
  });

  it("never uses vulgar fractions", () => {
    expect(formatMetricAmount(44.375)).toBe("44");
    expect(formatMetricAmount(2.5)).toBe("2.5");
  });

  it("returns '0' for non-finite input", () => {
    expect(formatMetricAmount(NaN)).toBe("0");
    expect(formatMetricAmount(Infinity)).toBe("0");
  });
});

describe("convertUnit", () => {
  describe("imperial -> metric", () => {
    it.each([
      ["1", "cup", "237", "ml"],
      ["4", "cups", "946", "ml"],
      ["5", "cups", "1.2", "L"],
      ["½", "cup", "118", "ml"],
      ["1 1/2", "cups", "355", "ml"],
      ["1", "tsp", "4.9", "ml"],
      ["1", "t", "4.9", "ml"],
      ["1", "T", "15", "ml"],
      ["2", "tablespoons", "30", "ml"],
      ["1", "fl oz", "30", "ml"],
      ["1", "pint", "473", "ml"],
      ["1", "quart", "946", "ml"],
      ["1", "gallon", "3.8", "L"],
      ["1", "oz", "28", "g"],
      ["1", "lb", "454", "g"],
      ["2.5", "lbs", "1.1", "kg"],
    ])("%s %s -> %s %s", (amount, unit, display, symbol) => {
      const result = convertUnit(amount, unit, "metric");
      expect(result.wasConverted).toBe(true);
      expect(result.displayAmount).toBe(display);
      expect(result.unit).toBe(symbol);
      expect(result.originalAmount).toBe(amount);
      expect(result.originalUnit).toBe(unit);
    });

    it("returns the precise converted amount alongside the display string", () => {
      const result = convertUnit("1", "cup", "metric");
      expect(result.amount).toBeCloseTo(236.588, 3);
    });
  });

  describe("metric -> imperial", () => {
    it.each([
      ["250", "ml", "1.1", "cup"],
      ["5", "ml", "1", "tsp"],
      ["15", "ml", "1", "tbsp"],
      ["1", "ml", "⅕", "tsp"],
      ["1", "l", "1.1", "qt"],
      ["100", "g", "3.5", "oz"],
      ["500", "g", "1.1", "lb"],
      ["1", "kilo", "2⅕", "lb"],
    ])("%s %s -> %s %s", (amount, unit, display, symbol) => {
      const result = convertUnit(amount, unit, "imperial");
      expect(result.wasConverted).toBe(true);
      expect(result.displayAmount).toBe(display);
      expect(result.unit).toBe(symbol);
    });

    it("never picks an unidiomatic '½ tbsp'", () => {
      const result = convertUnit("7.5", "ml", "imperial");
      expect(result.unit).toBe("tsp");
      expect(result.displayAmount).toBe("1.5");
    });
  });

  it("does not convert when already in the target system", () => {
    expect(convertUnit("2", "cups", "imperial")).toMatchObject({
      amount: 2,
      unit: "cup",
      displayAmount: "2",
      wasConverted: false,
    });
    expect(convertUnit("1500", "g", "metric")).toMatchObject({
      amount: 1500,
      unit: "g",
      displayAmount: "1500",
      wasConverted: false,
    });
    // Metric stays decimal even when unchanged
    expect(convertUnit("0.5", "l", "metric").displayAmount).toBe("0.5");
  });

  it("returns the input unchanged for unknown units", () => {
    expect(convertUnit("1", "pinch", "metric")).toEqual({
      amount: 1,
      unit: "pinch",
      displayAmount: "1",
      originalAmount: "1",
      originalUnit: "pinch",
      wasConverted: false,
    });
  });

  it("returns the input unchanged for unparseable amounts", () => {
    expect(convertUnit("some", "cup", "metric")).toEqual({
      amount: 0,
      unit: "cup",
      displayAmount: "some",
      originalAmount: "some",
      originalUnit: "cup",
      wasConverted: false,
    });
  });

  it("keeps the sign of negative amounts", () => {
    expect(convertUnit("-1", "cup", "metric").displayAmount).toBe("-237");
  });

  it("converts zero", () => {
    const result = convertUnit("0", "cup", "metric");
    expect(result.displayAmount).toBe("0");
    expect(result.amount).toBe(0);
  });

  it("converts both ends of a range amount", () => {
    const result = convertUnit("1-2", "cups", "metric");
    expect(result.displayAmount).toBe("237-473");
    expect(result.unit).toBe("ml");
    expect(result.amount).toBeCloseTo(236.588, 3);
    expect(result.wasConverted).toBe(true);
  });

  it("picks one unit for a range from its upper end", () => {
    // 3 cups alone would be 710 ml, but 5 cups needs litres
    const result = convertUnit("3-5", "cups", "metric");
    expect(result.unit).toBe("L");
    expect(result.displayAmount).toBe("0.71-1.2");
  });

  it("converts a worded range", () => {
    expect(convertUnit("1 to 2", "lb", "metric").displayAmount).toBe("454-907");
  });

  it("formats a range that is already in the target system", () => {
    const result = convertUnit("1-2", "cups", "imperial");
    expect(result.displayAmount).toBe("1-2");
    expect(result.wasConverted).toBe(false);
  });
});

describe("temperature helpers", () => {
  it.each([
    [32, 0],
    [212, 100],
    [350, 177],
    [-40, -40],
    [0, -18],
  ])("fahrenheitToCelsius(%d) = %d", (f, c) => {
    expect(fahrenheitToCelsius(f)).toBe(c);
  });

  it.each([
    [0, 32],
    [100, 212],
    [180, 356],
    [-40, -40],
    [200, 392],
  ])("celsiusToFahrenheit(%d) = %d", (c, f) => {
    expect(celsiusToFahrenheit(c)).toBe(f);
  });
});

describe("convertTemperatureInText", () => {
  it("converts explicit Fahrenheit to Celsius for metric", () => {
    expect(convertTemperatureInText("Bake at 350°F for 20 min", "metric")).toBe(
      "Bake at 177°C (350°F) for 20 min"
    );
  });

  it("converts explicit Celsius to Fahrenheit for imperial", () => {
    expect(convertTemperatureInText("Preheat oven to 180°C.", "imperial")).toBe(
      "Preheat oven to 356°F (180°C)."
    );
  });

  it("handles attached, spelled-out and 'degrees' forms", () => {
    expect(convertTemperatureInText("350F", "metric")).toBe("177°C (350°F)");
    expect(convertTemperatureInText("350 degrees F", "metric")).toBe("177°C (350°F)");
    expect(convertTemperatureInText("350 deg. F", "metric")).toBe("177°C (350°F)");
    expect(convertTemperatureInText("200 degrees Celsius", "imperial")).toBe(
      "392°F (200°C)"
    );
    expect(convertTemperatureInText("425 fahrenheit", "metric")).toBe("218°C (425°F)");
    expect(convertTemperatureInText("180 ° c", "imperial")).toBe("356°F (180°C)");
  });

  it("leaves temperatures already in the target system alone", () => {
    expect(convertTemperatureInText("Bake at 180°C", "metric")).toBe("Bake at 180°C");
    expect(convertTemperatureInText("Bake at 350°F", "imperial")).toBe("Bake at 350°F");
  });

  it("uses context words for a bare scale letter", () => {
    expect(convertTemperatureInText("bake at 180 C", "imperial")).toBe(
      "bake at 356°F (180°C)"
    );
    expect(convertTemperatureInText("heat oven 400 F", "metric")).toBe(
      "heat oven 204°C (400°F)"
    );
  });

  it("does not treat cup quantities ('2 c flour') as temperatures", () => {
    expect(convertTemperatureInText("Add 2 c flour", "imperial")).toBe("Add 2 c flour");
    expect(convertTemperatureInText("Heat 2 c water", "imperial")).toBe("Heat 2 c water");
    expect(convertTemperatureInText("Stir in 1 C. sugar", "imperial")).toBe(
      "Stir in 1 C. sugar"
    );
  });

  it("ignores implausible magnitudes even with a degree sign", () => {
    expect(convertTemperatureInText("5000°C", "imperial")).toBe("5000°C");
    expect(convertTemperatureInText("2000°F", "metric")).toBe("2000°F");
  });

  it("handles negative temperatures", () => {
    expect(convertTemperatureInText("Freeze at -18°C", "imperial")).toBe(
      "Freeze at 0°F (-18°C)"
    );
  });

  it("rounds decimal temperatures", () => {
    expect(convertTemperatureInText("at 176.7°C", "imperial")).toBe("at 351°F (177°C)");
  });

  it("converts several temperatures in one string", () => {
    expect(
      convertTemperatureInText("Start at 450°F, then lower to 350°F.", "metric")
    ).toBe("Start at 232°C (450°F), then lower to 177°C (350°F).");
  });

  it("returns empty/non-string input unchanged", () => {
    expect(convertTemperatureInText("", "metric")).toBe("");
    expect(convertTemperatureInText(undefined as unknown as string, "metric")).toBe(
      undefined
    );
  });

  it("converts both ends of a temperature range", () => {
    expect(convertTemperatureInText("bake at 180-200 C", "imperial")).toBe(
      "bake at 356-392°F (180-200°C)"
    );
    expect(convertTemperatureInText("Bake at 350-375°F.", "metric")).toBe(
      "Bake at 177-191°C (350-375°F)."
    );
    expect(convertTemperatureInText("roast at 200 to 220°C", "imperial")).toBe(
      "roast at 392 to 428°F (200 to 220°C)"
    );
  });

  it("does not convert quantity ranges", () => {
    expect(convertTemperatureInText("Add 1-2 c flour", "imperial")).toBe(
      "Add 1-2 c flour"
    );
  });

  it("does not convert text that already gives both scales", () => {
    expect(convertTemperatureInText("Bake at 180°C (350°F).", "imperial")).toBe(
      "Bake at 180°C (350°F)."
    );
    expect(convertTemperatureInText("Bake at 180°C (350°F).", "metric")).toBe(
      "Bake at 180°C (350°F)."
    );
    expect(convertTemperatureInText("Bake at 350°F (180°C).", "imperial")).toBe(
      "Bake at 350°F (180°C)."
    );
    // Its own output is stable
    const once = convertTemperatureInText("bake at 180-200 C", "imperial");
    expect(convertTemperatureInText(once, "imperial")).toBe(once);
  });
});

describe("misc helpers", () => {
  it("getSystemDisplayName", () => {
    expect(getSystemDisplayName("metric")).toBe("Metric");
    expect(getSystemDisplayName("imperial")).toBe("Imperial");
  });

  it("isRecognizedUnit", () => {
    expect(isRecognizedUnit("cups")).toBe(true);
    expect(isRecognizedUnit("T")).toBe(true);
    expect(isRecognizedUnit("clove")).toBe(false);
    expect(isRecognizedUnit("")).toBe(false);
  });

  it("getUnitsForSystem", () => {
    expect(getUnitsForSystem("volume", "metric").map((u) => u.symbol)).toEqual([
      "ml",
      "cl",
      "dl",
      "L",
    ]);
    expect(getUnitsForSystem("weight", "imperial").map((u) => u.symbol)).toEqual([
      "oz",
      "lb",
    ]);
    expect(getUnitsForSystem("temperature", "metric")).toEqual([]);
  });
});
