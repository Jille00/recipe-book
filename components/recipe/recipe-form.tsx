"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  Button,
  buttonVariants,
  Input,
  Textarea,
  Card,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImageUpload } from "@/components/recipe/image-upload";
import { ColourDot } from "@/components/recipe/recipe-colour";
import {
  RECIPE_COLOURS,
  automaticRecipeColour,
  colourForTags,
  type RecipeColour,
} from "@/lib/recipe-colour";
import { NutritionDisplay } from "@/components/recipe/nutrition-display";
import { ResetLinkSection } from "@/components/recipe/reset-link-section";
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
  Check,
  Camera,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnitPreferences } from "@/hooks/use-unit-preferences";
import type { UnitSystem } from "@/types/units";
import { recipePath } from "@/lib/recipe-url";
import { nutritionBasisKey } from "@/lib/utils/nutrition-inputs";
import { recipeFormSnapshot } from "@/lib/utils/recipe-form-snapshot";
import {
  applyImportToForm,
  fieldsOverwrittenByImport,
  type ImportableFormValues,
} from "@/lib/recipe-import/apply-to-form";
import { useBeforeUnload } from "@/hooks/use-before-unload";
import { useLinkNavigationGuard } from "@/hooks/use-link-navigation-guard";
import { useHistoryGuard } from "@/hooks/use-history-guard";

// The import dialog (and its image and HEIC helpers) is only needed once
// someone opens it, so it is split into its own chunk.
const RecipeImportModal = dynamic(
  () =>
    import("@/components/recipe/recipe-import-modal").then(
      (mod) => mod.RecipeImportModal
    ),
  { ssr: false }
);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Nutrition as the form holds it: the basis key is tracked separately. */
function withoutBasisKey(nutrition: NutritionInfo): NutritionInfo {
  const copy = { ...nutrition };
  delete copy.basisKey;
  return copy;
}

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

// Spoken and written names for the picker (the token names, capitalised).
const COLOUR_NAMES: Record<RecipeColour, string> = {
  tomato: "Tomato",
  carrot: "Carrot",
  lemon: "Lemon",
  basil: "Basil",
  sea: "Sea",
  plum: "Plum",
  beet: "Beet",
  rye: "Rye",
  butter: "Butter",
};

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
    /** The colour picked earlier; null or absent means automatic. */
    colour?: RecipeColour | null;
    image_url: string | null;
    nutrition: NutritionInfo | null;
    tag_ids: string[];
    is_public: boolean;
  };
  /**
   * Seeds the colour shown in the photo area: the recipe's share code when
   * editing, so it is the colour the recipe actually has.
   */
  tileSeed?: string;
}

