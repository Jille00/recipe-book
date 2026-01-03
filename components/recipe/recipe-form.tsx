"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ImageUpload } from "@/components/recipe/image-upload";
import { RecipeImportModal } from "@/components/recipe/recipe-import-modal";
import { NutritionDisplay } from "@/components/recipe/nutrition-display";
import type { Ingredient, Instruction, Difficulty } from "@/types/recipe";
import type { NutritionInfo } from "@/types/nutrition";

interface Tag {
  id: string;
  name: string;
  slug: string;
}
import type { ExtractedRecipe } from "@/types/extraction";
import {
  Plus,
  X,
  AlertCircle,
  BookOpen,
  Clock,
  Users,
  ListChecks,
  ChefHat,
  Globe,
  Flame,
  Timer,
  UtensilsCrossed,
  Camera,
  Apple,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useUnitPreferences } from "@/hooks/use-unit-preferences";
import type { UnitSystem } from "@/types/units";

// Unit options for ingredient selection with system info
const UNIT_OPTIONS: Array<{
  value: string;
  label: string;
  system: UnitSystem | "common";
}> = [
  { value: "", label: "No unit", system: "common" },
  // Volume - Common (used in both systems)
  { value: "tsp", label: "tsp (teaspoon)", system: "common" },
  { value: "tbsp", label: "tbsp (tablespoon)", system: "common" },
  // Volume - Imperial
  { value: "fl oz", label: "fl oz (fluid ounce)", system: "imperial" },
  { value: "cup", label: "cup", system: "imperial" },
  { value: "pint", label: "pint", system: "imperial" },
  { value: "quart", label: "quart", system: "imperial" },
  { value: "gallon", label: "gallon", system: "imperial" },
  // Volume - Metric
  { value: "ml", label: "ml (milliliter)", system: "metric" },
  { value: "cl", label: "cl (centiliter)", system: "metric" },
  { value: "dl", label: "dl (deciliter)", system: "metric" },
  { value: "l", label: "L (liter)", system: "metric" },
  // Weight - Imperial
  { value: "oz", label: "oz (ounce)", system: "imperial" },
  { value: "lb", label: "lb (pound)", system: "imperial" },
  // Weight - Metric
  { value: "mg", label: "mg (milligram)", system: "metric" },
  { value: "g", label: "g (gram)", system: "metric" },
  { value: "kg", label: "kg (kilogram)", system: "metric" },
  // Count-based (common - shown for both systems)
  { value: "piece", label: "piece", system: "common" },
  { value: "slice", label: "slice", system: "common" },
  { value: "clove", label: "clove", system: "common" },
  { value: "sprig", label: "sprig", system: "common" },
  { value: "bunch", label: "bunch", system: "common" },
  { value: "pinch", label: "pinch", system: "common" },
  { value: "dash", label: "dash", system: "common" },
  { value: "to taste", label: "to taste", system: "common" },
];

interface RecipeFormProps {
  tags: Tag[];
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
    image_url: string | null;
    nutrition: NutritionInfo | null;
    tag_ids: string[];
    is_public: boolean;
  };
}

