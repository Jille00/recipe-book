"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

interface DeleteCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  /** Resolves to true once deleted; false keeps the dialog open to retry. */
  onConfirm: () => Promise<boolean>;
}

export function DeleteCollectionDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
}: DeleteCollectionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async (event: React.MouseEvent) => {
    // Keep the dialog open, showing progress, until the request settles.
    event.preventDefault();
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      if (await onConfirm()) onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isDeleting) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-[22px] leading-[1.3] font-normal">
            Delete &ldquo;{name}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The collection goes away, but the recipes in it stay where they
            are. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Keep collection</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className={buttonVariants({ variant: "destructive" })}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isDeleting ? "Deleting..." : "Delete collection"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
