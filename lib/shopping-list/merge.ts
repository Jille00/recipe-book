import {
  formatAmount,
  formatMetricAmount,
  normalizeUnit,
  NUMBER_TOKEN,
  parseAmount,
} from "@/lib/utils/unit-conversion";

/** A shopping list row as the client sees it. */
export interface ShoppingListItem {
  id: string;
  recipeId: string | null;
  /** Title of the recipe it came from, null for manual items (or a deleted recipe). */
  recipeTitle: string | null;
  /** Link to that recipe, only when the caller may still open it. */
  recipeHref: string | null;
  text: string;
  amount: string | null;
  unit: string | null;
  checked: boolean;
  createdAt: string | null;
}

/** One line of the combined view: one or more items for the same ingredient. */
export interface MergedShoppingLine {
  key: string;
  text: string;
  amount: string | null;
  unit: string | null;
  /** Every underlying item is checked. */
  checked: boolean;
  itemIds: string[];
  /** Distinct recipe titles the line came from, for a hint under the line. */
  sources: string[];
}

export interface ShoppingListGroup {
  /** null for items that belong to no (existing) recipe. */
  recipeId: string | null;
  title: string | null;
  href: string | null;
  items: ShoppingListItem[];
}

// An amount that is nothing but one number ("200", "1½", "1 1/2", "0,5"),
// so "1-2", "2 large" or "to taste" are never summed.
const PLAIN_NUMBER = new RegExp(`^(?:${NUMBER_TOKEN})$`);

/** The numeric value of an amount, or null when it isn't a single plain number. */
export function parsePlainAmount(amount: string | null | undefined): number | null {
  if (typeof amount !== "string") return null;
  const trimmed = amount.trim();
  if (!trimmed || !PLAIN_NUMBER.test(trimmed)) return null;
  const value = parseAmount(trimmed);
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

/** Ingredient identity: case, spacing and trailing punctuation don't matter. */
export function normalizeIngredientName(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!]+$/, "");
}

/** A unit that isn't in the conversion table ("clove", "can") compared loosely. */
function looseUnitKey(unit: string): string {
  const lower = unit.trim().toLowerCase().replace(/\.$/, "");
  // "bunches" / "boxes" drop "es", "cloves" / "cans" just the "s".
  if (/(?:ch|sh|x|ss)es$/.test(lower)) return lower.slice(0, -2);
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 2) {
    return lower.slice(0, -1);
  }
  return lower;
}

/**
 * How amounts of an item can be combined. Known units of the same kind and
 * measuring system are summed through their base unit (g, ml); anything else
 * only combines with the very same unit.
 */
type UnitClass =
  | { kind: "known"; key: string; base: number; symbol: string; metric: boolean }
  | { kind: "other"; key: string; unit: string; plural: boolean }
  | { kind: "none"; key: "" };

function classifyUnit(unit: string | null | undefined): UnitClass {
  if (!unit || !unit.trim()) return { kind: "none", key: "" };
  const def = normalizeUnit(unit);
  if (def) {
    return {
      kind: "known",
      // "1 cup" and "100 ml" are both volume, but summing across systems gives
      // amounts nobody measures ("1⅖ cup"), so the system is part of the key.
      key: `${def.category}:${def.system}`,
      base: def.baseMultiplier,
      symbol: def.symbol,
      metric: def.system === "metric",
    };
  }
  const loose = looseUnitKey(unit);
  return {
    kind: "other",
    key: `other:${loose}`,
    unit: unit.trim(),
    plural: loose !== unit.trim().toLowerCase().replace(/\.$/, ""),
  };
}

function formatSum(value: number, metric: boolean): string {
  return metric ? formatMetricAmount(value) : formatAmount(value);
}

interface Bucket {
  line: MergedShoppingLine;
  total: number | null;
  unitClass: UnitClass;
  /** Largest unit seen (base multiplier), used to display the total. */
  displayBase: number;
  displaySymbol: string;
  /** Singular and plural spellings seen of an unlisted unit ("clove", "cloves"). */
  singularUnit: string | null;
  pluralUnit: string | null;
  allChecked: boolean;
}

