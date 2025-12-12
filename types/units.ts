export type UnitSystem = "metric" | "imperial";
export type UnitCategory = "volume" | "weight" | "temperature";

export interface UnitDefinition {
  name: string;
  symbol: string;
  aliases: string[];
  category: UnitCategory;
  system: UnitSystem;
  baseMultiplier: number; // Conversion to base unit (ml for volume, g for weight)
}

export interface ConversionResult {
  amount: number;
  unit: string;
  displayAmount: string;
  originalAmount: string;
  originalUnit: string;
  wasConverted: boolean;
}

export interface UserPreferences {
  unitSystem: UnitSystem;
}
