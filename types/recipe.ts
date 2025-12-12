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
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  image_url: string | null;
  is_public: boolean;
  share_token: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeWithDetails extends Recipe {
  category_name?: string;
  category_slug?: string;
  author_name?: string;
  tags?: string[];
  is_favorited?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export interface CreateRecipeInput {
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  difficulty?: Difficulty;
  image_url?: string;
  is_public?: boolean;
  category_id?: string;
  tag_ids?: string[];
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string;
}
