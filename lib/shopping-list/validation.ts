import { z } from "zod";

/** Most items one request may add (a long recipe has ~40 ingredients). */
export const MAX_ITEMS_PER_ADD = 200;
/** Most items a list may hold. */
export const MAX_LIST_ITEMS = 500;
/** Matches the shopping_list_item_text_length check constraint. */
export const MAX_ITEM_TEXT_LENGTH = 500;
export const MAX_AMOUNT_LENGTH = 50;
export const MAX_UNIT_LENGTH = 50;

// Postgres text can't hold NUL, and inserting one would surface as a 500.
const NO_NUL = /^[^\u0000]*$/;

const uuid = z.uuid({ message: "Invalid item id" });

const itemText = z
  .string()
  // Trim first so "   " fails the minimum instead of slipping through.
  .trim()
  .min(1, "Item text is required")
  .max(MAX_ITEM_TEXT_LENGTH, `Item text must be ${MAX_ITEM_TEXT_LENGTH} characters or less`)
  .regex(NO_NUL, "Item text contains invalid characters");

// Empty amounts / units are stored as null, not "".
const optionalShort = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or less`)
    .regex(NO_NUL, `${label} contains invalid characters`)
    .nullish()
    .transform((value) => (value ? value : null));

export const shoppingListInputSchema = z.object({
  text: itemText,
  amount: optionalShort(MAX_AMOUNT_LENGTH, "Amount"),
  unit: optionalShort(MAX_UNIT_LENGTH, "Unit"),
});

export type ValidShoppingListInput = z.infer<typeof shoppingListInputSchema>;

/**
 * POST /api/shopping-list: either the ingredients of a recipe (the caller must
 * be able to open it) or a single item typed by hand.
 */
export const addRecipeItemsSchema = z.object({
  recipeId: z.uuid({ message: "Invalid recipe id" }),
  items: z
    .array(shoppingListInputSchema)
    .min(1, "Choose at least one ingredient")
    .max(MAX_ITEMS_PER_ADD, `You can add at most ${MAX_ITEMS_PER_ADD} items at once`),
});

export type AddShoppingListBody =
  | { kind: "recipe"; recipeId: string; items: ValidShoppingListInput[] }
  | { kind: "manual"; item: ValidShoppingListInput };

/**
 * Validate an add request. A body with `items` adds a recipe's ingredients,
 * anything else is one manual item. Checked by hand rather than with a zod
 * union so the error names the actual problem, not "Invalid input".
 */
export function parseAddBody(
  body: Record<string, unknown>
): { success: true; data: AddShoppingListBody } | { success: false; error: string } {
  if ("items" in body || "recipeId" in body) {
    const result = addRecipeItemsSchema.safeParse(body);
    return result.success
      ? { success: true, data: { kind: "recipe", ...result.data } }
      : { success: false, error: firstIssue(result.error) };
  }
  const result = shoppingListInputSchema.safeParse(body);
  return result.success
    ? { success: true, data: { kind: "manual", item: result.data } }
    : { success: false, error: firstIssue(result.error) };
}

/** PATCH /api/shopping-list/[id]: tick an item or rename it. */
export const updateShoppingListItemSchema = z
  .object({
    checked: z.boolean().optional(),
    text: itemText.optional(),
  })
  .refine((value) => value.checked !== undefined || value.text !== undefined, {
    message: "Nothing to update",
  });

/** PATCH /api/shopping-list: tick several items at once (a combined line). */
export const setCheckedSchema = z.object({
  ids: z.array(uuid).min(1, "No items given").max(MAX_LIST_ITEMS),
  checked: z.boolean(),
});

/** DELETE /api/shopping-list?scope=...: which items to clear. */
export const clearScopeSchema = z.enum(["checked", "all"]);

/** The first validation message, for a 400 response. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}
