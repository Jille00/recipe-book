export interface ExtractedIngredient {
  text: string;
  amount?: string;
  unit?: string;
}

export interface ExtractedInstruction {
  step: number;
  text: string;
}

export interface ExtractedRecipe {
  title: string;
  description?: string;
  ingredients: ExtractedIngredient[];
  instructions: ExtractedInstruction[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
  suggestedCategory?: string;
}

export interface ExtractionResponse {
  recipe: ExtractedRecipe;
  confidence: "high" | "medium" | "low";
  warnings?: string[];
}
