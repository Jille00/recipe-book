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
  CardTitle,
  CardDescription,
  Input,
} from "@/components/ui";
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
  Copy,
  Check,
  Utensils,
  Apple,
} from "lucide-react";
import { useRecipeUnitSystem } from "@/hooks/use-unit-preferences";
import { useRecipeScaling } from "@/hooks/use-recipe-scaling";
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
  isPublicView?: boolean;
  /** The share-link token this page was opened with, when applicable. */
  shareToken?: string;
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
  isPublicView = false,
  shareToken,
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
  const [shareUrl, setShareUrl] = useState<string | null>(
    recipe.shareToken && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/r/${recipe.shareToken}`
      : null
  );
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to delete recipe"));
      }

      toast.success("Recipe deleted");
      router.push("/recipes");
      router.refresh();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete recipe"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/share`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to generate share link")
        );
      }

      const data = await res.json();
      if (!data?.shareUrl) {
        throw new Error("The server did not return a share link");
      }
      setShareUrl(data.shareUrl);
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate share link"
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    // `navigator.clipboard` is undefined on non-secure origins and can reject
    // when the permission is denied, so both cases need handling.
    if (!navigator.clipboard?.writeText) {
      toast.error("Copying is not available here. Please copy the link manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying share link:", error);
      toast.error("Could not copy the link. Please copy it manually.");
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
        {!isPublicView && (
          <div className="mb-6">
            <Link
              href="/recipes"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to recipes
            </Link>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl tracking-tight">
              {recipe.title}
            </h1>
            {isOwner && (
              <div className="flex gap-2">
                <Link href={`/recipes/${recipe.slug}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  {!isDeleting && <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </div>
            )}
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
            {isOwner && recipe.isPublic && (
              <Badge variant="secondary">
                <Share2 className="h-3 w-3 mr-1" />
                Public
              </Badge>
            )}
            {isAuthenticated && (
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
            priority
          />
        </div>
      ) : (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-2xl bg-muted flex items-center justify-center">
          <ChefHat className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Meta Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recipe.prepTimeMinutes != null && (
          <Card className="text-center">
            <CardContent className="py-4">
              <div className="flex justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
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
                  <Timer className="h-5 w-5 text-primary" />
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
                  <Utensils className="h-5 w-5 text-primary" />
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
          />
        )}
      </div>

      {/* Nutrition */}
      {nutrition && (
        <Card className="mb-8 p-0">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Apple className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Nutrition</CardTitle>
                <CardDescription>
                  Estimated values per serving
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <NutritionDisplay
              nutrition={nutrition}
              servings={scaledServings}
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
                        "cursor-pointer text-muted-foreground",
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
                          <span className="text-xs text-muted-foreground/70">
                            ({ingredient.originalAmount || ingredient.amount} {ingredient.unit})
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
                            <span className="text-xs text-muted-foreground/70">
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
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="pt-1 text-muted-foreground leading-relaxed">
                  {instruction.convertedText}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Share Section */}
      {isOwner && (
        <Card className="mt-8 bg-secondary/30">
          <CardContent className="p-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share this recipe
            </h2>
            {shareUrl ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-background"
                />
                <Button onClick={handleCopyLink} variant="outline">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={handleShare} isLoading={isSharing}>
                {!isSharing && <Share2 className="h-4 w-4" />}
                Generate Share Link
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ratings & Comments Section */}
      {(recipe.isPublic || isOwner) && initialRatingStats && (
        <div className="mt-8">
          <RatingsCommentsSection
            shareToken={shareToken}
            recipeId={recipe.id}
            recipeOwnerId={recipe.userId}
            initialRatingStats={initialRatingStats}
            initialUserRating={initialUserRating}
            initialComments={initialComments}
            initialCommentTotal={initialCommentTotal}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            isPublicView={isPublicView}
          />
        </div>
      )}

      {/* Author (public view) */}
      {isPublicView && recipe.authorName && (
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
