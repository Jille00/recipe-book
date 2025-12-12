"use client";

import { useState, useMemo } from "react";
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
import type { RecipeWithDetails } from "@/types/recipe";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Timer,
  Users,
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
import {
  convertUnit,
  convertTemperatureInText,
  isRecognizedUnit,
} from "@/lib/utils/unit-conversion";

interface RecipeDetailProps {
  recipe: RecipeWithDetails;
  isOwner?: boolean;
  isPublicView?: boolean;
  initialFavorited?: boolean;
}

export function RecipeDetail({
  recipe,
  isOwner = false,
  isPublicView = false,
  initialFavorited = false,
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

  const { unitSystem } = useRecipeUnitSystem(recipe.id);

  const totalTime =
    (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  // Convert ingredients based on unit preference
  const convertedIngredients = useMemo(() => {
    return recipe.ingredients.map((ingredient) => {
      if (!ingredient.amount || !ingredient.unit) {
        return {
          ...ingredient,
          converted: null,
        };
      }

      // Check if unit is recognized
      if (!isRecognizedUnit(ingredient.unit)) {
        return {
          ...ingredient,
          converted: null,
        };
      }

      const result = convertUnit(
        ingredient.amount,
        ingredient.unit,
        unitSystem
      );
      return {
        ...ingredient,
        converted: result.wasConverted ? result : null,
      };
    });
  }, [recipe.ingredients, unitSystem]);

  // Convert temperatures in instructions
  const convertedInstructions = useMemo(() => {
    return recipe.instructions.map((instruction) => ({
      ...instruction,
      convertedText: convertTemperatureInText(instruction.text, unitSystem),
    }));
  }, [recipe.instructions, unitSystem]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/recipes");
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
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
      const data = await res.json();
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl tracking-tight">
              {recipe.title}
            </h1>
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
              {recipe.isPublic && (
                <Badge variant="secondary">
                  <Share2 className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!isPublicView && (
              <FavoriteButton
                recipeId={recipe.id}
                initialFavorited={initialFavorited ?? recipe.isFavorited ?? false}
                variant="button"
              />
            )}
            <UnitToggle recipeId={recipe.id} />
            {isOwner && (
              <>
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
              </>
            )}
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
        {recipe.prepTimeMinutes && (
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
        {recipe.cookTimeMinutes && (
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
          <Card className="text-center">
            <CardContent className="py-4">
              <div className="flex justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">
                {recipe.servings}
              </p>
              <p className="text-xs text-muted-foreground">Servings</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Nutrition */}
      {recipe.nutrition && (
        <Card className="mb-8 p-0">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Apple className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Nutrition</CardTitle>
                <CardDescription>Estimated values per serving</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <NutritionDisplay
              nutrition={recipe.nutrition}
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
                {convertedIngredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/50 focus:ring-offset-0"
                    />
                    <span className="text-muted-foreground">
                      {ingredient.converted ? (
                        <>
                          <span className="font-medium text-foreground">
                            {ingredient.converted.displayAmount}{" "}
                            {ingredient.converted.unit}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground/70">
                            ({ingredient.amount} {ingredient.unit})
                          </span>{" "}
                        </>
                      ) : (
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
                    </span>
                  </li>
                ))}
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
