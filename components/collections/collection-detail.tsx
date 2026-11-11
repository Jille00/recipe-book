"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { ColourStripes } from "@/components/recipe/recipe-colour";
import { recipeColour } from "@/lib/recipe-colour";
import { EmptyState } from "@/components/page/empty-state";
import { RecipeCard } from "@/components/recipe/recipe-card";
import type { RecipeCardData } from "@/types/recipe";
import { CollectionNameDialog } from "./collection-name-dialog";
import { DeleteCollectionDialog } from "./delete-collection-dialog";
import {
  addToCollectionRequest,
  deleteCollectionRequest,
  removeFromCollectionRequest,
  renameCollectionRequest,
} from "./collections-api";

interface CollectionDetailProps {
  collection: { id: string; name: string };
  recipes: RecipeCardData[];
  currentUserId: string;
}

/** One collection: its name and actions, then its recipes. */
export function CollectionDetail({
  collection,
  recipes: initialRecipes,
  currentUserId,
}: CollectionDetailProps) {
  const router = useRouter();
  const [name, setName] = useState(collection.name);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const recipesRef = useRef(recipes);
  const inFlightRef = useRef(new Set<string>());

  const updateRecipes = (next: RecipeCardData[]) => {
    recipesRef.current = next;
    setRecipes(next);
  };

  // Puts a recipe back where it was (after a failed removal, or on undo).
  const restore = (recipe: RecipeCardData, index: number) => {
    const current = recipesRef.current;
    if (current.some((r) => r.id === recipe.id)) return;
    const next = [...current];
    next.splice(Math.min(index, next.length), 0, recipe);
    updateRecipes(next);
  };

  const handleRemove = async (recipe: RecipeCardData) => {
    if (inFlightRef.current.has(recipe.id)) return;
    const index = recipesRef.current.findIndex((r) => r.id === recipe.id);
    if (index === -1) return;

    inFlightRef.current.add(recipe.id);
    // Optimistic: the card goes now, and comes back if the server refuses.
    updateRecipes(recipesRef.current.filter((r) => r.id !== recipe.id));

    const result = await removeFromCollectionRequest(collection.id, recipe.id);
    inFlightRef.current.delete(recipe.id);

    if (!result.ok) {
      restore(recipe, index);
      toast.error(result.error);
      return;
    }

    toast.success(`Removed ${recipe.title}`, {
      action: {
        label: "Undo",
        onClick: async () => {
          restore(recipe, index);
          const undo = await addToCollectionRequest(collection.id, recipe.id);
          if (!undo.ok) {
            updateRecipes(recipesRef.current.filter((r) => r.id !== recipe.id));
            toast.error(undo.error);
          }
        },
      },
    });
    router.refresh();
  };

  const handleRename = async (next: string) => {
    const result = await renameCollectionRequest(collection.id, next);
    if (!result.ok) return result.error;
    setName(result.data.name);
    toast.success("Collection renamed");
    router.refresh();
    return null;
  };

  const handleDelete = async () => {
    const result = await deleteCollectionRequest(collection.id);
    if (!result.ok && result.status !== 404) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Deleted ${name}`);
    router.push("/collections");
    router.refresh();
    return true;
  };

  return (
    <>
      <header className="mb-8 sm:mb-10">
        <Link
          href="/collections"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
          All collections
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          {/* The collection's stripes: one for each recipe in it. */}
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <ColourStripes
              colours={recipes.slice(0, 8).map((recipe) => recipeColour(recipe.code, recipe.tags, recipe.colour))}
              className="h-20 w-14 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-20"
            />
            <div className="min-w-0">
              <h1 className="font-display text-6xl leading-[0.88] text-foreground break-words sm:text-8xl">
                {name}
              </h1>
              <p className="mt-2 text-muted-foreground" aria-live="polite">
                <span className="font-bold tabular text-foreground">
                  {recipes.length}
                </span>{" "}
                {recipes.length === 1 ? "recipe" : "recipes"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
              <Pencil aria-hidden="true" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      {recipes.length === 0 ? (
        <EmptyState
          seed={collection.id}
          title="Nothing in here yet"
          action={
            <Button asChild>
              <Link href="/browse">Browse recipes</Link>
            </Button>
          }
        >
          Open any recipe and use &ldquo;Save to collection&rdquo; to add it to{" "}
          {name}.
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="flex flex-col gap-1">
              <div className="flex-1">
                <RecipeCard
                  recipe={recipe}
                  showAuthor={recipe.userId !== currentUserId}
                />
              </div>
              {/* Under the label, not on it: a label carries only its
                  category, time, title and meta (STYLE_GUIDE 06). */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleRemove(recipe)}
                className="h-11 self-end px-4 text-[15px] text-muted-foreground"
                aria-label={`Remove ${recipe.title} from ${name}`}
              >
                <X aria-hidden="true" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <CollectionNameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        mode="rename"
        initialName={name}
        onSubmit={handleRename}
      />
      <DeleteCollectionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={name}
        onConfirm={handleDelete}
      />
    </>
  );
}
