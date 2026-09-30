"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { FavoriteChangeProvider } from "@/components/recipe/favorite-button";
import type { RecipeWithDetails } from "@/types/recipe";

interface FavoritesGridProps {
  recipes: RecipeWithDetails[];
  currentUserId: string;
  /** Shown once the last favorite has been removed. */
  emptyState: React.ReactNode;
}

const EMPTY = "empty";

/**
 * The favorites list, kept in sync with the heart buttons on its cards: a
 * recipe that is unfavorited here leaves the list straight away instead of
 * lingering until the next visit.
 */
export function FavoritesGrid({
  recipes: initialRecipes,
  currentUserId,
  emptyState,
}: FavoritesGridProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const gridRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  // Where focus goes after a card is removed: a recipe id, or the empty state.
  const focusTargetRef = useRef<string | null>(null);

  const handleFavoriteChange = useCallback(
    (recipeId: string, favorited: boolean) => {
      if (favorited) return;

      const index = recipes.findIndex((recipe) => recipe.id === recipeId);
      if (index === -1) return;
      const next = recipes.filter((recipe) => recipe.id !== recipeId);

      // The focused heart disappears with its card. Hand focus to the heart of
      // the card that takes its place (or the one before it), or to the empty
      // state, so keyboard and screen reader users keep their place.
      focusTargetRef.current = (next[index] ?? next[index - 1])?.id ?? EMPTY;
      setRecipes(next);
      toast.success("Removed from favorites");
    },
    [recipes]
  );

  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target) return;
    focusTargetRef.current = null;

    if (target === EMPTY) {
      emptyRef.current?.focus();
      return;
    }
    gridRef.current
      ?.querySelector<HTMLElement>(
        `[data-recipe-id="${CSS.escape(target)}"] button[aria-pressed]`
      )
      ?.focus();
  }, [recipes]);

  if (recipes.length === 0) {
    return (
      <div ref={emptyRef} tabIndex={-1} className="outline-none">
        {emptyState}
      </div>
    );
  }

  return (
    <FavoriteChangeProvider value={handleFavoriteChange}>
      <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <div key={recipe.id} data-recipe-id={recipe.id}>
            <RecipeCard
              recipe={recipe}
              showAuthor={recipe.userId !== currentUserId}
              initialFavorited={true}
            />
          </div>
        ))}
      </div>
    </FavoriteChangeProvider>
  );
}
