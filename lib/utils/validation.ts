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

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Upper bounds so a single recipe cannot be used to store unbounded data.
export const MAX_INGREDIENT_TEXT = 500;
export const MAX_INSTRUCTION_TEXT = 2000;
export const MAX_INGREDIENTS = 100;
export const MAX_INSTRUCTIONS = 100;
export const MAX_TAGS = 20;

export const ingredientSchema = z.object({
  id: z.string(),
  text: z
    .string()
    .min(1, "Ingredient text is required")
    .max(MAX_INGREDIENT_TEXT, "Ingredient text is too long"),
  amount: z.string().max(50, "Ingredient amount is too long").optional(),
  unit: z.string().max(50, "Ingredient unit is too long").optional(),
});

export const instructionSchema = z.object({
  id: z.string(),
  step: z.number().int().positive(),
  text: z
    .string()
    .min(1, "Instruction text is required")
    .max(MAX_INSTRUCTION_TEXT, "Instruction text is too long"),
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

// Field definitions shared by the create and update schemas. Note that no
// field carries a `.default()` here: a default would materialise the key on
// parse, and a partial update would then overwrite a column the caller never
// sent (e.g. silently unpublishing a recipe on a PUT without `is_public`).
const recipeFields = {
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  ingredients: z
    .array(ingredientSchema)
    .min(1, "At least one ingredient is required")
    .max(MAX_INGREDIENTS, `A recipe can have at most ${MAX_INGREDIENTS} ingredients`),
  instructions: z
    .array(instructionSchema)
    .min(1, "At least one instruction is required")
    .max(MAX_INSTRUCTIONS, `A recipe can have at most ${MAX_INSTRUCTIONS} steps`),
  prep_time_minutes: z.number().int().nonnegative().optional().nullable(),
  cook_time_minutes: z.number().int().nonnegative().optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  nutrition: nutritionSchema.optional().nullable(),
  is_public: z.boolean().optional(),
  tag_ids: z
    .array(z.string().uuid())
    .max(MAX_TAGS, `A recipe can have at most ${MAX_TAGS} tags`)
    .optional(),
};

export const recipeSchema = z.object({
  ...recipeFields,
  // Creating a recipe defaults to private.
  is_public: z.boolean().default(false),
});

/**
 * Schema for partial updates (PUT/PATCH). Every field is optional and nothing
 * is defaulted, so only the keys the caller actually sent are written.
 */
export const recipeUpdateSchema = z
  .object(recipeFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RecipeInput = z.infer<typeof recipeSchema>;
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;
