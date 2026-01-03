import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ingredientSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Ingredient text is required"),
  amount: z.string().optional(),
  unit: z.string().optional(),
});

export const instructionSchema = z.object({
  id: z.string(),
  step: z.number().int().positive(),
  text: z.string().min(1, "Instruction text is required"),
});

export const nutritionSchema = z.object({
  calories: z.number().nonnegative().nullable(),
  protein: z.number().nonnegative().nullable(),
  carbs: z.number().nonnegative().nullable(),
  fat: z.number().nonnegative().nullable(),
  fiber: z.number().nonnegative().nullable(),
  sugar: z.number().nonnegative().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string()).optional(),
});

export const recipeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
  instructions: z.array(instructionSchema).min(1, "At least one instruction is required"),
  prep_time_minutes: z.number().int().nonnegative().optional().nullable(),
  cook_time_minutes: z.number().int().nonnegative().optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  nutrition: nutritionSchema.optional().nullable(),
  is_public: z.boolean().default(false),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RecipeInput = z.infer<typeof recipeSchema>;