export function RecipeForm({ tags, initialData, tileSeed }: RecipeFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;
  const { globalPreference } = useUnitPreferences();

  /**
   * Units offered for one ingredient row: everything matching the user's
   * global preference, plus the unit this row already uses. Without that
   * addition, editing a recipe saved in "cup" as a metric user rendered an
   * empty unit field (no matching SelectItem) and any pick silently rewrote
   * the stored unit.
   */
  const unitOptionsFor = useCallback(
    (currentUnit?: string) => {
      const options = UNIT_OPTIONS.filter(
        (unit) => unit.system === "common" || unit.system === globalPreference
      );

      const unit = (currentUnit || "").trim();
      if (!unit || options.some((option) => option.value === unit)) {
        return options;
      }

      const known = UNIT_OPTIONS.find((option) => option.value === unit);
      return [
        ...options,
        known ?? { value: unit, label: unit, system: "common" as const },
      ];
    },
    [globalPreference]
  );

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
  // "" is automatic: the colour follows the tags (then the share code).
  const [colour, setColour] = useState<RecipeColour | "">(initialData?.colour || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tag_ids || []
  );
  const [isPublic, setIsPublic] = useState(initialData?.is_public || false);
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(() =>
    initialData?.nutrition ? withoutBasisKey(initialData.nutrition) : null
  );
  // Fingerprint of the ingredients and servings the nutrition on screen was
  // calculated from. It is saved with the nutrition, so numbers that were
  // already outdated when saved are still flagged when the recipe is edited
  // again. Nutrition saved before the fingerprint existed is taken to match
  // its saved ingredients.
  const [nutritionBasis, setNutritionBasis] = useState<string | null>(() =>
    initialData?.nutrition
      ? initialData.nutrition.basisKey ??
        nutritionBasisKey(initialData.ingredients, initialData.servings)
      : null
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
  // The import dialog's code is loaded the first time it opens, then kept
  // mounted so it can animate closed.
  const [importModalMounted, setImportModalMounted] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  // Where a held-back link click was going; null means Cancel or the
  // browser's Back button (go back).
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // Set when the link was reset here: the page we came from no longer exists.
  const [resetAddress, setResetAddress] = useState<{ code: string; slug: string } | null>(null);
  const [outdatedDialogOpen, setOutdatedDialogOpen] = useState(false);
  // True once the recipe was saved or the user chose to discard changes:
  // leaving is intended from then on, so it is no longer guarded.
  const [leaveAllowed, setLeaveAllowed] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const servingsInputRef = useRef<HTMLInputElement>(null);
  // Set synchronously, unlike isSubmitting, so a fast second click can't slip
  // in before the re-render and create the recipe twice.
  const submittingRef = useRef(false);

  const formValues = {
    title,
    description,
    ingredients,
    instructions,
    prepTime,
    cookTime,
    servings,
    difficulty,
    imageUrl,
    colour,
    tagIds: selectedTagIds,
    isPublic,
    nutrition,
  };
  // What the form held when it opened; any difference is an unsaved change.
  const [initialSnapshot] = useState(() => recipeFormSnapshot(formValues));
  const isDirty = recipeFormSnapshot(formValues) !== initialSnapshot;
  useBeforeUnload(isDirty && !leaveAllowed);
  useLinkNavigationGuard(isDirty && !leaveAllowed, (href) => {
    setPendingHref(href);
    setDiscardDialogOpen(true);
  });
  const historyGuard = useHistoryGuard(isDirty && !leaveAllowed, () => {
    setPendingHref(null);
    setDiscardDialogOpen(true);
  });

  // Nutrition is calculated per serving, but the Servings field lives in a
  // different card from the Calculate button. The hint links straight to it.
  const focusServingsField = () => {
    const input = servingsInputRef.current;
    if (!input) return;
    input.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    input.focus({ preventScroll: true });
  };

  // The banner renders at the top of a very long form, so pressing "Create
  // Recipe" at the bottom used to look like nothing happened. Bring it into
  // view (and focus it) whenever a new message appears.
  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    errorRef.current?.focus({ preventScroll: true });
  }, [error]);

  const importableValues: ImportableFormValues = {
    title,
    description,
    prepTime,
    cookTime,
    servings,
    difficulty,
    imageUrl,
    ingredients,
    instructions,
    tagIds: selectedTagIds,
  };

  // Which filled-in fields an import would replace; the import dialog asks
  // before overwriting them.
  const getOverwrittenFields = (extracted: ExtractedRecipe) =>
    fieldsOverwrittenByImport(
      importableValues,
      applyImportToForm(importableValues, extracted, tags)
    );

  // Handle import from AI extraction
  const handleImportRecipe = (extracted: ExtractedRecipe) => {
    const next = applyImportToForm(importableValues, extracted, tags);
    setTitle(next.title);
    setDescription(next.description);
    setPrepTime(next.prepTime);
    setCookTime(next.cookTime);
    setServings(next.servings);
    setDifficulty(next.difficulty);
    setImageUrl(next.imageUrl);
    setIngredients(
      next.ingredients.map((ing) => ({
        id: nanoid(),
        text: ing.text,
        amount: ing.amount ?? "",
        unit: ing.unit ?? "",
      }))
    );
    setInstructions(
      next.instructions.map((inst, index) => ({
        id: nanoid(),
        step: index + 1,
        text: inst.text,
      }))
    );
    setSelectedTagIds(next.tagIds);
  };

  const openImportModal = () => {
    setImportModalMounted(true);
    setImportModalOpen(true);
  };

  // Calculate nutrition from ingredients
  const calculateNutrition = async () => {
    const filteredIngredients = ingredients.filter((i) => i.text.trim());
    const servingsNum = servings ? parseInt(servings) : null;

    if (filteredIngredients.length === 0 || !servingsNum) {
      return;
    }

    // Captured before the request: if the recipe is edited while this runs,
    // the result must still count as based on what was actually sent.
    const requestBasis = nutritionBasisKey(filteredIngredients, servings);

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
      setNutrition(withoutBasisKey(data.nutrition));
      setNutritionBasis(requestBasis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to calculate nutrition"
      );
    } finally {
      setIsCalculatingNutrition(false);
    }
  };

  const handleNutritionEdit = (updatedNutrition: NutritionInfo) => {
    setNutrition(withoutBasisKey(updatedNutrition));
    // Editing the values by hand means they were reviewed against the recipe
    // as it is now.
    setNutritionBasis(nutritionBasisKey(ingredients, servings));
    setIsEditingNutrition(false);
  };

  const hasIngredientText = ingredients.some((i) => i.text.trim());
  const nutritionOutdated =
    nutrition !== null &&
    nutritionBasis !== null &&
    nutritionBasis !== nutritionBasisKey(ingredients, servings);
  const canCalculateNutrition = hasIngredientText && !!servings;

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

  const saveRecipe = async ({
    allowOutdatedNutrition,
  }: {
    allowOutdatedNutrition: boolean;
  }) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setIsSubmitting(true);

    const filteredIngredients = ingredients.filter((i) => i.text.trim());
    const filteredInstructions = instructions.filter((i) => i.text.trim());

    if (filteredIngredients.length === 0) {
      setError("Please add at least one ingredient");
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (filteredInstructions.length === 0) {
      setError("Please add at least one instruction");
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // Saving numbers that no longer match the recipe would show them on the
    // recipe page as if they did; ask first.
    if (nutritionOutdated && !allowOutdatedNutrition) {
      submittingRef.current = false;
      setIsSubmitting(false);
      setOutdatedDialogOpen(true);
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
      colour: colour || null,
      // The basis key travels with the nutrition, so the editor can still
      // tell later whether these numbers match the recipe.
      nutrition: nutrition
        ? { ...nutrition, basisKey: nutritionBasis ?? undefined }
        : null,
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
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Failed to save recipe (${response.status})`);
      }

      const data = await response.json();
      // Saved: navigating away is no longer losing anything. flushSync drops
      // the beforeunload guard before navigation starts.
      const onGuardEntry = historyGuard.release();
      flushSync(() => setLeaveAllowed(true));
      toast.success(isEditing ? "Recipe saved" : "Recipe created");
      // Land on the recipe's one address, which is also its share link. The
      // form stays disabled while that page loads.
      // Replace the Back-button guard's extra entry rather than leaving it
      // behind as a second copy of this form.
      if (onGuardEntry) router.replace(recipePath(data));
      else router.push(recipePath(data));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void saveRecipe({ allowOutdatedNutrition: false });
  };

  // `href`: where a held-back link was going; null leaves the way Cancel does.
  const leave = (href: string | null) => {
    const target = href ?? (resetAddress ? recipePath(resetAddress) : null);
    if (!target) {
      // Steps over the Back-button guard's extra entry when it is there. It
      // must stop guarding before leaveAllowed does (or it would consume the
      // entry itself); the traversal is async, so flushSync still lands first.
      historyGuard.back();
      flushSync(() => setLeaveAllowed(true));
      return;
    }
    const onGuardEntry = historyGuard.release();
    flushSync(() => setLeaveAllowed(true));
    if (onGuardEntry) router.replace(target);
    else router.push(target);
  };

  const handleCancel = () => {
    setPendingHref(null);
    if (isDirty) {
      setDiscardDialogOpen(true);
    } else {
      leave(null);
    }
  };

  // The colour the recipe will get when it has no photo. The selected tags
  // decide it; failing that, the share code does, which only exists once the
  // recipe is saved. Until either is known the preview stays neutral rather
  // than promising a colour the saved recipe may not get.
  const tileTags = tags
    .filter((tag) => selectedTagIds.includes(tag.id))
    .map((tag) => tag.name);
  const automaticKnown = Boolean(tileSeed) || colourForTags(tileTags) !== null;
  const automaticColour = automaticKnown
    ? automaticRecipeColour(tileSeed ?? "new", tileTags)
    : null;
  const colourKnown = colour !== "" || automaticKnown;
  const shownColour = colour || automaticColour;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive animate-in fade-in slide-in-from-top-2 duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Details: title, description, tags, difficulty */}
      <FormSection
        id="details"
        title="Details"
        description="A name, a few lines about the dish, and where it belongs."
        action={
          !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openImportModal}
            >
              <Camera aria-hidden="true" />
              Import
            </Button>
          )
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              ref={titleInputRef}
              id="title"
              placeholder="e.g. Grandma's apple pie"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-14 font-display text-3xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Where it comes from, when you make it, what makes it good"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <fieldset className="space-y-3" aria-describedby="tags-help">
            <legend className="mb-1 text-[15px] font-bold">Tags</legend>
            <p id="tags-help" className="text-[13px] text-muted-foreground">
              Pick any that fit. Tags also choose the recipe&apos;s
              colour.
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-[15px] font-semibold transition-colors duration-(--duration-fast) ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <ColourDot seed={tag.slug} tags={[tag.name]} />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2 sm:max-w-xs">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as Difficulty)}
            >
              <SelectTrigger id="difficulty" className="w-full">
                <SelectValue placeholder="Choose a level" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn("size-2 rounded-full", option.dot)}
                        aria-hidden="true"
                      />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {/* Colour: automatic from the tags, or one the cook picks */}
      <FormSection
        id="colour"
        title="Colour"
        description="Every recipe has a colour. It follows your tags unless you pick one."
      >
        <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
          <fieldset className="min-w-0 flex-1 basis-72">
            <legend className="sr-only">Recipe colour</legend>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-border bg-card px-4 text-[15px] font-semibold text-foreground transition-colors duration-(--duration-fast) hover:border-foreground has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card">
                <input
                  type="radio"
                  name="recipe-colour"
                  value=""
                  checked={colour === ""}
                  onChange={() => setColour("")}
                  className="sr-only"
                />
                Automatic
              </label>
              {RECIPE_COLOURS.map((option) => (
                <label
                  key={option}
                  title={COLOUR_NAMES[option]}
                  className={cn(
                    `recipe-${option}`,
                    "flex size-11 cursor-pointer items-center justify-center rounded-full bg-recipe text-on-recipe transition-transform duration-(--duration-fast) hover:scale-110 has-[:checked]:ring-[3px] has-[:checked]:ring-foreground has-[:checked]:ring-offset-[3px] has-[:checked]:ring-offset-card has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-[3px] has-[:focus-visible]:ring-offset-card"
                  )}
                >
                  <input
                    type="radio"
                    name="recipe-colour"
                    value={option}
                    checked={colour === option}
                    onChange={() => setColour(option)}
                    className="peer sr-only"
                  />
                  <span className="sr-only">{COLOUR_NAMES[option]}</span>
                  <Check
                    className="hidden size-5 peer-checked:block"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </label>
              ))}
            </div>
            {/* The name in words: colour is never the only carrier. */}
            <p className="mt-4 text-[15px] text-muted-foreground" aria-live="polite">
              {colour !== "" ? (
                <>
                  <span className="font-bold text-foreground">{COLOUR_NAMES[colour]}</span>, picked
                  by you.
                </>
              ) : automaticColour ? (
                <>
                  <span className="font-bold text-foreground">
                    {COLOUR_NAMES[automaticColour]}
                  </span>
                  {colourForTags(tileTags) !== null
                    ? ", from your tags."
                    : ", chosen for this recipe because no tag decides it."}
                </>
              ) : (
                "No tag decides the colour yet. Pick a tag above or a colour here."
              )}
            </p>
          </fieldset>

          {/* A small version of the label, so the choice is seen in place. */}
          <div
            aria-hidden="true"
            className={cn(
              shownColour ? `recipe-${shownColour} bg-recipe text-on-recipe` : "bg-muted text-muted-foreground",
              "flex h-44 w-full max-w-64 flex-col justify-between rounded-[20px] p-4"
            )}
          >
            <span className="truncate text-sm font-bold">{tileTags[0]}</span>
            <span className="font-display text-4xl leading-[0.9] line-clamp-3 hyphens-auto">
              {title.trim() || "Your recipe"}
            </span>
          </div>
        </div>
      </FormSection>

      {/* Photo, with the recipe's colour as the stand-in */}
      <FormSection
        id="photo"
        title="Photo"
        description={
          isEditing
            ? "Without a photo, the recipe's colour is its cover."
            : colourKnown
              ? "Until you add a photo, the recipe's label is a block of this colour."
              : "Pick a category or a colour above to choose this recipe's colour."
        }
      >
        {/* No seed means no colour block is drawn; the neutral block shows through. */}
        <div className={cn(!colourKnown && !imageUrl && "rounded-xl bg-muted")}>
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          tileSeed={colourKnown ? (tileSeed ?? "new") : undefined}
          tileTags={tileTags}
          tileColour={colour || null}
          recipeContext={{
            title,
            description,
            ingredients: ingredients.filter((i) => i.text.trim()),
            instructions: instructions.filter((i) => i.text.trim()),
          }}
        />
        </div>
      </FormSection>

      {/* Time & servings */}
      <FormSection
        id="time"
        title="Time and servings"
        description="Rough numbers are fine; they help people plan."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            id="prepTime"
            label="Prep time"
            suffix="min"
            min="0"
            placeholder="30"
            value={prepTime}
            onChange={setPrepTime}
          />
          <NumberField
            id="cookTime"
            label="Cook time"
            suffix="min"
            min="0"
            placeholder="45"
            value={cookTime}
            onChange={setCookTime}
          />
          <NumberField
            ref={servingsInputRef}
            id="servings"
            label="Servings"
            suffix="people"
            min="1"
            placeholder="4"
            value={servings}
            onChange={setServings}
          />
        </div>
      </FormSection>

      {/* Ingredients */}
      <FormSection
        id="ingredients"
        title="Ingredients"
        description="One per line. Amounts scale with the servings."
      >
        {/* Column labels for the aligned rows (the fields carry their own
            accessible names). */}
        <div
          aria-hidden="true"
          className="mb-2 hidden grid-cols-[6rem_10rem_minmax(0,1fr)_2.75rem] gap-2 text-sm font-bold text-muted-foreground sm:grid"
        >
          <span>Amount</span>
          <span>Unit</span>
          <span>Ingredient</span>
        </div>
        <ul className="space-y-3 sm:space-y-2">
          {ingredients.map((ingredient, index) => (
            <li
              key={ingredient.id}
              className="group grid grid-cols-[5.5rem_minmax(0,1fr)_2.75rem] items-center gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[6rem_10rem_minmax(0,1fr)_2.75rem] sm:border-b-0 sm:pb-0"
            >
              <Input
                aria-label={`Ingredient ${index + 1} quantity`}
                placeholder="Qty"
                inputMode="decimal"
                value={ingredient.amount || ""}
                onChange={(e) =>
                  updateIngredient(ingredient.id, "amount", e.target.value)
                }
                className="px-3 text-right tabular"
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
                <SelectTrigger
                  aria-label={`Ingredient ${index + 1} unit`}
                  className="w-full"
                >
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptionsFor(ingredient.unit).map((unit) => (
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
                aria-label={`Ingredient ${index + 1} name`}
                placeholder="e.g. plain flour, sifted"
                value={ingredient.text}
                onChange={(e) =>
                  updateIngredient(ingredient.id, "text", e.target.value)
                }
                className="col-span-3 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(ingredient.id)}
                disabled={ingredients.length === 1}
                aria-label={`Remove ingredient ${index + 1}`}
                // Hover-only controls are unreachable on touch devices and
                // invisible to keyboard users, so only fade on >= sm and
                // always reveal while something in the row has focus.
                className="col-start-3 row-start-1 hover:text-destructive sm:col-start-4 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          className="mt-5"
        >
          <Plus aria-hidden="true" />
          Add ingredient
        </Button>
      </FormSection>

      {/* Method */}
      <FormSection
        id="method"
        title="Method"
        description="Step by step, in the order you cook."
      >
        <ol className="space-y-5">
          {instructions.map((instruction, index) => (
            <li
              key={instruction.id}
              className="group grid grid-cols-[2.25rem_minmax(0,1fr)_2.75rem] items-start gap-x-3"
            >
              <span
                aria-hidden="true"
                className="pt-2 text-right font-display text-[2.5rem] leading-none text-primary tabular"
              >
                {index + 1}
              </span>
              <Textarea
                aria-label={`Step ${index + 1} instructions`}
                placeholder={`Describe step ${index + 1}`}
                value={instruction.text}
                onChange={(e) =>
                  updateInstruction(instruction.id, e.target.value)
                }
                className="min-h-20 resize-none"
                rows={3}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(instruction.id)}
                disabled={instructions.length === 1}
                aria-label={`Remove step ${index + 1}`}
                className="hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addInstruction}
          className="mt-5"
        >
          <Plus aria-hidden="true" />
          Add step
        </Button>
      </FormSection>

      {/* Nutrition */}
      <FormSection
        id="nutrition"
        title="Nutrition"
        description="An estimate per serving, worked out from the ingredients."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={calculateNutrition}
            disabled={isCalculatingNutrition || !canCalculateNutrition}
          >
            {isCalculatingNutrition ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {nutrition ? "Recalculate" : "Calculate"}
          </Button>
        }
      >
        {!nutrition && !isCalculatingNutrition && (
          <p className="rounded-lg bg-muted px-4 py-5 text-center text-sm text-muted-foreground">
            {ingredients.filter((i) => i.text.trim()).length === 0 ? (
              "Add ingredients to calculate nutrition."
            ) : !servings ? (
              <>
                <button
                  type="button"
                  onClick={focusServingsField}
                  className="font-bold text-foreground underline decoration-2 underline-offset-4 hover:decoration-[3px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Add servings
                </button>{" "}
                to calculate nutrition.
              </>
            ) : (
              'Choose "Calculate" to estimate the nutrition per serving.'
            )}
          </p>
        )}
        {isCalculatingNutrition && (
          <div className="flex items-center justify-center gap-3 rounded-lg bg-muted px-4 py-5">
            <Loader2
              className="size-5 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Calculating nutrition...
            </p>
          </div>
        )}
        {nutrition && !isCalculatingNutrition && nutritionOutdated && (
          <div
            role="status"
            className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm dark:border-warning-light/30 dark:bg-warning-light/15"
          >
            <AlertTriangle
              className="size-4 shrink-0 text-warning dark:text-warning-light"
              aria-hidden="true"
            />
            <p className="flex-1 text-foreground">
              The ingredients or servings have changed since this was
              calculated, so these numbers may be out of date.
            </p>
            {canCalculateNutrition ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculateNutrition}
              >
                <Sparkles aria-hidden="true" />
                Recalculate
              </Button>
            ) : !servings ? (
              <button
                type="button"
                onClick={focusServingsField}
                className="font-bold text-foreground underline decoration-2 underline-offset-4 hover:decoration-[3px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Add servings
              </button>
            ) : null}
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
      </FormSection>

      {/* Visibility */}
      <FormSection
        id="visibility"
        title="Visibility"
        description="You can always share a recipe by sending its link."
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          />
          <span className="flex-1">
            <span className="block text-[15px] font-bold text-foreground">
              Make this recipe public
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Show it on Browse and in search results so anyone can find it.
              When it&apos;s not public, only people you send the link to can
              open it.
            </span>
          </span>
        </label>
        {isEditing && initialData?.id && (
          // The section brings its own top rule and padding; stretch it to
          // the card's edges and line its text up with the rest.
          <div className="-mx-5 mt-6 -mb-6 sm:-mx-6 [&>div]:px-5 [&>div]:py-5 sm:[&>div]:px-6">
            <ResetLinkSection
              recipeId={initialData.id}
              onReset={setResetAddress}
            />
          </div>
        )}
      </FormSection>

      {/* Actions: pinned to the bottom of the screen on phones, so saving is
          always one tap away on a long form. */}
      <div className="sticky bottom-0 z-40 -mx-4 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-6 sm:pb-0 sm:backdrop-blur-none">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-sm text-muted-foreground sm:block">
            <span className="text-destructive" aria-hidden="true">
              *
            </span>{" "}
            Required
          </p>
          <div className="flex flex-1 gap-3 sm:flex-none">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-[2] sm:flex-none"
            >
              {isEditing ? "Save recipe" : "Create recipe"}
            </Button>
          </div>
        </div>
      </div>

      {/* Import Modal - loaded on first open */}
      {importModalMounted && (
        <RecipeImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onImport={handleImportRecipe}
          getOverwrittenFields={getOverwrittenFields}
          focusAfterApplyRef={titleInputRef}
          tags={tags}
        />
      )}

      {/* Cancel with unsaved changes */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-4xl">
              Discard your changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEditing
                ? "Your changes to this recipe haven't been saved and will be lost."
                : "This recipe hasn't been saved and everything you entered will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leave(pendingHref)}
              className={buttonVariants({ variant: "destructive" })}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Saving while the nutrition no longer matches the recipe */}
      <AlertDialog open={outdatedDialogOpen} onOpenChange={setOutdatedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-4xl">
              Nutrition may be out of date
            </AlertDialogTitle>
            <AlertDialogDescription>
              The ingredients or servings changed after the nutrition was
              calculated, so the saved numbers may not match this recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            {canCalculateNutrition && (
              <AlertDialogAction
                onClick={() => void calculateNutrition()}
                className={buttonVariants({ variant: "outline" })}
              >
                <Sparkles aria-hidden="true" />
                Recalculate
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => void saveRecipe({ allowOutdatedNutrition: true })}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

const DIFFICULTY_OPTIONS: Array<{
  value: Difficulty;
  label: string;
  dot: string;
}> = [
  { value: "easy", label: "Easy", dot: "bg-success dark:bg-success-light" },
  { value: "medium", label: "Medium", dot: "bg-warning dark:bg-warning-light" },
  { value: "hard", label: "Hard", dot: "bg-danger dark:bg-danger-light" },
];

/**
 * One section of the editor: a quiet card with a display title, a line of
 * guidance, and an optional action on the right.
 */
function FormSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = `${id}-section-title`;
  return (
    <section aria-labelledby={titleId}>
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-6 sm:px-6">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 id={titleId} className="text-3xl leading-[0.95] text-foreground">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
        <div className="px-5 pt-5 pb-6 sm:px-6">{children}</div>
      </Card>
    </section>
  );
}

/** A number input with its unit spelled out inside the field, in mono. */
function NumberField({
  ref,
  id,
  label,
  suffix,
  min,
  placeholder,
  value,
  onChange,
}: {
  ref?: React.Ref<HTMLInputElement>;
  id: string;
  label: string;
  suffix: string;
  min: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const suffixId = `${id}-unit`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={suffixId}
          className="pr-18 tabular"
        />
        <span
          id={suffixId}
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground"
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}
