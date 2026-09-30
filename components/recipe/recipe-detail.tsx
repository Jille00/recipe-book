"use client";

import { useState, useMemo, useEffect, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { UnitToggle } from "./unit-toggle";
import { NutritionDisplay } from "./nutrition-display";
import { FavoriteButton } from "./favorite-button";
import { ServingsSelector } from "./servings-selector";
import { RatingsCommentsSection } from "./ratings-comments-section";
import type { RecipeWithDetails, RatingStats } from "@/types/recipe";
import type { CommentWithUser } from "@/lib/db/queries/comments";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Timer,
  ChefHat,
  Pencil,
  Trash2,
  Share2,
  Globe,
  Link2,
  Utensils,
  Apple,
  Loader2,
} from "lucide-react";
import { useRecipeUnitSystem } from "@/hooks/use-unit-preferences";
import { useRecipeScaling } from "@/hooks/use-recipe-scaling";
import { recipePath, recipeEditPath } from "@/lib/recipe-url";
import {
  convertUnit,
  convertTemperatureInText,
  isRecognizedUnit,
} from "@/lib/utils/unit-conversion";
import { scaleIngredients } from "@/lib/utils/recipe-scaling";
import { cn } from "@/lib/utils";

interface RecipeDetailProps {
  recipe: RecipeWithDetails;
  isOwner?: boolean;
  initialFavorited?: boolean;
  currentUserId?: string;
  isAuthenticated?: boolean;
  initialRatingStats?: RatingStats;
  initialUserRating?: number | null;
  initialComments?: CommentWithUser[];
  initialCommentTotal?: number;
}

