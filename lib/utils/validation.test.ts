import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  ingredientSchema,
  instructionSchema,
  loginSchema,
  MAX_INGREDIENT_TEXT,
  MAX_INGREDIENTS,
  MAX_INSTRUCTION_TEXT,
  MAX_INSTRUCTIONS,
  MAX_TAGS,
  nutritionSchema,
  recipeSchema,
  recipeUpdateSchema,
  registerSchema,
  resetPasswordSchema,
} from "./validation";

const TAG_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const ingredient = (i = 0) => ({ id: `ing-${i}`, text: "flour", amount: "200", unit: "g" });
const instruction = (i = 0) => ({ id: `step-${i}`, step: i + 1, text: "Mix everything." });

const validRecipe = () => ({
  title: "Pancakes",
  ingredients: [ingredient()],
  instructions: [instruction()],
});

const issuesOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.error?.issues ?? [];

describe("recipeSchema (create)", () => {
  it("accepts a minimal recipe", () => {
    expect(recipeSchema.safeParse(validRecipe()).success).toBe(true);
  });

  it("makes a new recipe private when is_public is omitted", () => {
    const parsed = recipeSchema.parse(validRecipe());
    expect(parsed.is_public).toBe(false);
  });

  it("keeps an explicit is_public", () => {
    expect(recipeSchema.parse({ ...validRecipe(), is_public: true }).is_public).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = recipeSchema.safeParse({
      ...validRecipe(),
      description: "Fluffy",
      prep_time_minutes: 10,
      cook_time_minutes: 0,
      servings: 4,
      difficulty: "easy",
      image_url: "https://example.com/p.jpg",
      nutrition: {
        calories: 300,
        protein: null,
        carbs: 40,
        fat: 10,
        fiber: 2,
        sugar: 5,
        confidence: "high",
      },
      tag_ids: [TAG_ID],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for nullable optional fields and an empty image url", () => {
    const result = recipeSchema.safeParse({
      ...validRecipe(),
      prep_time_minutes: null,
      cook_time_minutes: null,
      servings: null,
      difficulty: null,
      nutrition: null,
      image_url: "",
    });
    expect(result.success).toBe(true);
  });

  it("strips unknown keys", () => {
    const parsed = recipeSchema.parse({ ...validRecipe(), user_id: "someone-else" });
    expect(parsed).not.toHaveProperty("user_id");
  });

  describe("required fields", () => {
    it("requires a non-empty title", () => {
      expect(recipeSchema.safeParse({ ...validRecipe(), title: "" }).success).toBe(false);
      const withoutTitle: Partial<ReturnType<typeof validRecipe>> = validRecipe();
      delete withoutTitle.title;
      expect(recipeSchema.safeParse(withoutTitle).success).toBe(false);
    });

    it("requires at least one ingredient and one instruction", () => {
      const noIngredients = recipeSchema.safeParse({ ...validRecipe(), ingredients: [] });
      expect(issuesOf(noIngredients).map((i) => i.message)).toContain("At least one ingredient is required");
      const noSteps = recipeSchema.safeParse({ ...validRecipe(), instructions: [] });
      expect(issuesOf(noSteps).map((i) => i.message)).toContain("At least one instruction is required");
    });
  });

  describe("caps", () => {
    it("caps the title at 200 characters", () => {
      expect(recipeSchema.safeParse({ ...validRecipe(), title: "a".repeat(200) }).success).toBe(true);
      expect(recipeSchema.safeParse({ ...validRecipe(), title: "a".repeat(201) }).success).toBe(false);
    });

    it("caps the description at 1000 characters", () => {
      expect(recipeSchema.safeParse({ ...validRecipe(), description: "a".repeat(1000) }).success).toBe(true);
      expect(recipeSchema.safeParse({ ...validRecipe(), description: "a".repeat(1001) }).success).toBe(false);
    });

    it(`caps ingredient text at ${MAX_INGREDIENT_TEXT} characters`, () => {
      const ok = { ...ingredient(), text: "a".repeat(MAX_INGREDIENT_TEXT) };
      const tooLong = { ...ingredient(), text: "a".repeat(MAX_INGREDIENT_TEXT + 1) };
      expect(recipeSchema.safeParse({ ...validRecipe(), ingredients: [ok] }).success).toBe(true);
      const result = recipeSchema.safeParse({ ...validRecipe(), ingredients: [tooLong] });
      expect(issuesOf(result)[0]).toMatchObject({
        path: ["ingredients", 0, "text"],
        message: "Ingredient text is too long",
      });
    });

    it("caps ingredient amount and unit at 50 characters", () => {
      expect(ingredientSchema.safeParse({ ...ingredient(), amount: "1".repeat(50), unit: "u".repeat(50) }).success).toBe(true);
      expect(ingredientSchema.safeParse({ ...ingredient(), amount: "1".repeat(51) }).success).toBe(false);
      expect(ingredientSchema.safeParse({ ...ingredient(), unit: "u".repeat(51) }).success).toBe(false);
    });

    it(`caps a recipe at ${MAX_INGREDIENTS} ingredients`, () => {
      const many = (n: number) => Array.from({ length: n }, (_, i) => ingredient(i));
      expect(recipeSchema.safeParse({ ...validRecipe(), ingredients: many(MAX_INGREDIENTS) }).success).toBe(true);
      expect(recipeSchema.safeParse({ ...validRecipe(), ingredients: many(MAX_INGREDIENTS + 1) }).success).toBe(false);
    });

    it(`caps a recipe at ${MAX_INSTRUCTIONS} steps`, () => {
      const many = (n: number) => Array.from({ length: n }, (_, i) => instruction(i));
      expect(recipeSchema.safeParse({ ...validRecipe(), instructions: many(MAX_INSTRUCTIONS) }).success).toBe(true);
      expect(recipeSchema.safeParse({ ...validRecipe(), instructions: many(MAX_INSTRUCTIONS + 1) }).success).toBe(false);
    });

    it(`caps instruction text at ${MAX_INSTRUCTION_TEXT} characters`, () => {
      expect(instructionSchema.safeParse({ ...instruction(), text: "a".repeat(MAX_INSTRUCTION_TEXT) }).success).toBe(true);
      expect(instructionSchema.safeParse({ ...instruction(), text: "a".repeat(MAX_INSTRUCTION_TEXT + 1) }).success).toBe(false);
    });

    it(`caps a recipe at ${MAX_TAGS} tags`, () => {
      const tags = (n: number) => Array.from({ length: n }, () => TAG_ID);
      expect(recipeSchema.safeParse({ ...validRecipe(), tag_ids: tags(MAX_TAGS) }).success).toBe(true);
      expect(recipeSchema.safeParse({ ...validRecipe(), tag_ids: tags(MAX_TAGS + 1) }).success).toBe(false);
    });
  });

  describe("field rules", () => {
    it.each([
      ["servings of 0", { servings: 0 }],
      ["fractional servings", { servings: 2.5 }],
      ["negative prep time", { prep_time_minutes: -1 }],
      ["fractional cook time", { cook_time_minutes: 1.5 }],
      ["an unknown difficulty", { difficulty: "extreme" }],
      ["an invalid image url", { image_url: "not-a-url" }],
      ["a non-uuid tag id", { tag_ids: ["tag-1"] }],
      ["a non-boolean is_public", { is_public: "yes" }],
    ])("rejects %s", (_label, override) => {
      expect(recipeSchema.safeParse({ ...validRecipe(), ...override }).success).toBe(false);
    });

    it("rejects an instruction step that is not a positive integer", () => {
      expect(instructionSchema.safeParse({ ...instruction(), step: 0 }).success).toBe(false);
      expect(instructionSchema.safeParse({ ...instruction(), step: 1.5 }).success).toBe(false);
    });

    it("rejects an ingredient without text", () => {
      expect(ingredientSchema.safeParse({ ...ingredient(), text: "" }).success).toBe(false);
    });
  });
});

describe("nutritionSchema", () => {
  const nutrition = {
    calories: 100,
    protein: 1,
    carbs: 2,
    fat: 3,
    fiber: null,
    sugar: 0,
    confidence: "low",
  };

  it("accepts non-negative values and nulls", () => {
    expect(nutritionSchema.safeParse(nutrition).success).toBe(true);
    expect(nutritionSchema.safeParse({ ...nutrition, warnings: ["guess"] }).success).toBe(true);
  });

  it("rejects negative values and unknown confidence", () => {
    expect(nutritionSchema.safeParse({ ...nutrition, calories: -1 }).success).toBe(false);
    expect(nutritionSchema.safeParse({ ...nutrition, confidence: "certain" }).success).toBe(false);
  });
});

describe("recipeUpdateSchema", () => {
  it("does not add is_public to a partial update, so it cannot unpublish", () => {
    const parsed = recipeUpdateSchema.parse({ title: "New title" });
    expect(parsed).toEqual({ title: "New title" });
    expect(parsed).not.toHaveProperty("is_public");
  });

  it("keeps is_public when it is sent", () => {
    expect(recipeUpdateSchema.parse({ is_public: false })).toEqual({ is_public: false });
    expect(recipeUpdateSchema.parse({ is_public: true })).toEqual({ is_public: true });
  });

  it("accepts any single field on its own", () => {
    expect(recipeUpdateSchema.safeParse({ servings: 2 }).success).toBe(true);
    expect(recipeUpdateSchema.safeParse({ tag_ids: [] }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = recipeUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(issuesOf(result).map((i) => i.message)).toContain("No fields to update");
  });

  it("rejects a body with only unknown keys", () => {
    expect(recipeUpdateSchema.safeParse({ user_id: "x" }).success).toBe(false);
  });

  it("still enforces the field rules and caps", () => {
    expect(recipeUpdateSchema.safeParse({ title: "" }).success).toBe(false);
    expect(recipeUpdateSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
    expect(recipeUpdateSchema.safeParse({ ingredients: [] }).success).toBe(false);
    expect(
      recipeUpdateSchema.safeParse({
        tag_ids: Array.from({ length: MAX_TAGS + 1 }, () => TAG_ID),
      }).success
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid email and 8-character password", () => {
    expect(loginSchema.safeParse({ email: "cook@example.com", password: "12345678" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "cook", password: "12345678" });
    expect(issuesOf(result)[0]).toMatchObject({ path: ["email"], message: "Please enter a valid email address" });
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = loginSchema.safeParse({ email: "cook@example.com", password: "1234567" });
    expect(issuesOf(result)[0]).toMatchObject({ path: ["password"] });
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Jo",
    email: "jo@example.com",
    password: "Secret123",
    confirmPassword: "Secret123",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name of at least 2 characters", () => {
    expect(registerSchema.safeParse({ ...valid, name: "J" }).success).toBe(false);
  });

  it.each([
    ["too short", "Sec12"],
    ["without a lowercase letter", "SECRET123"],
    ["without an uppercase letter", "secret123"],
    ["without a number", "SecretSecret"],
  ])("rejects a password %s", (_label, password) => {
    expect(registerSchema.safeParse({ ...valid, password, confirmPassword: password }).success).toBe(false);
  });

  it("reports mismatched passwords on confirmPassword", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "Secret124" });
    expect(issuesOf(result)).toEqual([
      expect.objectContaining({ path: ["confirmPassword"], message: "Passwords don't match" }),
    ]);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "jo@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a strong matching password", () => {
    expect(resetPasswordSchema.safeParse({ password: "Secret123", confirmPassword: "Secret123" }).success).toBe(true);
  });

  it("applies the same strength rules as registration", () => {
    expect(resetPasswordSchema.safeParse({ password: "secret123", confirmPassword: "secret123" }).success).toBe(false);
  });

  it("reports mismatched passwords on confirmPassword", () => {
    const result = resetPasswordSchema.safeParse({ password: "Secret123", confirmPassword: "Other123" });
    expect(issuesOf(result)[0]).toMatchObject({ path: ["confirmPassword"], message: "Passwords don't match" });
  });
});
