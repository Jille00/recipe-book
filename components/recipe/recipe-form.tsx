"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Button, Input, Textarea, Select, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import type { Ingredient, Instruction, Difficulty, Category } from "@/types/recipe";

interface RecipeFormProps {
  categories: Category[];
  initialData?: {
    id?: string;
    title: string;
    description: string;
    ingredients: Ingredient[];
    instructions: Instruction[];
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    servings: number | null;
    difficulty: Difficulty | null;
    category_id: string | null;
    is_public: boolean;
  };
}

export function RecipeForm({ categories, initialData }: RecipeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients || [{ id: nanoid(), text: "", amount: "", unit: "" }]
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    initialData?.instructions || [{ id: nanoid(), step: 1, text: "" }]
  );
  const [prepTime, setPrepTime] = useState(initialData?.prep_time_minutes?.toString() || "");
  const [cookTime, setCookTime] = useState(initialData?.cook_time_minutes?.toString() || "");
  const [servings, setServings] = useState(initialData?.servings?.toString() || "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(initialData?.difficulty || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
  const [isPublic, setIsPublic] = useState(initialData?.is_public || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addIngredient = () => {
    setIngredients([...ingredients, { id: nanoid(), text: "", amount: "", unit: "" }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((i) => i.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      { id: nanoid(), step: instructions.length + 1, text: "" },
    ]);
  };

  const removeInstruction = (id: string) => {
    if (instructions.length > 1) {
      const filtered = instructions.filter((i) => i.id !== id);
      setInstructions(
        filtered.map((inst, index) => ({ ...inst, step: index + 1 }))
      );
    }
  };

  const updateInstruction = (id: string, text: string) => {
    setInstructions(
      instructions.map((i) => (i.id === id ? { ...i, text } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const filteredIngredients = ingredients.filter((i) => i.text.trim());
    const filteredInstructions = instructions.filter((i) => i.text.trim());

    if (filteredIngredients.length === 0) {
      setError("Please add at least one ingredient");
      setIsSubmitting(false);
      return;
    }

    if (filteredInstructions.length === 0) {
      setError("Please add at least one instruction");
      setIsSubmitting(false);
      return;
    }

    const recipeData = {
      title,
      description,
      ingredients: filteredIngredients,
      instructions: filteredInstructions.map((inst, index) => ({
        ...inst,
        step: index + 1,
      })),
      prep_time_minutes: prepTime ? parseInt(prepTime) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      servings: servings ? parseInt(servings) : null,
      difficulty: difficulty || null,
      category_id: categoryId || null,
      is_public: isPublic,
    };

    try {
      const url = isEditing ? `/api/recipes/${initialData.id}` : "/api/recipes";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save recipe");
      }

      const data = await response.json();
      router.push(`/recipes/${data.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyOptions = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Recipe Title"
            placeholder="e.g., Grandma's Apple Pie"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="A brief description of your recipe..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="Select a category"
            />
            <Select
              label="Difficulty"
              options={difficultyOptions}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              placeholder="Select difficulty"
            />
          </div>
        </CardContent>
      </Card>

      {/* Time & Servings */}
      <Card>
        <CardHeader>
          <CardTitle>Time & Servings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Prep Time (minutes)"
              type="number"
              min="0"
              placeholder="30"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
            <Input
              label="Cook Time (minutes)"
              type="number"
              min="0"
              placeholder="45"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
            <Input
              label="Servings"
              type="number"
              min="1"
              placeholder="4"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ingredients</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            Add Ingredient
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="flex gap-2 items-start">
              <span className="flex h-10 w-8 items-center justify-center text-sm text-neutral-500">
                {index + 1}.
              </span>
              <div className="flex-1 grid gap-2 sm:grid-cols-4">
                <Input
                  placeholder="Amount"
                  value={ingredient.amount || ""}
                  onChange={(e) => updateIngredient(ingredient.id, "amount", e.target.value)}
                  className="sm:col-span-1"
                />
                <Input
                  placeholder="Unit (cups, tbsp...)"
                  value={ingredient.unit || ""}
                  onChange={(e) => updateIngredient(ingredient.id, "unit", e.target.value)}
                  className="sm:col-span-1"
                />
                <Input
                  placeholder="Ingredient name"
                  value={ingredient.text}
                  onChange={(e) => updateIngredient(ingredient.id, "text", e.target.value)}
                  className="sm:col-span-2"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeIngredient(ingredient.id)}
                disabled={ingredients.length === 1}
                className="text-neutral-400 hover:text-red-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Instructions</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
            Add Step
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {instructions.map((instruction, index) => (
            <div key={instruction.id} className="flex gap-2 items-start">
              <span className="flex h-10 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                {index + 1}
              </span>
              <Textarea
                placeholder={`Step ${index + 1}: Describe what to do...`}
                value={instruction.text}
                onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInstruction(instruction.id)}
                disabled={instructions.length === 1}
                className="text-neutral-400 hover:text-red-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
            />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                Make this recipe public
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Public recipes can be viewed by anyone with the link
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEditing ? "Update Recipe" : "Create Recipe"}
        </Button>
      </div>
    </form>
  );
}
