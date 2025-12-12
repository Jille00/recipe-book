"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import type { RecipeWithDetails } from "@/types/recipe";

interface RecipeDetailProps {
  recipe: RecipeWithDetails;
  isOwner?: boolean;
  isPublicView?: boolean;
}

export function RecipeDetail({ recipe, isOwner = false, isPublicView = false }: RecipeDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(
    recipe.shareToken ? `${process.env.NEXT_PUBLIC_APP_URL}/r/${recipe.shareToken}` : null
  );
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/recipes/${recipe.id}/share`, { method: "POST" });
      const data = await res.json();
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      console.error("Error generating share link:", error);
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

  return (
    <article className="mx-auto max-w-4xl">
      {/* Header */}
      <header className="mb-8">
        {!isPublicView && (
          <div className="mb-4">
            <Link
              href="/recipes"
              className="text-sm text-neutral-500 hover:text-orange-600 dark:text-neutral-400"
            >
              ← Back to recipes
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
                {recipe.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {recipe.categoryName && (
                <Badge variant="default">{recipe.categoryName}</Badge>
              )}
              {recipe.difficulty && (
                <Badge
                  variant={
                    recipe.difficulty === "easy"
                      ? "success"
                      : recipe.difficulty === "medium"
                      ? "warning"
                      : "danger"
                  }
                >
                  {recipe.difficulty}
                </Badge>
              )}
              {recipe.isPublic && <Badge variant="secondary">Public</Badge>}
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Link href={`/recipes/${recipe.slug}/edit`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Image */}
      {recipe.imageUrl && (
        <div className="relative mb-8 aspect-video overflow-hidden rounded-xl">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Meta */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {recipe.prepTimeMinutes && (
          <div className="rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <p className="text-2xl font-bold text-orange-600">{recipe.prepTimeMinutes}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Prep (min)</p>
          </div>
        )}
        {recipe.cookTimeMinutes && (
          <div className="rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <p className="text-2xl font-bold text-orange-600">{recipe.cookTimeMinutes}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Cook (min)</p>
          </div>
        )}
        {totalTime > 0 && (
          <div className="rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <p className="text-2xl font-bold text-orange-600">{totalTime}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total (min)</p>
          </div>
        )}
        {recipe.servings && (
          <div className="rounded-lg border border-neutral-200 p-4 text-center dark:border-neutral-800">
            <p className="text-2xl font-bold text-orange-600">{recipe.servings}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Servings</p>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Ingredients */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {ingredient.amount && (
                      <span className="font-medium">{ingredient.amount} </span>
                    )}
                    {ingredient.unit && <span>{ingredient.unit} </span>}
                    {ingredient.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Instructions */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
            Instructions
          </h2>
          <ol className="space-y-6">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  {index + 1}
                </span>
                <p className="pt-1 text-neutral-700 dark:text-neutral-300">
                  {instruction.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Share Section */}
      {isOwner && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            Share this recipe
          </h2>
          {shareUrl ? (
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <Button onClick={handleCopyLink} variant="outline">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          ) : (
            <Button onClick={handleShare} isLoading={isSharing}>
              Generate Share Link
            </Button>
          )}
        </div>
      )}

      {/* Author (public view) */}
      {isPublicView && recipe.authorName && (
        <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <p className="text-neutral-600 dark:text-neutral-400">
            Recipe by <span className="font-medium">{recipe.authorName}</span>
          </p>
        </div>
      )}
    </article>
  );
}
