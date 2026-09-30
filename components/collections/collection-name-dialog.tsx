"use client";

import { useEffect, useId, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui";
import { COLLECTION_NAME_MAX_LENGTH, parseCollectionName } from "@/lib/collections";

interface CollectionNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "rename";
  initialName?: string;
  /** Resolves to an error message to show, or null on success. */
  onSubmit: (name: string) => Promise<string | null>;
}

/** Name a new collection, or rename one. */
export function CollectionNameDialog({
  open,
  onOpenChange,
  mode,
  initialName = "",
  onSubmit,
}: CollectionNameDialogProps) {
  const inputId = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Start from the current name each time it opens.
  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const parsed = parseCollectionName(name);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setIsSaving(true);
    try {
      const message = await onSubmit(parsed.name);
      if (message) {
        setError(message);
      } else {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSaving) onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-xl bg-background sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="grid gap-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold">
              {mode === "create" ? "New collection" : "Rename collection"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Group recipes however you like: weeknight dinners, holiday baking, one to try."
                : "Only you can see your collections."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={inputId} className="text-charcoal dark:text-foreground">
              Name
            </Label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Weeknight dinners"
              maxLength={COLLECTION_NAME_MAX_LENGTH}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
            {error && (
              <p id={`${inputId}-error`} className="text-[13px] text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {mode === "create" ? "Create collection" : "Save name"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
