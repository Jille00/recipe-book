import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  ingredientSchema,
  instructionSchema,
  nutritionSchema,
  recipeSchema,
  recipeUpdateSchema,
  MAX_INGREDIENT_TEXT,
  MAX_INSTRUCTION_TEXT,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
  MAX_TAGS,
} from "./validation";

const TAG_ID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((i) => i.message) ?? [];
}

const validRecipe = () => ({
  title: "Pancakes",
  ingredients: [{ id: "i1", text: "flour", amount: "200", unit: "g" }],
  instructions: [{ id: "s1", step: 1, text: "Mix." }],
});

describe("loginSchema", () => {
  it("accepts a valid login", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "12345678" }).success).toBe(true);
  });

  it("rejects bad emails and short passwords", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "short" });
    expect(r.success).toBe(false);
    expect(messages(r)).toEqual([
      "Please enter a valid email address",
      "Password must be at least 8 characters",
    ]);
  });

  it("strips unknown fields", () => {
    const r = loginSchema.parse({ email: "a@example.com", password: "12345678", admin: true });
    expect(r).toEqual({ email: "a@example.com", password: "12345678" });
  });
});

describe("registerSchema", () => {
  const base = { name: "Jo", email: "jo@example.com", password: "Passw0rd", confirmPassword: "Passw0rd" };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ["password", "PASSWORD1", "Password must contain a lowercase letter"],
    ["password", "password1", "Password must contain an uppercase letter"],
    ["password", "Password", "Password must contain a number"],
    ["password", "Pa1", "Password must be at least 8 characters"],
    ["name", "J", "Name must be at least 2 characters"],
    ["email", "jo@", "Please enter a valid email address"],
  ])("rejects %s=%j with %j", (field, value, message) => {
    const input = { ...base, [field]: value, confirmPassword: field === "password" ? value : base.confirmPassword };
    const r = registerSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(messages(r)).toContain(message);
  });

  it("rejects mismatched passwords on the confirmPassword path", () => {
    const r = registerSchema.safeParse({ ...base, confirmPassword: "Different1" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ message: "Passwords don't match", path: ["confirmPassword"] });
  });
});

describe("forgotPasswordSchema / resetPasswordSchema", () => {
  it("validates the email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("applies the password rules and the match check", () => {
    expect(resetPasswordSchema.safeParse({ password: "Passw0rd", confirmPassword: "Passw0rd" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "passw0rd", confirmPassword: "passw0rd" }).success).toBe(false);
    const r = resetPasswordSchema.safeParse({ password: "Passw0rd", confirmPassword: "Passw0rD" });
    expect(r.error?.issues[0].path).toEqual(["confirmPassword"]);
  });
});

describe("ingredientSchema", () => {
  it("accepts minimal and full ingredients", () => {
    expect(ingredientSchema.safeParse({ id: "1", text: "salt" }).success).toBe(true);
    expect(ingredientSchema.safeParse({ id: "1", text: "salt", amount: "1", unit: "tsp" }).success).toBe(true);
  });

  it("enforces text bounds", () => {
    expect(ingredientSchema.safeParse({ id: "1", text: "" }).success).toBe(false);
    expect(ingredientSchema.safeParse({ id: "1", text: "x".repeat(MAX_INGREDIENT_TEXT) }).success).toBe(true);
    const r = ingredientSchema.safeParse({ id: "1", text: "x".repeat(MAX_INGREDIENT_TEXT + 1) });
    expect(messages(r)).toEqual(["Ingredient text is too long"]);
  });

  it("caps amount and unit length at 50", () => {
    expect(ingredientSchema.safeParse({ id: "1", text: "a", amount: "1".repeat(50) }).success).toBe(true);
    expect(messages(ingredientSchema.safeParse({ id: "1", text: "a", amount: "1".repeat(51) }))).toEqual([
      "Ingredient amount is too long",
    ]);
    expect(messages(ingredientSchema.safeParse({ id: "1", text: "a", unit: "u".repeat(51) }))).toEqual([
      "Ingredient unit is too long",
    ]);
  });

  it("requires an id", () => {
    expect(ingredientSchema.safeParse({ text: "salt" }).success).toBe(false);
  });
});

