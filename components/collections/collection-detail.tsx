"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, FolderOpen, Pencil, Trash2, X } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import type { RecipeCardData } from "@/types/recipe";
import { formatRecipeCount } from "@/lib/collections";
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
      <div className="mb-6">
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All collections
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground break-words sm:text-4xl">
            {name}
          </h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">
            {formatRecipeCount(recipes.length)}
          </p>
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

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FolderOpen className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              Nothing in here yet
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Open any recipe and use &ldquo;Save to collection&rdquo; to add it
              to {name}.
            </p>
            <Button asChild variant="outline">
              <Link href="/browse">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Browse Recipes
              </Link>
            </Button>
          </CardContent>
        </Card>
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
