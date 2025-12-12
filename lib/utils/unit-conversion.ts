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

// Preferred units for display in each system
const PREFERRED_UNITS: Record<UnitCategory, Record<UnitSystem, string[]>> = {
  volume: {
    imperial: ["cup", "tbsp", "tsp", "fl oz", "quart", "gallon"],
    metric: ["ml", "l"],
  },
  weight: {
    imperial: ["lb", "oz"],
    metric: ["g", "kg"],
  },
  temperature: {
    imperial: ["F"],
    metric: ["C"],
  },
};

// Build alias lookup map for fast matching
const ALIAS_MAP: Map<string, UnitDefinition> = new Map();
Object.values(UNITS).forEach((unit) => {
  unit.aliases.forEach((alias) => {
    ALIAS_MAP.set(alias.toLowerCase(), unit);
  });
});

/**
 * Normalize a unit string to its definition
 */
export function normalizeUnit(input: string): UnitDefinition | null {
  if (!input) return null;

  const normalized = input.trim().toLowerCase();

  // Direct match
  if (ALIAS_MAP.has(normalized)) {
    return ALIAS_MAP.get(normalized)!;
  }

  // Try without trailing 's' for plurals
  if (normalized.endsWith("s") && ALIAS_MAP.has(normalized.slice(0, -1))) {
    return ALIAS_MAP.get(normalized.slice(0, -1))!;
  }

  return null;
}

/**
 * Parse a numeric amount string, including fractions
 */
export function parseAmount(input: string): number | null {
  if (!input) return null;

  const trimmed = input.trim();

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    return whole + numerator / denominator;
  }

  // Handle simple fractions like "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    return numerator / denominator;
  }

  // Handle decimal numbers
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

/**
 * Format a number for display, using fractions for common values
 */
export function formatAmount(amount: number): string {
  // Round to avoid floating point issues
  const rounded = Math.round(amount * 1000) / 1000;

  // Common fractions
  const fractions: [number, string][] = [
    [0.125, "⅛"],
    [0.25, "¼"],
    [0.333, "⅓"],
    [0.375, "⅜"],
    [0.5, "½"],
    [0.625, "⅝"],
    [0.666, "⅔"],
    [0.75, "¾"],
    [0.875, "⅞"],
  ];

  const whole = Math.floor(rounded);
  const decimal = rounded - whole;

  // Check if decimal matches a common fraction
  for (const [value, symbol] of fractions) {
    if (Math.abs(decimal - value) < 0.02) {
      if (whole === 0) {
        return symbol;
      }
      return `${whole}${symbol}`;
    }
  }

  // Otherwise format as decimal
  if (rounded === Math.floor(rounded)) {
    return rounded.toString();
  }

  // Round to 1 decimal place for cleaner display
  return rounded.toFixed(1).replace(/\.0$/, "");
}

/**
 * Select the best target unit for display
 */
function selectBestUnit(
  baseAmount: number,
  category: UnitCategory,
  targetSystem: UnitSystem
): UnitDefinition {
  const preferredUnits = PREFERRED_UNITS[category][targetSystem];

  // Find the unit that gives a reasonable display value (between 0.1 and 1000)
  for (const unitKey of preferredUnits) {
    const unit = UNITS[unitKey];
    if (unit) {
      const converted = baseAmount / unit.baseMultiplier;
      if (converted >= 0.1 && converted <= 1000) {
        return unit;
      }
    }
  }

  // Fallback to first preferred unit
  return UNITS[preferredUnits[0]];
}

/**
 * Convert a unit from one system to another
 */
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
      displayAmount: formatAmount(amount),
      originalAmount: amountStr,
      originalUnit: fromUnit,
      wasConverted: false,
    };
  }

  // Convert to base unit (ml or g)
  const baseAmount = amount * unitDef.baseMultiplier;

  // Find best target unit
  const targetUnit = selectBestUnit(baseAmount, unitDef.category, toSystem);
  const convertedAmount = baseAmount / targetUnit.baseMultiplier;

  return {
    amount: convertedAmount,
    unit: targetUnit.symbol,
    displayAmount: formatAmount(convertedAmount),
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

/**
 * Convert temperature values in text (for recipe instructions)
 */
export function convertTemperatureInText(
  text: string,
  toSystem: UnitSystem
): string {
  if (!text) return text;

  // Pattern for Fahrenheit: 350F, 350°F, 350 F, 350 degrees F, 350 degrees fahrenheit
  const fahrenheitPattern = /(\d+)\s*°?\s*(?:degrees?\s*)?(?:F|fahrenheit)\b/gi;

  // Pattern for Celsius: 180C, 180°C, 180 C, 180 degrees C, 180 degrees celsius
  const celsiusPattern = /(\d+)\s*°?\s*(?:degrees?\s*)?(?:C|celsius)\b/gi;

  let result = text;

  if (toSystem === "metric") {
    // Convert F to C
    result = result.replace(fahrenheitPattern, (match, temp) => {
      const f = parseInt(temp, 10);
      const c = fahrenheitToCelsius(f);
      return `${c}°C (${f}°F)`;
    });
  } else {
    // Convert C to F
    result = result.replace(celsiusPattern, (match, temp) => {
      const c = parseInt(temp, 10);
      const f = celsiusToFahrenheit(c);
      return `${f}°F (${c}°C)`;
    });
  }

  return result;
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
