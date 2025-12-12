import type { NutritionInfo } from "./nutrition";

export interface Ingredient {
  id: string;
  text: string;
  amount?: string;
  unit?: string;
}

export interface Instruction {
  id: string;
  step: number;
  text: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  imageUrl: string | null;
  nutrition: NutritionInfo | null;
  isPublic: boolean | null;
  shareToken: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RecipeWithDetails extends Recipe {
  authorName?: string | null;
  tags?: string[];
  isFavorited?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | null;
}

export interface Favorite {
  id: string;
  userId: string;
  recipeId: string;
  createdAt: Date | null;
}

export interface CreateRecipeInput {
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty?: Difficulty;
  imageUrl?: string;
  nutrition?: NutritionInfo | null;
  isPublic?: boolean;
  tagIds?: string[];
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string;
}
