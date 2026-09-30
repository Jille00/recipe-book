"use client";

import { useId, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { withRecipeCode } from "./recipe-api";
import { compactButtonClass, compactLabelClass } from "./action-styles";
import {
  formatShoppingLine,
  ingredientToShoppingInput,
  type DisplayedIngredient,
} from "@/lib/shopping-list/merge";
import {
  MAX_AMOUNT_LENGTH,
  MAX_ITEM_TEXT_LENGTH,
  MAX_ITEMS_PER_ADD,
  MAX_UNIT_LENGTH,
} from "@/lib/shopping-list/validation";
import { cn } from "@/lib/utils";

interface AddToShoppingListProps {
  recipeId: string;
  /** The recipe's code, sent as proof of access for unlisted recipes. */
  code?: string;
  /** The ingredients as currently shown: scaled and unit-converted. */
  ingredients: DisplayedIngredient[];
  isAuthenticated: boolean;
  className?: string;
  /** Icon-only below `sm` (the recipe page's action row). */
  compact?: boolean;
}

/**
 * "Add to list" for the recipe page. Opens a dialog where every ingredient is
 * ticked; the user unticks what they already have and adds the rest, in the
 * amounts and units the page is showing right now.
 */
export function AddToShoppingList({
  recipeId,
  code,
  ingredients,
  isAuthenticated,
  className,
  compact = false,
}: AddToShoppingListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const entries = useMemo(
    () =>
      ingredients
        .slice(0, MAX_ITEMS_PER_ADD)
        .map((ingredient, index) => {
          const raw = ingredientToShoppingInput(ingredient);
          // Stay inside the API's limits rather than failing the whole add.
          const input = {
            text: raw.text.slice(0, MAX_ITEM_TEXT_LENGTH),
            amount: raw.amount?.slice(0, MAX_AMOUNT_LENGTH) ?? null,
            unit: raw.unit?.slice(0, MAX_UNIT_LENGTH) ?? null,
          };
          return { index, input, label: formatShoppingLine(input) };
        })
        .filter((entry) => entry.input.text.length > 0),
    [ingredients]
  );

  if (entries.length === 0) return null;

  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname)}`;
  const selected = entries.filter((entry) => !excluded.has(entry.index));
  const allSelected = selected.length === entries.length;

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    // Start from everything ticked each time: servings or units may have changed.
    setExcluded(new Set());
    setOpen(true);
  };

  const toggle = (index: number, checked: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    setExcluded(allSelected ? new Set(entries.map((entry) => entry.index)) : new Set());
  };

  const handleAdd = async () => {
    if (selected.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(withRecipeCode("/api/shopping-list", code), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId,
          items: selected.map((entry) => entry.input),
        }),
      });

      if (res.status === 401) {
        router.push(loginHref);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add to shopping list");
      }

      setOpen(false);
      toast.success(
        `Added ${selected.length} ${selected.length === 1 ? "item" : "items"} to your shopping list`,
        {
          action: {
            label: "View list",
            onClick: () => router.push("/shopping-list"),
          },
        }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to shopping list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size={compact ? "default" : "sm"}
        onClick={handleOpen}
        className={cn(compact && compactButtonClass, className)}
      >
        <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
        <span className={cn(compact && compactLabelClass)}>Add to list</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isSubmitting) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">
              Add to shopping list
            </DialogTitle>
            <DialogDescription>
              Untick anything you already have at home.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-sm text-muted-foreground">
              <span className="font-mono tabular">{selected.length}</span> of{" "}
              <span className="font-mono tabular">{entries.length}</span> selected
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
              {allSelected ? "Select none" : "Select all"}
            </Button>
          </div>

          <ul className="-mx-2 max-h-[50vh] space-y-1 overflow-y-auto px-2">
            {entries.map((entry) => {
              const id = `${fieldId}-${entry.index}`;
              const isChecked = !excluded.has(entry.index);
              return (
                <li key={entry.index} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                  <Checkbox
                    id={id}
                    checked={isChecked}
                    onCheckedChange={(value) => toggle(entry.index, value === true)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={id}
                    className={cn(
                      "flex-1 cursor-pointer text-sm leading-5 text-foreground",
                      !isChecked && "text-muted-foreground line-through"
                    )}
                  >
                    {entry.label}
                  </label>
                </li>
              );
            })}
          </ul>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              isLoading={isSubmitting}
              disabled={selected.length === 0}
            >
              {selected.length === 0
                ? "Add items"
                : `Add ${selected.length} ${selected.length === 1 ? "item" : "items"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