describe("instructionSchema", () => {
  it("requires a positive integer step", () => {
    expect(instructionSchema.safeParse({ id: "1", step: 1, text: "Go" }).success).toBe(true);
    expect(instructionSchema.safeParse({ id: "1", step: 0, text: "Go" }).success).toBe(false);
    expect(instructionSchema.safeParse({ id: "1", step: -1, text: "Go" }).success).toBe(false);
    expect(instructionSchema.safeParse({ id: "1", step: 1.5, text: "Go" }).success).toBe(false);
    expect(instructionSchema.safeParse({ id: "1", step: "1", text: "Go" }).success).toBe(false);
  });

  it("enforces text bounds", () => {
    expect(instructionSchema.safeParse({ id: "1", step: 1, text: "" }).success).toBe(false);
    expect(instructionSchema.safeParse({ id: "1", step: 1, text: "x".repeat(MAX_INSTRUCTION_TEXT) }).success).toBe(true);
    expect(instructionSchema.safeParse({ id: "1", step: 1, text: "x".repeat(MAX_INSTRUCTION_TEXT + 1) }).success).toBe(false);
  });
});

describe("nutritionSchema", () => {
  const nutrition = { calories: 100, protein: 0, carbs: null, fat: 1.5, fiber: null, sugar: 2, confidence: "high" };

  it("accepts valid nutrition with nulls", () => {
    expect(nutritionSchema.safeParse(nutrition).success).toBe(true);
    expect(nutritionSchema.safeParse({ ...nutrition, warnings: ["approx"] }).success).toBe(true);
  });

  it("rejects negatives, missing fields and unknown confidence", () => {
    expect(nutritionSchema.safeParse({ ...nutrition, calories: -1 }).success).toBe(false);
    expect(nutritionSchema.safeParse({ ...nutrition, confidence: "certain" }).success).toBe(false);
    const { calories: _omit, ...missing } = nutrition;
    void _omit;
    expect(nutritionSchema.safeParse(missing).success).toBe(false);
  });
});

