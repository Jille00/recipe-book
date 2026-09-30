"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { DelftTile } from "@/components/delft/delft-tile";
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
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All collections
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          {/* The collection's tile: the same seed as its card's wall. */}
          <div className="flex min-w-0 items-center gap-5 sm:gap-6">
            <DelftTile
              seed={collection.id}
              className="size-20 shrink-0 shadow-soft sm:size-28"
            />
            <div className="min-w-0">
              <h1 className="font-display text-4xl leading-[1.1] tracking-[-0.01em] text-foreground break-words sm:text-[44px]">
                {name}
              </h1>
              <p className="mt-2 text-muted-foreground" aria-live="polite">
                <span className="font-mono tabular text-foreground">
                  {recipes.length}
                </span>{" "}
                {recipes.length === 1 ? "recipe" : "recipes"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
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
            <div key={recipe.id} className="relative">
              <RecipeCard
                recipe={recipe}
                showAuthor={recipe.userId !== currentUserId}
              />
              {/* Above the card's stretched link, opposite the time badge. */}
              <button
                type="button"
                onClick={() => void handleRemove(recipe)}
                className="glass absolute top-3 left-3 z-20 flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-transform duration-150 hover:scale-110 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove ${recipe.title} from ${name}`}
                title="Remove from collection"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
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
