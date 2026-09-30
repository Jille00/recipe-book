"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/page/page-header";
import { EmptyState } from "@/components/page/empty-state";
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
      <PageHeader
        title="Collections"
        intro={
          collections.length === 0 ? (
            "Your own groups of recipes. Only you can see them."
          ) : (
            <>
              <span className="font-mono tabular text-foreground">
                {collections.length}
              </span>{" "}
              {collections.length === 1 ? "collection" : "collections"}. Only
              you can see them.
            </>
          )
        }
        // When empty, the empty state carries the one orange action.
        action={
          collections.length > 0 ? (
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New collection
            </Button>
          ) : undefined
        }
      />

      {collections.length === 0 ? (
        <EmptyState
          seed="collections-empty"
          title="No collections yet"
          action={
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Start a collection
            </Button>
          }
        >
          Gather recipes into groups like &ldquo;Weeknight dinners&rdquo; or
          &ldquo;Holiday baking&rdquo;. Start one here, or use &ldquo;Save to
          collection&rdquo; on any recipe.
        </EmptyState>
      ) : (
        <>
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
