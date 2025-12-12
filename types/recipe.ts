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
  isPublic: boolean | null;
  shareToken: string | null;
  categoryId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RecipeWithDetails extends Recipe {
  categoryName?: string | null;
  categorySlug?: string | null;
  authorName?: string | null;
  tags?: string[];
  isFavorited?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date | null;
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
  isPublic?: boolean;
  categoryId?: string;
  tagIds?: string[];
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string;
}
