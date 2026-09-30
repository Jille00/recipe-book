"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, FolderPlus, Loader2, Plus } from "lucide-react";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { withRecipeCode } from "./recipe-api";
import {
  COLLECTION_NAME_MAX_LENGTH,
  parseCollectionName,
  setMembership,
  type CollectionMembership,
} from "@/lib/collections";

interface SaveToCollectionProps {
  recipeId: string;
  /** Proves access to an unlisted recipe, like ratings and comments do. */
  code: string;
  isAuthenticated: boolean;
  /**
   * Public or the viewer's own. Anything else can be saved but only shows up
   * in collections once it is public (see isListableInCollection).
   */
  isListable: boolean;
}

type LoadState = "idle" | "loading" | "error" | "ready";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return String(data.error);
  } catch {
    // Not JSON (a gateway error page, for example).
  }
  return fallback;
}

/**
 * "Save to collection": a popover listing the viewer's collections with a
 * checkbox each, and an inline form to start a new one. Ticking is optimistic
 * and rolls back if the server refuses.
 */
export function SaveToCollection({
  recipeId,
  code,
  isAuthenticated,
  isListable,
}: SaveToCollectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [collections, setCollections] = useState<CollectionMembership[]>([]);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Mirrors of state read synchronously, so a double click can't send two
  // requests for one collection and a rollback restores what was really there.
  const inFlightRef = useRef(new Set<string>());
  const collectionsRef = useRef(collections);
  const update = useCallback((next: CollectionMembership[]) => {
    collectionsRef.current = next;
    setCollections(next);
  }, []);

  const goToLogin = useCallback(() => {
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch(
        `/api/collections?recipeId=${encodeURIComponent(recipeId)}`
      );
      if (res.status === 401) {
        setOpen(false);
        goToLogin();
        return;
      }
      if (!res.ok) throw new Error("Request failed");
      const data: { collections: CollectionMembership[] } = await res.json();
      update(
        data.collections.map((c) => ({
          id: c.id,
          name: c.name,
          recipeCount: c.recipeCount,
          containsRecipe: Boolean(c.containsRecipe),
        }))
      );
      setLoadState("ready");
      if (data.collections.length === 0) setShowCreate(true);
    } catch {
      setLoadState("error");
    }
  }, [recipeId, goToLogin, update]);

  // Another recipe (client-side navigation): start over.
  useEffect(() => {
    setLoadState("idle");
    update([]);
    setShowCreate(false);
  }, [recipeId, update]);

  // Load fresh every time the popover opens: collections may have changed on
  // another page since.
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const setContains = useCallback(
    async (collection: { id: string; name: string }, contains: boolean) => {
      if (inFlightRef.current.has(collection.id)) return;
      const current = collectionsRef.current.find((c) => c.id === collection.id);
      if (current && current.containsRecipe === contains) return;

      inFlightRef.current.add(collection.id);
      setPending((p) => ({ ...p, [collection.id]: true }));
      update(setMembership(collectionsRef.current, collection.id, contains));

      try {
        const res = contains
          ? await fetch(
              withRecipeCode(`/api/collections/${collection.id}/recipes`, code),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipeId }),
              }
            )
          : await fetch(`/api/collections/${collection.id}/recipes/${recipeId}`, {
              method: "DELETE",
            });

        if (res.status === 401) {
          update(setMembership(collectionsRef.current, collection.id, !contains));
          goToLogin();
          return;
        }
        if (!res.ok) {
          throw new Error(
            await errorMessage(
              res,
              contains ? "Couldn't save to the collection" : "Couldn't remove it"
            )
          );
        }
        toast.success(
          contains
            ? `Saved to ${collection.name}`
            : `Removed from ${collection.name}`
        );
      } catch (error) {
        update(setMembership(collectionsRef.current, collection.id, !contains));
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        inFlightRef.current.delete(collection.id);
        setPending((p) => {
          const next = { ...p };
          delete next[collection.id];
          return next;
        });
      }
    },
    [code, recipeId, goToLogin, update]
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreating) return;

    const parsed = parseCollectionName(newName);
    if (!parsed.ok) {
      setCreateError(parsed.error);
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.name }),
      });
      if (res.status === 401) {
        goToLogin();
        return;
      }
      if (!res.ok) {
        setCreateError(await errorMessage(res, "Couldn't create the collection"));
        return;
      }
      const created: { id: string; name: string } = await res.json();
      update([
        { id: created.id, name: created.name, recipeCount: 0, containsRecipe: false },
        ...collectionsRef.current,
      ]);
      setNewName("");
      setShowCreate(false);
      // Starting a collection from a recipe means "put it in there".
      void setContains(created, true);
    } catch {
      setCreateError("Couldn't create the collection");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Button variant="outline" size="sm" onClick={goToLogin}>
        <FolderPlus className="h-4 w-4" aria-hidden="true" />
        Save to collection
      </Button>
    );
  }

  const savedCount = collections.filter((c) => c.containsRecipe).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          Save to collection
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-xl p-0 shadow-medium">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold text-foreground">
            Save to collection
          </h2>
          {loadState === "ready" && collections.length > 0 && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {savedCount === 0
                ? "Not in any collection yet"
                : `In ${savedCount} collection${savedCount === 1 ? "" : "s"}`}
            </p>
          )}
        </div>

        {(loadState === "loading" || loadState === "idle") && (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span role="status">Loading your collections</span>
          </div>
        )}

        {loadState === "error" && (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load your collections.
            </p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        )}

        {loadState === "ready" && (
          <>
            {collections.length > 0 ? (
              <ul className="max-h-64 overflow-y-auto py-1">
                {collections.map((c) => {
                  const checkboxId = `${inputId}-${c.id}`;
                  return (
                    <li key={c.id}>
                      <label
                        htmlFor={checkboxId}
                        className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-accent"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={c.containsRecipe}
                          disabled={pending[c.id]}
                          onCheckedChange={(checked) =>
                            void setContains(c, checked === true)
                          }
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {c.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {pending[c.id] ? (
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-label="Saving"
                            />
                          ) : (
                            c.recipeCount
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 pt-4 text-sm text-muted-foreground">
                You don&apos;t have any collections yet. Name your first one
                and this recipe goes straight in.
              </p>
            )}

            {!isListable && (
              <p className="mx-4 mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                This recipe isn&apos;t public, so it will only show in your
                collections once its author publishes it.
              </p>
            )}

            <div className="border-t border-border p-3 mt-2">
              {showCreate ? (
                <form onSubmit={handleCreate} noValidate className="space-y-2">
                  <label htmlFor={`${inputId}-new`} className="sr-only">
                    New collection name
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id={`${inputId}-new`}
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (createError) setCreateError(null);
                      }}
                      placeholder="e.g. Weeknight dinners"
                      maxLength={COLLECTION_NAME_MAX_LENGTH}
                      autoFocus
                      aria-invalid={createError ? true : undefined}
                      aria-describedby={createError ? `${inputId}-error` : undefined}
                      className="h-11"
                    />
                    <Button type="submit" size="sm" className="h-11" isLoading={isCreating}>
                      Create
                    </Button>
                  </div>
                  {createError && (
                    <p id={`${inputId}-error`} className="text-[13px] text-destructive">
                      {createError}
                    </p>
                  )}
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New collection
                </Button>
              )}
              <Link
                href="/collections"
                className="mt-2 block px-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Manage collections
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
