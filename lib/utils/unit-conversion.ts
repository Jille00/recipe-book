import type {
  UnitSystem,
  UnitCategory,
  UnitDefinition,
  ConversionResult,
} from "@/types/units";

// Unit definitions with conversion factors
// Base units: ml for volume, g for weight
const UNITS: Record<string, UnitDefinition> = {
  // Volume - Imperial
  tsp: {
    name: "teaspoon",
    symbol: "tsp",
    aliases: ["tsp", "teaspoon", "teaspoons", "t"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 4.92892,
  },
  tbsp: {
    name: "tablespoon",
    symbol: "tbsp",
    aliases: ["tbsp", "tablespoon", "tablespoons", "tbs", "T"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 14.7868,
  },
  "fl oz": {
    name: "fluid ounce",
    symbol: "fl oz",
    aliases: ["fl oz", "fluid ounce", "fluid ounces", "floz", "fl. oz"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 29.5735,
  },
  cup: {
    name: "cup",
    symbol: "cup",
    aliases: ["cup", "cups", "c"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 236.588,
  },
  pint: {
    name: "pint",
    symbol: "pt",
    aliases: ["pint", "pints", "pt"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 473.176,
  },
  quart: {
    name: "quart",
    symbol: "qt",
    aliases: ["quart", "quarts", "qt"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 946.353,
  },
  gallon: {
    name: "gallon",
    symbol: "gal",
    aliases: ["gallon", "gallons", "gal"],
    category: "volume",
    system: "imperial",
    baseMultiplier: 3785.41,
  },

  // Volume - Metric
  ml: {
    name: "milliliter",
    symbol: "ml",
    aliases: ["ml", "milliliter", "milliliters", "mL", "millilitre", "millilitres"],
    category: "volume",
    system: "metric",
    baseMultiplier: 1,
  },
  cl: {
    name: "centiliter",
    symbol: "cl",
    aliases: ["cl", "centiliter", "centiliters", "centilitre", "centilitres"],
    category: "volume",
    system: "metric",
    baseMultiplier: 10,
  },
  dl: {
    name: "deciliter",
    symbol: "dl",
    aliases: ["dl", "deciliter", "deciliters", "decilitre", "decilitres"],
    category: "volume",
    system: "metric",
    baseMultiplier: 100,
  },
  l: {
    name: "liter",
    symbol: "L",
    aliases: ["l", "liter", "liters", "L", "litre", "litres"],
    category: "volume",
    system: "metric",
    baseMultiplier: 1000,
  },

  // Weight - Imperial
  oz: {
    name: "ounce",
    symbol: "oz",
    aliases: ["oz", "ounce", "ounces"],
    category: "weight",
    system: "imperial",
    baseMultiplier: 28.3495,
  },
  lb: {
    name: "pound",
    symbol: "lb",
    aliases: ["lb", "lbs", "pound", "pounds"],
    category: "weight",
    system: "imperial",
    baseMultiplier: 453.592,
  },

  // Weight - Metric
  mg: {
    name: "milligram",
    symbol: "mg",
    aliases: ["mg", "milligram", "milligrams"],
    category: "weight",
    system: "metric",
    baseMultiplier: 0.001,
  },
  g: {
    name: "gram",
    symbol: "g",
    aliases: ["g", "gram", "grams"],
    category: "weight",
    system: "metric",
    baseMultiplier: 1,
  },
  kg: {
    name: "kilogram",
    symbol: "kg",
    aliases: ["kg", "kilogram", "kilograms", "kilo", "kilos"],
    category: "weight",
    system: "metric",
    baseMultiplier: 1000,
  },
};

// Preferred units for display in each system, ordered from smallest to largest
const PREFERRED_UNITS: Record<UnitCategory, Record<UnitSystem, string[]>> = {
  volume: {
    imperial: ["tsp", "tbsp", "cup", "quart", "gallon"],
    metric: ["ml", "l"],
  },
  weight: {
    imperial: ["oz", "lb"],
    metric: ["g", "kg"],
  },
  temperature: {
    // Temperatures are handled by the dedicated temperature helpers, not by
    // the unit table, so there are no preferred unit keys here.
    imperial: [],
    metric: [],
  },
};

// Smallest converted value that still reads naturally for a given unit.
// e.g. "¼ tsp" and "¼ cup" are idiomatic, "½ tbsp" is not.
const MIN_NATURAL_AMOUNT: Record<string, number> = {
  tsp: 0.25,
  tbsp: 1,
  "fl oz": 1,
  cup: 0.25,
  pint: 1,
  quart: 1,
  gallon: 1,
  ml: 1,
  cl: 1,
  dl: 1,
  l: 1,
  oz: 1,
  lb: 1,
  mg: 1,
  g: 1,
  kg: 1,
};

// A few abbreviations are only distinguishable by case ("t" = teaspoon,
// "T" = tablespoon), so they get their own case-sensitive lookup and are
// deliberately kept out of the case-insensitive map below.
const CASE_SENSITIVE_ALIASES: Record<string, string> = {
  t: "tsp",
  T: "tbsp",
};

// Build alias lookup map for fast matching (case-insensitive aliases only)
const ALIAS_MAP: Map<string, UnitDefinition> = new Map();
Object.values(UNITS).forEach((unit) => {
  unit.aliases.forEach((alias) => {
    // Skip aliases that are resolved case-sensitively, otherwise the
    // lowercased "T" of tablespoon would clobber the "t" of teaspoon.
    if (Object.prototype.hasOwnProperty.call(CASE_SENSITIVE_ALIASES, alias)) {
      return;
    }
    ALIAS_MAP.set(alias.toLowerCase(), unit);
  });
});

function lookupCaseSensitive(value: string): UnitDefinition | null {
  const key = Object.prototype.hasOwnProperty.call(CASE_SENSITIVE_ALIASES, value)
    ? CASE_SENSITIVE_ALIASES[value]
    : null;
  return key ? UNITS[key] ?? null : null;
}

/**
 * Normalize a unit string to its definition
 */
export function normalizeUnit(input: string): UnitDefinition | null {
  if (typeof input !== "string" || !input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Case-sensitive abbreviations first ("t" vs "T")
  const caseSensitive = lookupCaseSensitive(trimmed);
  if (caseSensitive) return caseSensitive;

  const normalized = trimmed.toLowerCase();

  // Direct match
  if (ALIAS_MAP.has(normalized)) {
    return ALIAS_MAP.get(normalized)!;
  }

  // Try without trailing 's' for plurals
  if (normalized.endsWith("s")) {
    const singular = normalized.slice(0, -1);
    if (ALIAS_MAP.has(singular)) {
      return ALIAS_MAP.get(singular)!;
    }
    const singularCaseSensitive = lookupCaseSensitive(trimmed.slice(0, -1));
    if (singularCaseSensitive) return singularCaseSensitive;
  }

  return null;
}

/**
 * Unicode vulgar fractions understood by {@link parseAmount} (and produced by
 * {@link formatAmount}), so the two round-trip.
 */
export const VULGAR_FRACTIONS: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅐": 1 / 7,
  "⅑": 1 / 9,
  "⅒": 1 / 10,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
  "↉": 0,
};

const VULGAR_FRACTION_CHARS = Object.keys(VULGAR_FRACTIONS).join("");

// "1½", "1 ½", "½" (with an optional sign), possibly followed by a unit
const VULGAR_AMOUNT_PATTERN = new RegExp(
  `^(-)?\\s*(\\d+(?:\\.\\d+)?)?\\s*([${VULGAR_FRACTION_CHARS}])`
);

/**
 * Parse a numeric amount string, including fractions
 */
export function parseAmount(input: string): number | null {
  // Guard against non-string input (the value often comes from untyped data)
  if (typeof input !== "string") return null;
  if (!input) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Normalize the unicode fraction slash so "1⁄2" behaves like "1/2"
  const normalized = trimmed.replace(/⁄/g, "/");

  // Handle unicode vulgar fractions, including mixed forms like "1½" / "1 ½"
  const vulgarMatch = normalized.match(VULGAR_AMOUNT_PATTERN);
  if (vulgarMatch) {
    const sign = vulgarMatch[1] === "-" ? -1 : 1;
    const whole = vulgarMatch[2] ? parseFloat(vulgarMatch[2]) : 0;
    const fraction = VULGAR_FRACTIONS[vulgarMatch[3]];
    return sign * (whole + fraction);
  }

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = normalized.match(/^(-?\d+)\s+(\d+)\/(\d+)\b/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator === 0) return null;
    const magnitude = Math.abs(whole) + numerator / denominator;
    return whole < 0 ? -magnitude : magnitude;
  }

  // Handle simple fractions like "1/2"
  const fractionMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\b/);
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1]);
    const denominator = parseFloat(fractionMatch[2]);
    if (!denominator) return null;
    return numerator / denominator;
  }

  // Handle decimal numbers
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

// Fractions used for display, ordered by value. The less common glyphs are only
// used for small amounts — "473⅙ ml" reads worse than "473.2 ml".
const DISPLAY_FRACTIONS: { value: number; symbol: string; maxWhole?: number }[] = [
  { value: 1 / 8, symbol: "⅛" },
  { value: 1 / 6, symbol: "⅙", maxWhole: 10 },
  { value: 1 / 5, symbol: "⅕", maxWhole: 10 },
  { value: 1 / 4, symbol: "¼" },
  { value: 1 / 3, symbol: "⅓" },
  { value: 3 / 8, symbol: "⅜" },
  { value: 1 / 2, symbol: "½" },
  { value: 5 / 8, symbol: "⅝" },
  { value: 2 / 3, symbol: "⅔" },
  { value: 3 / 4, symbol: "¾" },
  { value: 7 / 8, symbol: "⅞" },
];

// Below this value a fraction glyph is no longer meaningful, so a decimal with
// enough significant digits is used instead (never "0").
const SMALLEST_FRACTION_DISPLAY = 0.1;

/**
 * Format a very small (but non-zero) magnitude without collapsing it to "0"
 */
function formatSmallMagnitude(value: number): string {
  const precise = value.toPrecision(2);
  // Avoid exponential notation for tiny values
  const fixed = precise.includes("e")
    ? value.toFixed(Math.min(20, Math.max(2, Math.ceil(-Math.log10(value)) + 1)))
    : precise;
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/**
 * Format a number for display, using fractions for common values
 */
export function formatAmount(amount: number): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "0";
  if (amount === 0) return "0";

  const sign = amount < 0 ? "-" : "";
  const magnitude = Math.abs(amount);

  // Round to avoid floating point issues
  const rounded = Math.round(magnitude * 1000) / 1000;

  // Small but non-zero amounts must never render as "0"
  if (rounded < SMALLEST_FRACTION_DISPLAY) {
    return `${sign}${formatSmallMagnitude(magnitude)}`;
  }

  const whole = Math.floor(rounded);
  const decimal = rounded - whole;

  // Check if decimal matches a common fraction
  for (const { value, symbol, maxWhole } of DISPLAY_FRACTIONS) {
    if (maxWhole !== undefined && whole >= maxWhole) continue;
    if (Math.abs(decimal - value) < 0.02) {
      if (whole === 0) {
        return `${sign}${symbol}`;
      }
      return `${sign}${whole}${symbol}`;
    }
  }

  // Decimal part rounds up to the next whole number
  if (decimal > 0.98) {
    return `${sign}${whole + 1}`;
  }

  // Otherwise format as decimal
  if (rounded === whole) {
    return `${sign}${whole}`;
  }

  // Round to 1 decimal place for cleaner display
  const oneDecimal = rounded.toFixed(1).replace(/\.0$/, "");
  return `${sign}${oneDecimal}`;
}

/**
 * Select the best target unit for display
 */
function selectBestUnit(
  baseAmount: number,
  category: UnitCategory,
  targetSystem: UnitSystem
): UnitDefinition | null {
  const preferredUnits = PREFERRED_UNITS[category]?.[targetSystem] ?? [];

  // Keep only units we actually have definitions for (e.g. temperature has
  // none), smallest first.
  const candidates = preferredUnits
    .map((key) => ({ key, unit: UNITS[key] }))
    .filter((entry): entry is { key: string; unit: UnitDefinition } =>
      Boolean(entry.unit)
    )
    .sort((a, b) => a.unit.baseMultiplier - b.unit.baseMultiplier);

  if (candidates.length === 0) return null;

  const magnitude = Math.abs(baseAmount);

  // Pick the largest unit that still yields a natural-looking magnitude,
  // falling back to the smallest unit for very small amounts.
  let best = candidates[0].unit;
  for (const { key, unit } of candidates) {
    const converted = magnitude / unit.baseMultiplier;
    const minimum = MIN_NATURAL_AMOUNT[key] ?? 1;
    if (converted >= minimum - 1e-9) {
      best = unit;
    }
  }

  return best;
}

/**
 * Convert a unit from one system to another
 */
/**
 * Format a metric cooking quantity.
 *
 * Metric measures are decimal by convention - nobody writes "44⅜ ml" - so the
 * vulgar-fraction formatting used for cups and spoons must not be applied
 * here. Larger quantities also carry false precision straight from the
 * conversion factor (453.59237 g for a pound), so they round to whole units.
 */
export function formatMetricAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "0";

  const sign = amount < 0 ? "-" : "";
  const value = Math.abs(amount);

  if (value === 0) return "0";
  // At and above 10 a fraction of a ml/g is noise, not information.
  if (value >= 10) return sign + String(Math.round(value));
  if (value >= 1) return sign + String(Math.round(value * 10) / 10);
  // Keep small quantities meaningful rather than rounding them away.
  return sign + String(Number(value.toPrecision(2)));
}

export function convertUnit(
  amountStr: string,
  fromUnit: string,
  toSystem: UnitSystem
): ConversionResult {
  const amount = parseAmount(amountStr);
  const unitDef = normalizeUnit(fromUnit);

  // If we can't parse the amount or unit, return original
  if (amount === null || !unitDef) {
    return {
      amount: amount ?? 0,
      unit: fromUnit,
      displayAmount: amountStr,
      originalAmount: amountStr,
      originalUnit: fromUnit,
      wasConverted: false,
    };
  }

  // If already in target system, return original
  if (unitDef.system === toSystem) {
    return {
      amount,
      unit: unitDef.symbol,
      displayAmount:
        unitDef.system === "metric"
          ? formatMetricAmount(amount)
          : formatAmount(amount),
      originalAmount: amountStr,
      originalUnit: fromUnit,
      wasConverted: false,
    };
  }

  // Convert to base unit (ml or g)
  const baseAmount = amount * unitDef.baseMultiplier;

  // Find best target unit
  const targetUnit = selectBestUnit(baseAmount, unitDef.category, toSystem);

  // No display unit available for this category (e.g. temperature) — leave as is
  if (!targetUnit) {
    return {
      amount,
      unit: unitDef.symbol,
      displayAmount: formatAmount(amount),
      originalAmount: amountStr,
      originalUnit: fromUnit,
      wasConverted: false,
    };
  }

  const convertedAmount = baseAmount / targetUnit.baseMultiplier;

  return {
    amount: convertedAmount,
    unit: targetUnit.symbol,
    displayAmount:
      targetUnit.system === "metric"
        ? formatMetricAmount(convertedAmount)
        : formatAmount(convertedAmount),
    originalAmount: amountStr,
    originalUnit: fromUnit,
    wasConverted: true,
  };
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(f: number): number {
  return Math.round((f - 32) * (5 / 9));
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(c: number): number {
  return Math.round(c * (9 / 5) + 32);
}

// Words that, when they immediately precede a number, signal that the number is
// a temperature rather than a quantity ("bake at 180 C").
const TEMPERATURE_CONTEXT_WORDS = new Set([
  "at",
  "to",
  "about",
  "around",
  "approximately",
  "roughly",
  "over",
  "under",
  "above",
  "below",
  "between",
  "and",
  "or",
  "of",
  "until",
  "oven",
  "ovens",
  "bake",
  "bakes",
  "baked",
  "baking",
  "preheat",
  "preheats",
  "preheated",
  "preheating",
  "heat",
  "heats",
  "heated",
  "heating",
  "reheat",
  "reheated",
  "roast",
  "roasts",
  "roasted",
  "roasting",
  "cook",
  "cooks",
  "cooked",
  "cooking",
  "grill",
  "grilled",
  "grilling",
  "broil",
  "broiled",
  "broiling",
  "fry",
  "deep",
  "temperature",
  "temperatures",
  "temp",
  "reach",
  "reaches",
  "reached",
  "reaching",
  "register",
  "registers",
  "internal",
  "setting",
  "set",
  "is",
  "hits",
]);

// Number, an optional degree sign / "degrees" filler, then the scale marker.
// The filler is captured so we can tell "180°C" / "180 degrees C" (explicit)
// from a bare "2 c" (ambiguous: "c" is also the abbreviation for cup).
const TEMPERATURE_PATTERN =
  /(-?\d+(?:\.\d+)?)((?:\s*°)?\s*(?:degrees?|deg\.?)?\s*)(celsius|centigrade|fahrenheit|c|f)\b/gi;

// Plausible magnitudes. The strict range is used when the scale marker is a
// bare letter and we are relying on context, so quantities are never rewritten.
const TEMPERATURE_RANGES = {
  celsius: { wide: [-80, 600], strict: [40, 400] },
  fahrenheit: { wide: [-110, 1200], strict: [100, 800] },
} as const;

function precedingWord(text: string, index: number): string {
  const before = text.slice(0, index);
  // Skip over any intervening digits/punctuation so the first half of a range
  // ("bake at 180-200 C") still sees the "at".
  const match = before.match(/([A-Za-z]+)[^A-Za-z]*$/);
  return match ? match[1].toLowerCase() : "";
}

function inRange(value: number, range: readonly [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

/**
 * Convert temperature values in text (for recipe instructions)
 */
export function convertTemperatureInText(
  text: string,
  toSystem: UnitSystem
): string {
  if (typeof text !== "string" || !text) return text;

  const wantScale = toSystem === "metric" ? "fahrenheit" : "celsius";

  return text.replace(
    TEMPERATURE_PATTERN,
    (match: string, numberPart: string, filler: string, marker: string, offset: number) => {
      const lowerMarker = marker.toLowerCase();
      const scale =
        lowerMarker === "f" || lowerMarker === "fahrenheit"
          ? "fahrenheit"
          : "celsius";

      if (scale !== wantScale) return match;

      // A leading "-" that follows a digit is a range separator ("180-200 C"),
      // not a negative sign. Keep it and convert the number after it.
      let numberText = numberPart;
      let prefix = "";
      const charBefore = offset > 0 ? text[offset - 1] : "";
      if (numberText.startsWith("-") && /[\d.,]/.test(charBefore)) {
        prefix = "-";
        numberText = numberText.slice(1);
      }

      const value = parseFloat(numberText);
      if (!Number.isFinite(value)) return match;

      const gap = filler ?? "";
      const hasDegreeSign = gap.includes("°");
      const hasDegreesWord = /deg/i.test(gap);
      const isSpelledOut = lowerMarker.length > 1;
      const isAttached = gap.length === 0; // "350F"
      const hasContext = TEMPERATURE_CONTEXT_WORDS.has(
        precedingWord(text, offset)
      );

      const ranges = TEMPERATURE_RANGES[scale];
      const explicit = hasDegreeSign || hasDegreesWord || isSpelledOut;

      const accepted = explicit
        ? inRange(value, ranges.wide)
        : (isAttached || hasContext) && inRange(value, ranges.strict);

      // Anything else is a quantity (e.g. "2 c flour") — leave it untouched.
      if (!accepted) return match;

      if (scale === "fahrenheit") {
        const f = Math.round(value);
        return `${prefix}${fahrenheitToCelsius(f)}°C (${f}°F)`;
      }

      const c = Math.round(value);
      return `${prefix}${celsiusToFahrenheit(c)}°F (${c}°C)`;
    }
  );
}

/**
 * Get the display name for a unit system
 */
export function getSystemDisplayName(system: UnitSystem): string {
  return system === "metric" ? "Metric" : "Imperial";
}

/**
 * Check if a unit string is recognized
 */
export function isRecognizedUnit(unit: string): boolean {
  return normalizeUnit(unit) !== null;
}

/**
 * Get all supported units for a category and system
 */
export function getUnitsForSystem(
  category: UnitCategory,
  system: UnitSystem
): UnitDefinition[] {
  return Object.values(UNITS).filter(
    (unit) => unit.category === category && unit.system === system
  );
}
