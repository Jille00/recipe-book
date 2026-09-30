export interface NutritionInfo {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  confidence: "high" | "medium" | "low";
  warnings?: string[];
  /**
   * Fingerprint (`nutritionBasisKey`) of the ingredients and servings these
   * values were calculated or reviewed for. Lets the editor tell, after a
   * save, that the numbers no longer match the recipe. Absent on nutrition
   * saved before it existed.
   */
  basisKey?: string;
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
