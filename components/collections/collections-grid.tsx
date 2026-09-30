"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderOpen, Plus } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { CollectionCard, type CollectionCardData } from "./collection-card";
import { CollectionNameDialog } from "./collection-name-dialog";
import { DeleteCollectionDialog } from "./delete-collection-dialog";
import {
  createCollectionRequest,
  deleteCollectionRequest,
  renameCollectionRequest,
} from "./collections-api";

interface CollectionsGridProps {
  initialCollections: CollectionCardData[];
}

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "rename"; collection: CollectionCardData }
  | { kind: "delete"; collection: CollectionCardData };

/** The /collections page body: header with "New collection", then the grid. */
export function CollectionsGrid({ initialCollections }: CollectionsGridProps) {
  const router = useRouter();
  const [collections, setCollections] = useState(initialCollections);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  // Kept separately so the dialogs can animate out with their last content.
  const [lastTarget, setLastTarget] = useState<CollectionCardData | null>(null);

  const close = () => setDialog({ kind: "none" });

  const openFor = (kind: "rename" | "delete", collection: CollectionCardData) => {
    setLastTarget(collection);
    setDialog({ kind, collection });
  };

  const handleCreate = async (name: string) => {
    const result = await createCollectionRequest(name);
    if (!result.ok) return result.error;
    setCollections((prev) => [result.data, ...prev]);
    toast.success(`Created ${result.data.name}`);
    router.refresh();
    return null;
  };

  const handleRename = async (name: string) => {
    if (dialog.kind !== "rename") return null;
    const { id } = dialog.collection;
    const result = await renameCollectionRequest(id, name);
    if (!result.ok) return result.error;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: result.data.name } : c))
    );
    toast.success("Collection renamed");
    router.refresh();
    return null;
  };

  const handleDelete = async () => {
    if (dialog.kind !== "delete") return false;
    const { id, name } = dialog.collection;
    const result = await deleteCollectionRequest(id);
    // Already gone (deleted in another tab) is what was asked for.
    if (!result.ok && result.status !== 404) {
      toast.error(result.error);
      return false;
    }
    setCollections((prev) => prev.filter((c) => c.id !== id));
    toast.success(`Deleted ${name}`);
    router.refresh();
    return true;
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Collections
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your own groups of recipes. Only you can see them.
          </p>
        </div>
        {collections.length > 0 && (
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Collection
          </Button>
        )}
      </div>

      {collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FolderOpen className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              No collections yet
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Gather recipes into groups like &ldquo;Weeknight dinners&rdquo; or
              &ldquo;Holiday baking&rdquo;. Start one here, or use &ldquo;Save to
              collection&rdquo; on any recipe.
            </p>
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Your First Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            {collections.length} collection{collections.length === 1 ? "" : "s"}
          </p>
          <div className="stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <div key={c.id} className="animate-fade-in-up">
                <CollectionCard
                  collection={c}
                  onRename={() => openFor("rename", c)}
                  onDelete={() => openFor("delete", c)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <CollectionNameDialog
        open={dialog.kind === "create"}
        onOpenChange={(open) => !open && close()}
        mode="create"
        onSubmit={handleCreate}
      />
      <CollectionNameDialog
        open={dialog.kind === "rename"}
        onOpenChange={(open) => !open && close()}
        mode="rename"
        initialName={lastTarget?.name ?? ""}
        onSubmit={handleRename}
      />
      <DeleteCollectionDialog
        open={dialog.kind === "delete"}
        onOpenChange={(open) => !open && close()}
        name={lastTarget?.name ?? ""}
        onConfirm={handleDelete}
      />
    </>
  );
}