export function RecipeForm({ tags, initialData }: RecipeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;
  const { globalPreference } = useUnitPreferences();

  // Filter units based on user preference
  const filteredUnitOptions = useMemo(() => {
    return UNIT_OPTIONS.filter(
      (unit) => unit.system === "common" || unit.system === globalPreference
    );
  }, [globalPreference]);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients || [
      { id: nanoid(), text: "", amount: "", unit: "" },
    ]
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    initialData?.instructions || [{ id: nanoid(), step: 1, text: "" }]
  );
  const [prepTime, setPrepTime] = useState(
    initialData?.prep_time_minutes?.toString() || ""
  );
  const [cookTime, setCookTime] = useState(
    initialData?.cook_time_minutes?.toString() || ""
  );
  const [servings, setServings] = useState(
    initialData?.servings?.toString() || ""
  );
  const [difficulty, setDifficulty] = useState<Difficulty | "">(
    initialData?.difficulty || ""
  );
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tag_ids || []
  );
  const [isPublic, setIsPublic] = useState(initialData?.is_public || false);
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(
    initialData?.nutrition || null
  );
  const [isCalculatingNutrition, setIsCalculatingNutrition] = useState(false);
  const [isEditingNutrition, setIsEditingNutrition] = useState(false);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Handle import from AI extraction
  const handleImportRecipe = (extracted: ExtractedRecipe) => {
    setTitle(extracted.title);
    setDescription(extracted.description || "");
    setPrepTime(extracted.prepTimeMinutes?.toString() || "");
    setCookTime(extracted.cookTimeMinutes?.toString() || "");
    setServings(extracted.servings?.toString() || "");
    setDifficulty(extracted.difficulty || "");

    // Map ingredients with new IDs
    setIngredients(
      extracted.ingredients.map((ing) => ({
        id: nanoid(),
        text: ing.text,
        amount: ing.amount || "",
        unit: ing.unit || "",
      }))
    );

    // Map instructions with new IDs
    setInstructions(
      extracted.instructions.map((inst, index) => ({
        id: nanoid(),
        step: index + 1,
        text: inst.text,
      }))
    );

    // Match suggested category to tags
    if (extracted.suggestedCategory) {
      const normalized = extracted.suggestedCategory.toLowerCase().trim();
      const matched = tags.find(
        (t) =>
          t.name.toLowerCase() === normalized ||
          t.name.toLowerCase().includes(normalized) ||
          normalized.includes(t.name.toLowerCase())
      );
      if (matched) {
        setSelectedTagIds([matched.id]);
      }
    }
  };

  // Calculate nutrition from ingredients
  const calculateNutrition = async () => {
    const filteredIngredients = ingredients.filter((i) => i.text.trim());
    const servingsNum = servings ? parseInt(servings) : null;

    if (filteredIngredients.length === 0 || !servingsNum) {
      return;
    }

    setIsCalculatingNutrition(true);
    setError("");

    try {
      const response = await fetch("/api/calculate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: filteredIngredients.map((ing) => ({
            text: ing.text,
            amount: ing.amount,
            unit: ing.unit,
          })),
          servings: servingsNum,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to calculate nutrition");
      }

      const data = await response.json();
      setNutrition(data.nutrition);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to calculate nutrition"
      );
    } finally {
      setIsCalculatingNutrition(false);
    }
  };

  const handleNutritionEdit = (updatedNutrition: NutritionInfo) => {
    setNutrition(updatedNutrition);
    setIsEditingNutrition(false);
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: nanoid(), text: "", amount: "", unit: "" },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((i) => i.id !== id));
    }
  };

  const updateIngredient = (
    id: string,
    field: keyof Ingredient,
    value: string
  ) => {
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
      image_url: imageUrl || null,
      nutrition: nutrition,
      tag_ids: selectedTagIds,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Hero Section - Title & Image */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Recipe Details</CardTitle>
                <CardDescription>
                  Give your recipe a name and description
                </CardDescription>
              </div>
            </div>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Import
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Title & Description */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Recipe Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Grandma's Apple Pie"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-12 text-lg font-display"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Share the story behind this recipe..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border min-h-[44px]">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {tag.name}
                      {selectedTagIds.includes(tag.id) && (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click to select multiple tags
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Difficulty</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as Difficulty)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Easy
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Medium
                        </span>
                      </SelectItem>
                      <SelectItem value="hard">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          Hard
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right: Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recipe Photo</Label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                recipeContext={{
                  title,
                  description,
                  ingredients: ingredients.filter((i) => i.text.trim()),
                  instructions: instructions.filter((i) => i.text.trim()),
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time & Servings - Compact Row */}
      <Card className="p-0">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display">Time & Servings</CardTitle>
              <CardDescription>How long does it take to make?</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative">
              <Label
                htmlFor="prepTime"
                className="text-sm font-medium mb-2 block"
              >
                Prep Time
              </Label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="prepTime"
                  type="number"
                  min="0"
                  placeholder="30"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="pl-10 h-11"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  min
                </span>
              </div>
            </div>
            <div className="relative">
              <Label
                htmlFor="cookTime"
                className="text-sm font-medium mb-2 block"
              >
                Cook Time
              </Label>
              <div className="relative">
                <Flame className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cookTime"
                  type="number"
                  min="0"
                  placeholder="45"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="pl-10 h-11"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  min
                </span>
              </div>
            </div>
            <div className="relative">
              <Label
                htmlFor="servings"
                className="text-sm font-medium mb-2 block"
              >
                Servings
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  placeholder="4"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="pl-10 h-11"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  people
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card className="p-0">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Ingredients</CardTitle>
                <CardDescription>
                  What you&apos;ll need to make this recipe
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {ingredients.map((ingredient, index) => (
              <div
                key={ingredient.id}
                className="group flex gap-3 items-center p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all duration-200"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="flex-1 grid gap-2 sm:grid-cols-12">
                  <Input
                    placeholder="Qty"
                    value={ingredient.amount || ""}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "amount", e.target.value)
                    }
                    className="sm:col-span-2 h-9 text-center"
                  />
                  <Select
                    value={ingredient.unit || "none"}
                    onValueChange={(value) =>
                      updateIngredient(
                        ingredient.id,
                        "unit",
                        value === "none" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger className="sm:col-span-4 h-9">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUnitOptions.map((unit) => (
                        <SelectItem
                          key={unit.value || "none"}
                          value={unit.value || "none"}
                        >
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ingredient (e.g., all-purpose flour, sifted)"
                    value={ingredient.text}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "text", e.target.value)
                    }
                    className="sm:col-span-6 h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeIngredient(ingredient.id)}
                  disabled={ingredients.length === 1}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredient}
            className="mt-4 w-full border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another ingredient
          </Button>
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card className="p-0">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Apple className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Nutrition</CardTitle>
                <CardDescription>
                  Estimated nutritional values per serving
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={calculateNutrition}
              disabled={
                isCalculatingNutrition ||
                ingredients.filter((i) => i.text.trim()).length === 0 ||
                !servings
              }
              className="gap-2"
            >
              {isCalculatingNutrition ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {nutrition ? "Recalculate" : "Calculate"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!nutrition && !isCalculatingNutrition && (
            <div className="text-center py-8 text-muted-foreground">
              <Apple className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {ingredients.filter((i) => i.text.trim()).length === 0
                  ? "Add ingredients to calculate nutrition"
                  : !servings
                  ? "Add servings to calculate nutrition"
                  : 'Click "Calculate" to estimate nutritional values'}
              </p>
            </div>
          )}
          {isCalculatingNutrition && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Calculating nutrition...
              </p>
            </div>
          )}
          {nutrition && !isCalculatingNutrition && (
            <NutritionDisplay
              nutrition={nutrition}
              servings={servings ? parseInt(servings) : null}
              isEditable={true}
              isEditing={isEditingNutrition}
              onEdit={handleNutritionEdit}
              onStartEdit={() => setIsEditingNutrition(true)}
              onCancelEdit={() => setIsEditingNutrition(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="p-0">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Instructions</CardTitle>
                <CardDescription>Step-by-step directions</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstruction}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {instructions.map((instruction, index) => (
              <div
                key={instruction.id}
                className="group flex gap-4 items-start"
              >
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                    {index + 1}
                  </span>
                  {index < instructions.length - 1 && (
                    <div className="w-0.5 flex-1 bg-border mt-2 min-h-[20px]" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <Textarea
                    placeholder={`Describe step ${index + 1}...`}
                    value={instruction.text}
                    onChange={(e) =>
                      updateInstruction(instruction.id, e.target.value)
                    }
                    className="min-h-[80px] resize-none"
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeInstruction(instruction.id)}
                  disabled={instructions.length === 1}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity mt-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addInstruction}
            className="mt-2 w-full border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another step
          </Button>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card className="p-0">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display">Visibility</CardTitle>
              <CardDescription>Control who can see your recipe</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl transition-all duration-200">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary/50 focus:ring-offset-0"
              />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Make this recipe public
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Anyone with the link can view this recipe. Perfect for sharing
                with friends and family.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          <span className="text-destructive">*</span> Required fields
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="min-w-[140px] gap-2"
          >
            {!isSubmitting && <ChefHat className="h-4 w-4" />}
            {isEditing ? "Update Recipe" : "Create Recipe"}
          </Button>
        </div>
      </div>

      {/* Import Modal */}
      <RecipeImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImportRecipe}
        tags={tags}
      />
    </form>
  );
}
