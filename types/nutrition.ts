export interface NutritionInfo {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  confidence: "high" | "medium" | "low";
  warnings?: string[];
}

export interface NutritionCalculationRequest {
  ingredients: Array<{
    text: string;
    amount?: string;
    unit?: string;
  }>;
  servings: number;
}

export interface NutritionCalculationResponse {
  nutrition: NutritionInfo;
}