/**
 * Combine the list into one line per ingredient, adding up amounts where that
 * is safe: "200 g flour" + "300 g flour" is "500 g flour", "1 cup" + "½ cup" is
 * "1½ cup" and "500 g" + "1 kg" is "1.5 kg". Items whose units can't be added
 * (different kinds, different systems, unknown and different, or an amount that
 * isn't a plain number such as "1-2" or "to taste") stay on their own line.
 * Duplicate items without any amount ("salt", "salt") become one line.
 *
 * Order follows the first appearance of each line.
 */
export function mergeShoppingItems(items: ShoppingListItem[]): MergedShoppingLine[] {
  const buckets: Bucket[] = [];
  const byKey = new Map<string, Bucket>();

  for (const item of items) {
    const name = normalizeIngredientName(item.text);
    const unitClass = classifyUnit(item.unit);
    const value = parsePlainAmount(item.amount);
    const hasAmount = Boolean(item.amount && item.amount.trim());

    let mergeKey: string | null = null;
    if (value !== null) {
      mergeKey = `${name}|n|${unitClass.key}`;
    } else if (!hasAmount && unitClass.kind === "none") {
      mergeKey = `${name}|empty`;
    }

    const existing = mergeKey ? byKey.get(mergeKey) : undefined;
    if (existing) {
      existing.line.itemIds.push(item.id);
      existing.allChecked = existing.allChecked && item.checked;
      if (item.recipeTitle && !existing.line.sources.includes(item.recipeTitle)) {
        existing.line.sources.push(item.recipeTitle);
      }
      if (unitClass.kind === "other") {
        if (unitClass.plural) existing.pluralUnit ??= unitClass.unit;
        else existing.singularUnit ??= unitClass.unit;
      }
      if (value !== null && existing.total !== null) {
        const base = unitClass.kind === "known" ? unitClass.base : 1;
        existing.total += value * base;
        if (unitClass.kind === "known" && unitClass.base > existing.displayBase) {
          existing.displayBase = unitClass.base;
          existing.displaySymbol = unitClass.symbol;
        }
      }
      continue;
    }

    const bucket: Bucket = {
      line: {
        key: mergeKey ?? `item:${item.id}`,
        text: item.text.trim(),
        amount: item.amount,
        unit: item.unit,
        checked: item.checked,
        itemIds: [item.id],
        sources: item.recipeTitle ? [item.recipeTitle] : [],
      },
      total:
        value === null ? null : value * (unitClass.kind === "known" ? unitClass.base : 1),
      unitClass,
      displayBase: unitClass.kind === "known" ? unitClass.base : 1,
      displaySymbol: unitClass.kind === "known" ? unitClass.symbol : "",
      singularUnit: unitClass.kind === "other" && !unitClass.plural ? unitClass.unit : null,
      pluralUnit: unitClass.kind === "other" && unitClass.plural ? unitClass.unit : null,
      allChecked: item.checked,
    };
    buckets.push(bucket);
    if (mergeKey) byKey.set(mergeKey, bucket);
  }

  return buckets.map((bucket) => {
    const { line, unitClass } = bucket;
    line.checked = bucket.allChecked;
    // A single item keeps exactly what was added.
    if (line.itemIds.length === 1 || bucket.total === null) return line;

    if (unitClass.kind === "known") {
      line.amount = formatSum(bucket.total / bucket.displayBase, unitClass.metric);
      line.unit = bucket.displaySymbol;
    } else {
      line.amount = formatAmount(bucket.total);
      line.unit =
        unitClass.kind === "other"
          ? // "3 cloves", "1 clove": the spelling that fits the total, if seen.
            (bucket.total > 1
              ? bucket.pluralUnit ?? bucket.singularUnit
              : bucket.singularUnit ?? bucket.pluralUnit)
          : null;
    }
    return line;
  });
}

/**
 * Items grouped by the recipe they came from, in order of first appearance,
 * with items that belong to no recipe collected in one group at the end.
 */
