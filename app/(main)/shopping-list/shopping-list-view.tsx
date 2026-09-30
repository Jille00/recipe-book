"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  Copy,
  Layers,
  ListChecks,
  Plus,
  Printer,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  formatShoppingListText,
  groupShoppingItemsByRecipe,
  mergeShoppingItems,
  parseManualItem,
  type ShoppingListItem,
} from "@/lib/shopping-list/merge";
import { MAX_ITEM_TEXT_LENGTH } from "@/lib/shopping-list/validation";
import { cn } from "@/lib/utils";

type ViewMode = "recipe" | "combined";

const VIEW_MODE_KEY = "shopping-list-view";
const LOGIN_HREF = `/login?callbackUrl=${encodeURIComponent("/shopping-list")}`;

class UnauthorizedError extends Error {}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) throw new UnauthorizedError();
  return res;
}

async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => null);
  throw new Error(data?.error || fallback);
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function byCreatedAt(a: ShoppingListItem, b: ShoppingListItem): number {
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

/** Unchecked first, otherwise keeping the given order. */
function openFirst<T extends { checked: boolean }>(rows: T[]): T[] {
  return [...rows.filter((row) => !row.checked), ...rows.filter((row) => row.checked)];
}

interface ShoppingListViewProps {
  initialItems: ShoppingListItem[];
}

export function ShoppingListView({ initialItems }: ShoppingListViewProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [mode, setMode] = useState<ViewMode>("recipe");
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputId = useId();

  // Mutations run one after another so a tick and an untick of the same item
  // can never reach the server out of order.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "recipe" || saved === "combined") setMode(saved);
    } catch {
      // Storage unavailable: keep the default.
    }
  }, []);

  const changeMode = (next: ViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // Not remembered, which is fine.
    }
  };

  const groups = useMemo(() => groupShoppingItemsByRecipe(items), [items]);
  const mergedLines = useMemo(() => openFirst(mergeShoppingItems(items)), [items]);
  const remaining = items.filter((item) => !item.checked).length;
  const checkedCount = items.length - remaining;

  const handleFailure = (error: unknown, fallback: string) => {
    if (error instanceof UnauthorizedError) {
      router.push(LOGIN_HREF);
      return;
    }
    toast.error(error instanceof Error && error.message ? error.message : fallback);
  };

  /** Apply `optimistic` now, run `send` in turn, and undo with `rollback` if it fails. */
  const mutate = (
    optimistic: () => void,
    send: () => Promise<void>,
    rollback: () => void,
    fallback: string
  ) => {
    optimistic();
    queueRef.current = queueRef.current.then(async () => {
      try {
        await send();
      } catch (error) {
        rollback();
        handleFailure(error, fallback);
      }
    });
  };

  const setChecked = (ids: string[], checked: boolean) => {
    const idSet = new Set(ids);
    const previous = new Map(
      items.filter((item) => idSet.has(item.id)).map((item) => [item.id, item.checked])
    );
    mutate(
      () =>
        setItems((current) =>
          current.map((item) => (idSet.has(item.id) ? { ...item, checked } : item))
        ),
      async () => {
        const res =
          ids.length === 1
            ? await request(`/api/shopping-list/${ids[0]}`, jsonInit("PATCH", { checked }))
            : await request("/api/shopping-list", jsonInit("PATCH", { ids, checked }));
        await ensureOk(res, "Failed to update item");
      },
      () =>
        setItems((current) =>
          current.map((item) =>
            previous.has(item.id) ? { ...item, checked: previous.get(item.id)! } : item
          )
        ),
      "Failed to update item"
    );
  };

  /** Put removed items back where they were, unless they are there already. */
  const restore = (removed: ShoppingListItem[]) =>
    setItems((current) => {
      const present = new Set(current.map((item) => item.id));
      return [...current, ...removed.filter((item) => !present.has(item.id))].sort(
        byCreatedAt
      );
    });

  const removeItems = (ids: string[]) => {
    const idSet = new Set(ids);
    const removed = items.filter((item) => idSet.has(item.id));
    mutate(
      () => setItems((current) => current.filter((item) => !idSet.has(item.id))),
      async () => {
        const results = await Promise.all(
          ids.map((id) => request(`/api/shopping-list/${id}`, { method: "DELETE" }))
        );
        // 404: already gone, which is what we wanted.
        const failed = results.find((res) => !res.ok && res.status !== 404);
        if (failed) await ensureOk(failed, "Failed to remove item");
      },
      () => restore(removed),
      "Failed to remove item"
    );
  };

  const clear = (scope: "checked" | "all") => {
    const removed = scope === "all" ? items : items.filter((item) => item.checked);
    if (removed.length === 0) return;
    const removedIds = new Set(removed.map((item) => item.id));
    mutate(
      () => setItems((current) => current.filter((item) => !removedIds.has(item.id))),
      async () => {
        const res = await request(`/api/shopping-list?scope=${scope}`, { method: "DELETE" });
        await ensureOk(res, "Failed to clear the list");
      },
      () => restore(removed),
      "Failed to clear the list"
    );
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = newItem.trim();
    if (!text || isAdding) return;

    setIsAdding(true);
    try {
      // Wait for queued changes so a "clear all" can't remove the new item.
      await queueRef.current;
      const res = await request("/api/shopping-list", jsonInit("POST", parseManualItem(text)));
      await ensureOk(res, "Failed to add item");
      const data: { items: ShoppingListItem[] } = await res.json();
      setItems((current) => [...current, ...data.items]);
      setNewItem("");
    } catch (error) {
      handleFailure(error, "Failed to add item");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopy = async () => {
    const text = formatShoppingListText(items, mode);
    if (!text) {
      toast.info("Nothing left to buy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Shopping list copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to the clipboard");
    }
  };

  const empty = items.length === 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Shopping List
          </h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">
            {empty
              ? "Nothing on your list yet"
              : remaining === 0
                ? "All done. Everything is ticked off."
                : `${remaining} ${remaining === 1 ? "item" : "items"} to buy`}
          </p>
        </div>

        {!empty && (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </Button>
          </div>
        )}
      </div>

      {/* Add an item by hand */}
      <form onSubmit={handleAdd} className="mb-6 flex gap-2 print:hidden">
        <label htmlFor={inputId} className="sr-only">
          Add an item
        </label>
        <Input
          id={inputId}
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add an item, e.g. 2 lemons"
          maxLength={MAX_ITEM_TEXT_LENGTH}
          autoComplete="off"
          disabled={isAdding}
        />
        <Button type="submit" className="h-12" isLoading={isAdding} disabled={!newItem.trim()}>
          {!isAdding && <Plus className="h-4 w-4" aria-hidden="true" />}
          Add
        </Button>
      </form>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBasket className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              Your shopping list is empty
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Open a recipe and choose &ldquo;Add to List&rdquo; to collect its
              ingredients here, or add items yourself above.
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
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div
              role="group"
              aria-label="Show items"
              className="inline-flex rounded-lg border-[1.5px] border-border p-0.5"
            >
              {(
                [
                  { value: "recipe", label: "By recipe", Icon: ListChecks },
                  { value: "combined", label: "Combined", Icon: Layers },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => changeMode(value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold tracking-[0.02em] transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    mode === value
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clear("checked")}
                disabled={checkedCount === 0}
              >
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                Clear checked
              </Button>
              <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Clear all
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display">
                      Clear your shopping list?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      All {items.length} {items.length === 1 ? "item" : "items"} will
                      be removed, including the ones you haven&apos;t ticked off.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep List</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clear("all")}
                      className={buttonVariants({ variant: "destructive" })}
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {mode === "combined" ? (
            <Card>
              <CardContent className="p-6">
                <ul className="divide-y divide-border">
                  {mergedLines.map((line) => (
                    <ItemRow
                      key={line.key}
                      text={line.text}
                      amount={line.amount}
                      unit={line.unit}
                      checked={line.checked}
                      hint={line.sources.length > 0 ? line.sources.join(", ") : null}
                      onCheckedChange={(checked) => setChecked(line.itemIds, checked)}
                      onRemove={() => removeItems(line.itemIds)}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <Card key={group.recipeId ?? "other"} className="break-inside-avoid">
                  <CardContent className="p-6">
                    <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
                      {group.recipeId === null ? (
                        "Other items"
                      ) : group.href ? (
                        <Link
                          href={group.href}
                          className="transition-colors duration-150 hover:text-primary"
                        >
                          {group.title}
                        </Link>
                      ) : (
                        group.title ?? "Recipe"
                      )}
                    </h2>
                    <ul className="divide-y divide-border">
                      {openFirst(group.items).map((item) => (
                        <ItemRow
                          key={item.id}
                          text={item.text}
                          amount={item.amount}
                          unit={item.unit}
                          checked={item.checked}
                          onCheckedChange={(checked) => setChecked([item.id], checked)}
                          onRemove={() => removeItems([item.id])}
                        />
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

interface ItemRowProps {
  text: string;
  amount: string | null;
  unit: string | null;
  checked: boolean;
  /** Where a combined line came from. */
  hint?: string | null;
  onCheckedChange: (checked: boolean) => void;
  onRemove: () => void;
}

function ItemRow({
  text,
  amount,
  unit,
  checked,
  hint,
  onCheckedChange,
  onRemove,
}: ItemRowProps) {
  const id = useId();
  const quantity = [amount, unit].filter(Boolean).join(" ");
  const label = [quantity, text].filter(Boolean).join(" ");

  return (
    <li className="flex items-start gap-3 py-3 first:pt-2 last:pb-0 break-inside-avoid">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-1"
      />
      {/* Paper gets an empty box to tick with a pen (buttons don't print). */}
      <span
        aria-hidden="true"
        className="mt-1 hidden size-4 shrink-0 rounded-[4px] border border-current print:inline-block"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex-1 cursor-pointer text-base leading-6 text-foreground transition-colors duration-150",
          checked && "text-muted-foreground line-through"
        )}
      >
        {quantity && <span className="font-medium">{quantity}</span>} {text}
        {hint && (
          <span className="block text-xs text-muted-foreground no-underline">{hint}</span>
        )}
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="-my-1 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}