export function RecipeDetail({
  recipe,
  isOwner = false,
  // No default: `false` here would shadow the `?? recipe.isFavorited` fallback.
  initialFavorited,
  currentUserId,
  isAuthenticated = false,
  initialRatingStats,
  initialUserRating,
  initialComments = [],
  initialCommentTotal = 0,
}: RecipeDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Check-off state keyed by ingredient identity (not list position), so a tick
  // always belongs to the ingredient it was put on.
  const [checkedIngredients, setCheckedIngredients] = useState<
    Record<string, boolean>
  >({});
  const ingredientFieldId = useId();

  const { unitSystem } = useRecipeUnitSystem(recipe.id);

  // Scaling state
  const {
    scaledServings,
    originalServings,
    scaleFactor,
    increment,
    decrement,
    resetToOriginal,
    maxServings,
  } = useRecipeScaling(recipe.servings || 1);

  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  // Scale and convert ingredients based on servings and unit preference
  const convertedIngredients = useMemo(() => {
    // First, scale the ingredients
    const scaled = scaleIngredients(recipe.ingredients, scaleFactor);

    // Then apply unit conversion
    return scaled.map((ingredient) => {
      // Use scaled amount if available, otherwise original
      const amountToConvert = ingredient.scaledAmount || ingredient.amount;

      if (!amountToConvert || !ingredient.unit) {
        return {
          ...ingredient,
          converted: null,
        };
      }

      // Check if unit is recognized for conversion
      if (!isRecognizedUnit(ingredient.unit)) {
        return {
          ...ingredient,
          converted: null,
        };
      }

      const result = convertUnit(
        amountToConvert,
        ingredient.unit,
        unitSystem
      );
      return {
        ...ingredient,
        converted: result.wasConverted ? result : null,
      };
    });
  }, [recipe.ingredients, scaleFactor, unitSystem]);

  // Nutrition values are per serving, so they don't need to be scaled
  const nutrition = recipe.nutrition;

  // The measured amounts change when the recipe is rescaled, so previously
  // ticked ingredients no longer reflect what has actually been measured out.
  useEffect(() => {
    setCheckedIngredients({});
  }, [scaleFactor]);

  // Convert temperatures in instructions
  const convertedInstructions = useMemo(() => {
    return recipe.instructions.map((instruction) => ({
      ...instruction,
      convertedText: convertTemperatureInText(instruction.text, unitSystem),
    }));
  }, [recipe.instructions, unitSystem]);

  /**
   * Pull an error message out of a failed response without assuming it is
   * JSON - an expired session, a 413 or a gateway timeout often answer with
   * HTML, and `response.json()` would throw "Unexpected token '<'".
   */
  const readErrorMessage = async (res: Response, fallback: string) => {
    if (res.status === 401 || res.status === 403) {
      return "Your session has expired. Please sign in again.";
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const data = await res.json();
        if (data?.error) return String(data.error);
      } catch {
        // Fall through to the generic message
      }
    }
    return `${fallback} (${res.status})`;
  };

  const handleDelete = async (event: React.MouseEvent) => {
    // Keep the dialog open, showing progress, until the request settles.
    event.preventDefault();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to delete recipe"));
      }

      toast.success("Recipe deleted");
      // Stay "deleting" while the next page loads: the recipe is gone, and a
      // second click would only report that it can't be found.
      router.push("/recipes");
      router.refresh();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete recipe"
      );
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  // Every recipe has one address and it is the one in the address bar, so
  // sharing needs no setup: hand that address to the native share sheet (which
  // is how people send links on a phone) or copy it.
  const handleShare = async () => {
    const url = `${window.location.origin}${recipePath(recipe)}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: recipe.title, url });
        return;
      } catch (error) {
        // Dismissing the sheet is not an error worth reporting.
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Otherwise fall through to copying.
      }
    }

    if (!navigator.clipboard?.writeText) {
      toast.error("Copying isn't available here. Copy the link from the address bar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        recipe.isPublic || !isOwner
          ? "Link copied"
          : "Link copied. Anyone you send it to can open this recipe."
      );
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  const getDifficultyVariant = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "danger";
      default:
        return "outline";
    }
  };

  return (
    <article className="mx-auto max-w-4xl">
      {/* Header */}
      <header className="mb-8">
        {isOwner && (
          <div className="mb-6">
            <Link
              href="/recipes"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to recipes
            </Link>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl tracking-tight">
              {recipe.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </Button>
              {isOwner && (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href={recipeEditPath(recipe)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>
                  {/* Set apart from Edit, and quieter than it, so it is hard to
                      hit by accident; the dialog still asks before deleting. */}
                  <span aria-hidden="true" className="mx-2 h-6 w-px bg-border" />
                  <AlertDialog
                    open={confirmDeleteOpen}
                    onOpenChange={(open) => {
                      // Don't let Escape or Cancel close it mid-request.
                      if (!isDeleting) setConfirmDeleteOpen(open);
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display">
                          Delete &ldquo;{recipe.title}&rdquo;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          The recipe, its photo, ratings and comments will be
                          removed for good, and links to it will stop working.
                          This can&apos;t be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                          Keep Recipe
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className={buttonVariants({ variant: "destructive" })}
                        >
                          {isDeleting && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          )}
                          {isDeleting ? "Deleting..." : "Delete Recipe"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
          {recipe.description && (
            <p className="text-lg text-muted-foreground max-w-2xl">
              {recipe.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {recipe.difficulty && (
              <Badge
                variant={getDifficultyVariant(recipe.difficulty)}
                className="capitalize"
              >
                {recipe.difficulty}
              </Badge>
            )}
            {isOwner && (
              <Badge variant="secondary">
                {recipe.isPublic ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" aria-hidden="true" />
                    Public
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3 mr-1" aria-hidden="true" />
                    Anyone with the link
                  </>
                )}
              </Badge>
            )}
            {/* Favorites only list public recipes and your own, so an unlisted
                recipe someone sent you can't be saved there. */}
            {/* ...but a recipe favorited while it was public must stay
                removable after it becomes link-only. */}
            {isAuthenticated &&
              (recipe.isPublic || isOwner || (initialFavorited ?? recipe.isFavorited)) && (
              <FavoriteButton
                recipeId={recipe.id}
                initialFavorited={initialFavorited ?? recipe.isFavorited ?? false}
                variant="button"
              />
            )}
            <UnitToggle recipeId={recipe.id} />
          </div>
        </div>
      </header>

      {/* Image */}
      {recipe.imageUrl ? (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl border border-border">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            // The article is capped at max-w-4xl (896px).
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        </div>
      ) : (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl bg-muted flex items-center justify-center">
          <ChefHat className="h-16 w-16 text-muted-foreground/30" aria-hidden="true" />
        </div>
      )}

      {/* Meta Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recipe.prepTimeMinutes != null && (
          <Card className="text-center">
            <CardContent className="py-4">
              <div className="flex justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">
                {recipe.prepTimeMinutes}
              </p>
              <p className="text-xs text-muted-foreground">Prep (min)</p>
            </CardContent>
          </Card>
        )}
        {recipe.cookTimeMinutes != null && (
          <Card className="text-center">
            <CardContent className="py-4">
              <div className="flex justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Timer className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">
                {recipe.cookTimeMinutes}
              </p>
              <p className="text-xs text-muted-foreground">Cook (min)</p>
            </CardContent>
          </Card>
        )}
        {totalTime > 0 && (
          <Card className="text-center">
            <CardContent className="py-4">
              <div className="flex justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Utensils className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">
                {totalTime}
              </p>
              <p className="text-xs text-muted-foreground">Total (min)</p>
            </CardContent>
          </Card>
        )}
        {recipe.servings && (
          <ServingsSelector
            scaledServings={scaledServings}
            originalServings={originalServings}
            onIncrement={increment}
            onDecrement={decrement}
            onReset={resetToOriginal}
            maxServings={maxServings}
          />
        )}
      </div>

      {/* Nutrition */}
      {nutrition && (
        <Card className="mb-8 p-0">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Apple className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display leading-none font-semibold">
                  Nutrition
                </h2>
                <CardDescription>
                  Estimated values per serving
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <NutritionDisplay
              nutrition={nutrition}
              // Values are per serving of the recipe as written, so they
              // don't follow the servings selector.
              servings={recipe.servings}
              isEditable={false}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Ingredients */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                Ingredients
              </h2>
              <ul className="space-y-3">
                {convertedIngredients.map((ingredient, index) => {
                  const ingredientKey = ingredient.id || `index-${index}`;
                  const checkboxId = `${ingredientFieldId}-${ingredientKey}`;
                  const isChecked = checkedIngredients[ingredientKey] ?? false;

                  return (
                  <li key={ingredientKey} className="flex items-start gap-3">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setCheckedIngredients((prev) => ({
                          ...prev,
                          [ingredientKey]: e.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/50 focus:ring-offset-0"
                    />
                    <label
                      htmlFor={checkboxId}
                      className={cn(
                        "cursor-pointer text-foreground",
                        isChecked && "line-through opacity-60"
                      )}
                    >
                      {ingredient.converted ? (
                        // Unit conversion applied (and possibly scaling)
                        <>
                          <span className="font-medium text-foreground">
                            {ingredient.converted.displayAmount}{" "}
                            {ingredient.converted.unit}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">
                            {/* The same scaled amount in the recipe's own unit. */}
                            (
                            {(ingredient.wasScaled && ingredient.scaledAmount) ||
                              ingredient.originalAmount ||
                              ingredient.amount}{" "}
                            {ingredient.unit})
                          </span>{" "}
                        </>
                      ) : ingredient.wasScaled && ingredient.scaledAmount ? (
                        // Scaling applied but no unit conversion
                        <>
                          <span className="font-medium text-foreground">
                            {ingredient.scaledAmount}{" "}
                          </span>
                          {ingredient.unit && <span>{ingredient.unit} </span>}
                          {/* Countable items round back to their original
                              amount at small scale factors; "1 (was 1)" is
                              just noise, so only note a real change. */}
                          {ingredient.scaledAmount !==
                            ingredient.originalAmount && (
                            <span className="text-xs text-muted-foreground">
                              (was {ingredient.originalAmount}){" "}
                            </span>
                          )}
                        </>
                      ) : (
                        // No conversion or scaling
                        <>
                          {ingredient.amount && (
                            <span className="font-medium text-foreground">
                              {ingredient.amount}{" "}
                            </span>
                          )}
                          {ingredient.unit && <span>{ingredient.unit} </span>}
                        </>
                      )}
                      {ingredient.text}
                    </label>
                  </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-foreground mb-6">
            Instructions
          </h2>
          <ol className="space-y-6">
            {convertedInstructions.map((instruction, index) => (
              <li key={index} className="flex gap-4">
                {/* Step number: Fraunces 600, 24px/24px (style guide). */}
                <span
                  className="w-8 shrink-0 pt-0.5 text-right font-display text-2xl leading-6 font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <p className="text-foreground leading-relaxed">
                  {instruction.convertedText}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Ratings & Comments Section */}
      {/* Anyone viewing this page holds its link, so everyone can rate and
          comment. The code proves that to the API for unlisted recipes. */}
      {initialRatingStats && (
        <div className="mt-8">
          <RatingsCommentsSection
            code={recipe.code}
            recipeId={recipe.id}
            recipeOwnerId={recipe.userId}
            initialRatingStats={initialRatingStats}
            initialUserRating={initialUserRating}
            initialComments={initialComments}
            initialCommentTotal={initialCommentTotal}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
          />
        </div>
      )}

      {/* Author, for everyone but the author */}
      {!isOwner && recipe.authorName && (
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-muted-foreground">
            Recipe by{" "}
            <span className="font-medium text-foreground">
              {recipe.authorName}
            </span>
          </p>
        </div>
      )}
    </article>
  );
}
