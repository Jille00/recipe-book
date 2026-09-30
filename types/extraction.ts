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
  /**
   * Photo of the dish. Only ever one of our own storage URLs: an imported
   * page's photo is re-hosted by the server before it is returned.
   */
  imageUrl?: string;
}

export interface ExtractionResponse {
  recipe: ExtractedRecipe;
  confidence: "high" | "medium" | "low";
  warnings?: string[];
}