export function groupShoppingItemsByRecipe(items: ShoppingListItem[]): ShoppingListGroup[] {
  const groups = new Map<string, ShoppingListGroup>();
  const loose: ShoppingListItem[] = [];

  for (const item of items) {
    if (!item.recipeId) {
      loose.push(item);
      continue;
    }
    let group = groups.get(item.recipeId);
    if (!group) {
      group = {
        recipeId: item.recipeId,
        title: item.recipeTitle,
        href: item.recipeHref,
        items: [],
      };
      groups.set(item.recipeId, group);
    }
    group.items.push(item);
  }

  const result = [...groups.values()];
  if (loose.length > 0) {
    result.push({ recipeId: null, title: null, href: null, items: loose });
  }
  return result;
}

/** "500 g flour", "2 eggs", "salt". */
export function formatShoppingLine(line: {
  text: string;
  amount: string | null;
  unit: string | null;
}): string {
  return [line.amount?.trim(), line.unit?.trim(), line.text.trim()]
    .filter(Boolean)
    .join(" ");
}

/**
 * The list as plain text for pasting into a message: one "- " line per thing
 * still to buy (checked items are left out). Grouped mode adds recipe headings.
 */
export function formatShoppingListText(
  items: ShoppingListItem[],
  mode: "combined" | "recipe"
): string {
  const open = items.filter((item) => !item.checked);
  if (open.length === 0) return "";

  if (mode === "combined") {
    return mergeShoppingItems(open)
      .map((line) => `- ${formatShoppingLine(line)}`)
      .join("\n");
  }

  const groups = groupShoppingItemsByRecipe(open);
  const onlyLoose = groups.length === 1 && groups[0].recipeId === null;
  return groups
    .map((group) => {
      const lines = group.items.map((item) => `- ${formatShoppingLine(item)}`);
      if (onlyLoose) return lines.join("\n");
      return [`${group.title ?? "Other"}:`, ...lines].join("\n");
    })
    .join("\n\n");
}

/** An item as sent to the add endpoint. */
export interface ShoppingListInput {
  text: string;
  amount?: string | null;
  unit?: string | null;
}

/**
 * The shape of an ingredient on the recipe page after scaling and unit
 * conversion (recipe-detail's `convertedIngredients`).
 */
export interface DisplayedIngredient {
  id?: string;
  text: string;
  amount?: string;
  unit?: string;
  scaledAmount?: string | null;
  converted?: { displayAmount: string; unit: string } | null;
}

/** An ingredient exactly as the recipe page currently shows it. */
export function ingredientToShoppingInput(ingredient: DisplayedIngredient): ShoppingListInput {
  if (ingredient.converted) {
    return {
      text: ingredient.text.trim(),
      amount: ingredient.converted.displayAmount,
      unit: ingredient.converted.unit,
    };
  }
  const amount = ingredient.scaledAmount || ingredient.amount;
  return {
    text: ingredient.text.trim(),
    amount: amount?.trim() || null,
    unit: ingredient.unit?.trim() || null,
  };
}

const LEADING_AMOUNT = new RegExp(`^(${NUMBER_TOKEN})\\s+(.+)$`);

/**
 * Split a typed item into amount, unit and name so it can combine with recipe
 * items: "500 g flour" -> 500 / g / flour, "2 lemons" -> 2 / - / lemons. Text
 * that doesn't start with a number is kept whole.
 */
export function parseManualItem(input: string): ShoppingListInput {
  const text = input.trim().replace(/\s+/g, " ");
  const match = text.match(LEADING_AMOUNT);
  if (!match || parsePlainAmount(match[1]) === null) return { text };

  const amount = match[1];
  const rest = match[2];
  // Try a two-word unit first ("fl oz"), then a single word.
  const words = rest.split(" ");
  for (const size of [2, 1]) {
    if (words.length <= size) continue;
    const candidate = words.slice(0, size).join(" ");
    if (normalizeUnit(candidate)) {
      return { amount, unit: candidate, text: words.slice(size).join(" ") };
    }
  }
  return { amount, unit: null, text: rest };
}
