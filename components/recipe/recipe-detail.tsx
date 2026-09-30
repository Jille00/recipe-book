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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { AddToShoppingList } from "./add-to-shopping-list";
import { ServingsSelector } from "./servings-selector";
import { RatingsCommentsSection } from "./ratings-comments-section";
import { TagPillLink } from "./tag-pill-link";
import { SaveToCollection } from "./save-to-collection";
import { useSaveCopy } from "./save-copy-button";
import { AdaptedFrom, type AdaptedFromInfo } from "./adapted-from";
import { CookMode } from "./cook-mode";
import { printRecipe } from "./print-button";
import { DelftWall } from "@/components/delft/delft-tile";
import { tagPath } from "@/lib/tag-pages";
import type { RecipeWithDetails, RatingStats } from "@/types/recipe";
import type { CommentWithUser } from "@/lib/db/queries/comments";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Share2,
  Globe,
  Link2,
  Loader2,
  AlertTriangle,
  Copy,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { useRecipeUnitSystem } from "@/hooks/use-unit-preferences";
import { profilePath } from "@/lib/handle";
import { useRecipeScaling } from "@/hooks/use-recipe-scaling";
import { recipePath, recipeEditPath } from "@/lib/recipe-url";
import { nutritionBasisKey } from "@/lib/utils/nutrition-inputs";
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
  /** Shown as pills linking to each tag's page. */
  tags?: { id: string; name: string; slug: string }[];
  /** Set for a copy whose original the viewer may open. */
  adaptedFrom?: AdaptedFromInfo | null;
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
  tags = [],
  adaptedFrom = null,
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
  // Nutrition saved with a fingerprint of its ingredients and servings (see
  // recipe-form) can tell when the recipe changed after it was calculated.
  const nutritionOutdated =
    !!nutrition?.basisKey &&
    nutrition.basisKey !== nutritionBasisKey(recipe.ingredients, recipe.servings);

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

  const tagSlugs = tags.map((tag) => tag.slug);
  // Tags come alphabetically; the first one is the recipe's category line.
  const category = tags[0];
  const canFavorite =
    isAuthenticated &&
    // Favorites only list public recipes and your own, so an unlisted
    // recipe someone sent you can't be saved there - but one favorited
    // while it was public must stay removable after it becomes link-only.
    (recipe.isPublic || isOwner || (initialFavorited ?? recipe.isFavorited));
  const hasMeta =
    recipe.prepTimeMinutes != null ||
    recipe.cookTimeMinutes != null ||
    totalTime > 0 ||
    !!recipe.servings ||
    !!recipe.difficulty;

  return (
    <article className="mx-auto max-w-4xl">
      {/* Owner tools: set apart from the cooking actions, and quiet */}
      {isOwner && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/recipes"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Your recipes
          </Link>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="mr-2">
              {recipe.isPublic ? (
                <>
                  <Globe aria-hidden="true" />
                  Public
                </>
              ) : (
                <>
                  <Link2 aria-hidden="true" />
                  Anyone with the link
                </>
              )}
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <Link href={recipeEditPath(recipe)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            {/* Set apart from Edit so it is hard to hit by accident; the
                dialog still asks before deleting. */}
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
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
                  <AlertDialogTitle className="font-display text-xl font-normal">
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
                    Keep recipe
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={buttonVariants({ variant: "destructive" })}
                  >
                    {isDeleting && (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    {isDeleting ? "Deleting…" : "Delete recipe"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Title block */}
      <header className="space-y-4">
        {category && (
          <p className="print:hidden">
            <Link
              href={tagPath(category.slug)}
              className="text-xs font-medium uppercase tracking-[0.06em] text-primary underline-offset-4 hover:underline"
            >
              {category.name}
            </Link>
          </p>
        )}
        <h1 className="text-balance text-[2.25rem] leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[3.5rem] lg:text-[4rem]">
          {recipe.title}
        </h1>
        {!isOwner && recipe.authorName && (
          <p className="text-sm text-muted-foreground">
            By{" "}
            {recipe.authorHandle ? (
              <Link
                href={profilePath(recipe.authorHandle)}
                className="font-medium text-foreground underline decoration-muted-foreground/60 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
              >
                {recipe.authorName}
              </Link>
            ) : (
              <span className="font-medium text-foreground">
                {recipe.authorName}
              </span>
            )}
          </p>
        )}
        {adaptedFrom && <AdaptedFrom origin={adaptedFrom} />}
        {recipe.description && (
          <p className="max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
            {recipe.description}
          </p>
        )}
        {/* The first tag is already the eyebrow above the title. */}
        {tags.length > 1 && (
          <ul aria-label="More tags" className="flex flex-wrap gap-2 print:hidden">
            {tags.slice(1).map((tag) => (
              <li key={tag.id}>
                <TagPillLink tag={tag} />
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* Actions: Cook is the one main action; the rest stay quiet, and
          below `sm` they shrink to icons (or move into More) so the row
          stays on one line. */}
      <div className="mt-6 flex items-center gap-2 print:hidden">
        <CookMode
          recipeId={recipe.id}
          code={recipe.code}
          tags={tagSlugs}
          title={recipe.title}
          ingredients={convertedIngredients}
          instructions={convertedInstructions}
        />
        {canFavorite && (
          <FavoriteButton
            recipeId={recipe.id}
            initialFavorited={initialFavorited ?? recipe.isFavorited ?? false}
            variant="button"
            compact
          />
        )}
        <AddToShoppingList
          recipeId={recipe.id}
          code={recipe.code}
          ingredients={convertedIngredients}
          isAuthenticated={isAuthenticated}
          compact
        />
        <SaveToCollection
          recipeId={recipe.id}
          code={recipe.code}
          isAuthenticated={isAuthenticated}
          isListable={Boolean(recipe.isPublic) || isOwner}
          compact
        />
        <Button variant="outline" onClick={handleShare} className="max-sm:hidden">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </Button>
        <MoreActions
          recipeId={recipe.id}
          code={recipe.code}
          isAuthenticated={isAuthenticated}
          canCopy={!isOwner}
          onShare={handleShare}
        />
      </div>

      {/* Hero: the photo, or the recipe's own tile wall */}
      <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:aspect-[16/9] print:hidden">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            // The article is capped at max-w-4xl (896px).
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        ) : (
          <DelftWall seed={recipe.code} tags={tagSlugs} tileSize={136} />
        )}
      </div>

      {/* Meta strip */}
      {hasMeta && (
        <dl className="mt-8 grid grid-cols-3 gap-x-4 gap-y-5 border-y border-border py-5 sm:flex sm:flex-wrap sm:gap-x-10">
          {recipe.prepTimeMinutes != null && (
            <MetaItem label="Prep">
              <Minutes value={recipe.prepTimeMinutes} />
            </MetaItem>
          )}
          {recipe.cookTimeMinutes != null && (
            <MetaItem label="Cook">
              <Minutes value={recipe.cookTimeMinutes} />
            </MetaItem>
          )}
          {totalTime > 0 && (
            <MetaItem label="Total">
              <Minutes value={totalTime} />
            </MetaItem>
          )}
          {recipe.difficulty && (
            <MetaItem label="Difficulty">
              <Badge
                variant={getDifficultyVariant(recipe.difficulty)}
                className="mt-0.5 capitalize"
              >
                {recipe.difficulty}
              </Badge>
            </MetaItem>
          )}
          {recipe.servings && (
            <ServingsSelector
              className="col-span-2"
              scaledServings={scaledServings}
              originalServings={originalServings}
              onIncrement={increment}
              onDecrement={decrement}
              onReset={resetToOriginal}
              maxServings={maxServings}
            />
          )}
        </dl>
      )}

      <div className="mt-8 grid gap-10 sm:mt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        {/* Ingredients */}
        <section aria-labelledby={`${ingredientFieldId}-heading`}>
          <Card className="gap-0 py-0 lg:sticky lg:top-24">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2
                  id={`${ingredientFieldId}-heading`}
                  className="text-[1.75rem] leading-[1.2] text-foreground"
                >
                  Ingredients
                </h2>
                <div className="print:hidden">
                  <UnitToggle recipeId={recipe.id} />
                </div>
              </div>
              <ul className="grid grid-cols-[auto_fit-content(7.5rem)_1fr] gap-x-3">
                {convertedIngredients.map((ingredient, index) => {
                  const ingredientKey = ingredient.id || `index-${index}`;
                  const checkboxId = `${ingredientFieldId}-${ingredientKey}`;
                  const isChecked = checkedIngredients[ingredientKey] ?? false;
                  const { amount, hint } = describeIngredientAmount(ingredient);

                  return (
                    <li
                      key={ingredientKey}
                      className="col-span-3 grid grid-cols-subgrid items-start border-b border-border py-2.5 last:border-b-0"
                    >
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
                        className="mt-1 size-4 cursor-pointer rounded accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                      <label
                        htmlFor={checkboxId}
                        className={cn(
                          // col-start-2: keeps the columns when print hides the checkbox
                          "col-span-2 col-start-2 grid cursor-pointer grid-cols-subgrid text-foreground transition-opacity",
                          isChecked && "line-through opacity-60"
                        )}
                      >
                        <span className="text-right font-mono text-sm tabular leading-6 text-foreground">
                          {amount}
                        </span>
                        <span className="leading-6">
                          {ingredient.text}
                          {hint && (
                            <span className="ml-1.5 whitespace-nowrap font-mono text-xs tabular text-muted-foreground">
                              {hint}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Method: a numbered sequence */}
        <section aria-labelledby={`${ingredientFieldId}-method`}>
          <h2
            id={`${ingredientFieldId}-method`}
            className="mb-6 text-[1.75rem] leading-[1.2] text-foreground"
          >
            Method
          </h2>
          <ol className="space-y-7">
            {convertedInstructions.map((instruction, index) => (
              <li key={index} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
                <span className="font-display text-[2rem] leading-[1.1] text-primary">
                  {index + 1}
                </span>
                <p className="max-w-[65ch] pt-1 leading-[1.7] text-foreground">
                  {instruction.convertedText}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Nutrition */}
      {nutrition && (
        <section
          aria-labelledby={`${ingredientFieldId}-nutrition`}
          className="mt-12 sm:mt-16 print:hidden"
        >
          <Card className="gap-5">
            <CardHeader>
              <h2
                id={`${ingredientFieldId}-nutrition`}
                className="text-[1.75rem] leading-[1.2] text-foreground"
              >
                Nutrition
              </h2>
              <CardDescription>Estimated, per serving</CardDescription>
            </CardHeader>
            <CardContent>
              {nutritionOutdated && (
                <div className="mb-5 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning dark:border-warning-light/30 dark:bg-warning-light/15 dark:text-warning-light">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    These numbers were calculated before the ingredients or
                    servings last changed, so they may be off.
                    {isOwner && (
                      <>
                        {" "}
                        <Link
                          href={recipeEditPath(recipe)}
                          className="font-medium underline underline-offset-4"
                        >
                          Recalculate them in the editor
                        </Link>
                        .
                      </>
                    )}
                  </p>
                </div>
              )}
              <NutritionDisplay
                nutrition={nutrition}
                // Values are per serving of the recipe as written, so they
                // don't follow the servings selector.
                servings={recipe.servings}
                isEditable={false}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Ratings & comments */}
      {/* Anyone viewing this page holds its link, so everyone can rate and
          comment. The code proves that to the API for unlisted recipes. */}
      {initialRatingStats && (
        <div className="mt-12 sm:mt-16 print:hidden">
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
    </article>
  );
}

/** One cell of the meta strip: a small uppercase label over its value. */
function MetaItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

/** "75" as "1 h 15 min", numbers in Plex Mono. */
function Minutes({ value }: { value: number }) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  const parts: Array<[number, string]> = [];
  if (hours > 0) parts.push([hours, "h"]);
  if (minutes > 0 || hours === 0) parts.push([minutes, "min"]);
  return (
    <span className="whitespace-nowrap">
      {parts.map(([amount, unit], index) => (
        <span key={unit}>
          {index > 0 && " "}
          <span className="font-mono text-xl tabular text-foreground">{amount}</span>
          <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
        </span>
      ))}
    </span>
  );
}

interface DisplayIngredient {
  amount?: string;
  unit?: string;
  scaledAmount?: string | null;
  originalAmount?: string;
  wasScaled?: boolean;
  converted: { displayAmount: string; unit: string } | null;
}

/**
 * The amount column (converted and/or scaled when that applies) and, next to
 * the name, what the recipe itself says when the amount was changed.
 */
function describeIngredientAmount(ingredient: DisplayIngredient): {
  amount: string;
  hint: string | null;
} {
  const join = (...parts: Array<string | null | undefined>) =>
    parts.filter(Boolean).join(" ");

  if (ingredient.converted) {
    // Converted (and possibly scaled): the same amount in the recipe's unit.
    const own =
      (ingredient.wasScaled && ingredient.scaledAmount) ||
      ingredient.originalAmount ||
      ingredient.amount;
    return {
      amount: join(ingredient.converted.displayAmount, ingredient.converted.unit),
      hint: `(${join(own, ingredient.unit)})`,
    };
  }
  if (ingredient.wasScaled && ingredient.scaledAmount) {
    return {
      amount: join(ingredient.scaledAmount, ingredient.unit),
      // Countable items round back to their original amount at small scale
      // factors; "1 (was 1)" is just noise, so only note a real change.
      hint:
        ingredient.scaledAmount !== ingredient.originalAmount
          ? `(was ${ingredient.originalAmount})`
          : null,
    };
  }
  return { amount: join(ingredient.amount, ingredient.unit), hint: null };
}

/**
 * The quieter actions: Share (below `sm`, where it doesn't fit the row),
 * Save a copy and Print.
 */
function MoreActions({
  recipeId,
  code,
  isAuthenticated,
  canCopy,
  onShare,
}: {
  recipeId: string;
  code: string;
  isAuthenticated: boolean;
  canCopy: boolean;
  onShare: () => void;
}) {
  const { isCopying, saveCopy } = useSaveCopy({ recipeId, code, isAuthenticated });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onSelect={onShare} className="min-h-11 sm:hidden">
          <Share2 aria-hidden="true" />
          Share
        </DropdownMenuItem>
        {canCopy && (
          <DropdownMenuItem
            className="min-h-11"
            disabled={isCopying}
            onSelect={(event) => {
              // Stay open, showing progress, until the editor opens.
              event.preventDefault();
              void saveCopy();
            }}
          >
            {isCopying ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {isCopying ? "Saving copy…" : "Save a copy"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={printRecipe} className="min-h-11">
          <Printer aria-hidden="true" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
