"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResetLinkSectionProps {
  recipeId: string;
  /** Called with the recipe's new address once the old one stops working. */
  onReset: (address: { code: string; slug: string }) => void;
  /** Merged onto the section; it has no horizontal padding of its own. */
  className?: string;
}

/**
 * Lets the owner replace a recipe's link. Unpublishing hides a recipe from
 * Browse, but anyone who already has its link can still open it; this is how
 * they lose access.
 */
export function ResetLinkSection({ recipeId, onReset, className }: ResetLinkSectionProps) {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const reset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/reset-link`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.code) {
        throw new Error(data?.error || `Failed to reset the link (${res.status})`);
      }
      onReset({ code: data.code, slug: data.slug });
      toast.success("New link created. The old link no longer works.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset the link");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <p className="font-display text-lg font-normal text-foreground">Reset link</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          If the link reached people it shouldn&apos;t have, or the recipe used
          to be public, give it a new one. Everyone with the old link loses
          access.
        </p>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!isResetting) setOpen(next);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0">
            <Link2Off className="h-4 w-4" aria-hidden="true" />
            Reset link
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-normal">
              Reset this recipe&apos;s link?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The current link stops working right away, including for people
              you sent it to. You can share the new link afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Keep current link</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Stay open until the request finishes.
                event.preventDefault();
                void reset();
              }}
              disabled={isResetting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isResetting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Reset link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