describe("recipeSchema", () => {
  it("accepts a minimal recipe and defaults is_public to false", () => {
    const r = recipeSchema.parse(validRecipe());
    expect(r.is_public).toBe(false);
    expect(r.title).toBe("Pancakes");
  });

  it("keeps an explicit is_public", () => {
    expect(recipeSchema.parse({ ...validRecipe(), is_public: true }).is_public).toBe(true);
  });

  it("accepts a full recipe", () => {
    const r = recipeSchema.safeParse({
      ...validRecipe(),
      description: "Fluffy",
      prep_time_minutes: 0,
      cook_time_minutes: null,
      servings: 4,
      difficulty: "easy",
      image_url: "https://example.com/p.jpg",
      nutrition: null,
      is_public: true,
      tag_ids: [TAG_ID],
    });
    expect(r.success).toBe(true);
  });

  it("accepts an empty image_url", () => {
    expect(recipeSchema.safeParse({ ...validRecipe(), image_url: "" }).success).toBe(true);
  });

  it("strips unknown fields (e.g. user_id / id injection)", () => {
    const r = recipeSchema.parse({ ...validRecipe(), user_id: "someone-else", id: "x", code: "abc" });
    expect(r).not.toHaveProperty("user_id");
    expect(r).not.toHaveProperty("id");
    expect(r).not.toHaveProperty("code");
  });

  it("strips unknown fields inside ingredients", () => {
    const r = recipeSchema.parse({
      ...validRecipe(),
      ingredients: [{ id: "i1", text: "flour", evil: "<script>" }],
    });
    expect(r.ingredients[0]).toEqual({ id: "i1", text: "flour" });
  });

  it.each([
    ["title", ""],
    ["title", "x".repeat(201)],
    ["description", "x".repeat(1001)],
    ["ingredients", []],
    ["instructions", []],
    ["servings", 0],
    ["servings", -2],
    ["servings", 1.5],
    ["prep_time_minutes", -1],
    ["cook_time_minutes", 2.5],
    ["difficulty", "extreme"],
    ["image_url", "not a url"],
    ["tag_ids", ["not-a-uuid"]],
    ["is_public", "yes"],
  ])("rejects %s=%j", (field, value) => {
    expect(recipeSchema.safeParse({ ...validRecipe(), [field]: value }).success).toBe(false);
  });

  it("accepts boundary lengths", () => {
    expect(recipeSchema.safeParse({ ...validRecipe(), title: "x".repeat(200) }).success).toBe(true);
    expect(recipeSchema.safeParse({ ...validRecipe(), description: "x".repeat(1000) }).success).toBe(true);
  });

  it("enforces the ingredient, step and tag count limits", () => {
    const ing = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}`, text: "x" }));
    const steps = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, step: i + 1, text: "x" }));
    const tags = (n: number) => Array.from({ length: n }, () => TAG_ID);

    expect(recipeSchema.safeParse({ ...validRecipe(), ingredients: ing(MAX_INGREDIENTS) }).success).toBe(true);
    expect(messages(recipeSchema.safeParse({ ...validRecipe(), ingredients: ing(MAX_INGREDIENTS + 1) }))).toEqual([
      `A recipe can have at most ${MAX_INGREDIENTS} ingredients`,
    ]);
    expect(recipeSchema.safeParse({ ...validRecipe(), instructions: steps(MAX_INSTRUCTIONS) }).success).toBe(true);
    expect(recipeSchema.safeParse({ ...validRecipe(), instructions: steps(MAX_INSTRUCTIONS + 1) }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...validRecipe(), tag_ids: tags(MAX_TAGS) }).success).toBe(true);
    expect(recipeSchema.safeParse({ ...validRecipe(), tag_ids: tags(MAX_TAGS + 1) }).success).toBe(false);
  });

  it("requires title, ingredients and instructions", () => {
    const r = recipeSchema.safeParse({});
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["title", "ingredients", "instructions"]));
  });

  it("rejects a whitespace-only title", () => {
    expect(recipeSchema.safeParse({ ...validRecipe(), title: "   " }).success).toBe(false);
  });

  it("trims the title", () => {
    const parsed = recipeSchema.parse({ ...validRecipe(), title: "  Soup  " });
    expect(parsed.title).toBe("Soup");
  });

  it.each(["javascript:alert(1)", "data:image/png;base64,AAAA", "file:///etc/passwd"])(
    "rejects a non-http image_url %s",
    (image_url) => {
      expect(recipeSchema.safeParse({ ...validRecipe(), image_url }).success).toBe(false);
    }
  );

  it("accepts an https image_url and an empty one", () => {
    for (const image_url of ["https://x.supabase.co/storage/v1/object/public/recipe-images/a.jpg", ""]) {
      expect(recipeSchema.safeParse({ ...validRecipe(), image_url }).success).toBe(true);
    }
  });

  it("de-duplicates tag ids", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(recipeSchema.parse({ ...validRecipe(), tag_ids: [id, id] }).tag_ids).toEqual([id]);
  });

  it("rejects times that would overflow the database column", () => {
    expect(
      recipeSchema.safeParse({ ...validRecipe(), prep_time_minutes: 3_000_000_000 }).success
    ).toBe(false);
  });
});

describe("recipeUpdateSchema", () => {
  it("accepts a partial update without materialising defaults", () => {
    const r = recipeUpdateSchema.parse({ title: "New" });
    expect(r).toEqual({ title: "New" });
    expect(r).not.toHaveProperty("is_public");
  });

  it("rejects an empty update", () => {
    const r = recipeUpdateSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(messages(r)).toEqual(["No fields to update"]);
  });

  it("rejects an update containing only unknown fields (they are stripped first)", () => {
    const r = recipeUpdateSchema.safeParse({ user_id: "x" });
    expect(r.success).toBe(false);
    expect(messages(r)).toEqual(["No fields to update"]);
  });

  it("still validates the fields that are sent", () => {
    expect(recipeUpdateSchema.safeParse({ servings: 0 }).success).toBe(false);
    expect(recipeUpdateSchema.safeParse({ ingredients: [] }).success).toBe(false);
    expect(recipeUpdateSchema.safeParse({ is_public: false }).success).toBe(true);
    expect(recipeUpdateSchema.safeParse({ servings: null }).success).toBe(true);
  });
});
