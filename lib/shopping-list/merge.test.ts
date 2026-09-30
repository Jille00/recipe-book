import { describe, expect, it } from "vitest";
import {
  formatShoppingLine,
  formatShoppingListText,
  groupShoppingItemsByRecipe,
  ingredientToShoppingInput,
  mergeShoppingItems,
  normalizeIngredientName,
  parseManualItem,
  parsePlainAmount,
  type ShoppingListItem,
} from "./merge";

let counter = 0;
function item(
  text: string,
  amount: string | null = null,
  unit: string | null = null,
  extra: Partial<ShoppingListItem> = {}
): ShoppingListItem {
  counter += 1;
  return {
    id: `id-${counter}`,
    recipeId: null,
    recipeTitle: null,
    recipeHref: null,
    text,
    amount,
    unit,
    checked: false,
    createdAt: null,
    ...extra,
  };
}

function lines(items: ShoppingListItem[]): string[] {
  return mergeShoppingItems(items).map(formatShoppingLine);
}

describe("parsePlainAmount", () => {
  it("reads single numbers in every notation", () => {
    expect(parsePlainAmount("200")).toBe(200);
    expect(parsePlainAmount("½")).toBe(0.5);
    expect(parsePlainAmount("1½")).toBe(1.5);
    expect(parsePlainAmount("1 1/2")).toBe(1.5);
    expect(parsePlainAmount("0,5")).toBe(0.5);
    expect(parsePlainAmount(" 2.25 ")).toBe(2.25);
  });

  it("rejects anything that isn't just one positive number", () => {
    expect(parsePlainAmount("1-2")).toBeNull();
    expect(parsePlainAmount("2 large")).toBeNull();
    expect(parsePlainAmount("to taste")).toBeNull();
    expect(parsePlainAmount("")).toBeNull();
    expect(parsePlainAmount(null)).toBeNull();
    expect(parsePlainAmount("0")).toBeNull();
  });
});

describe("normalizeIngredientName", () => {
  it("ignores case, spacing and trailing punctuation", () => {
    expect(normalizeIngredientName("  All-purpose   Flour. ")).toBe("all-purpose flour");
  });
});

describe("mergeShoppingItems", () => {
  it("adds up the same ingredient in the same unit", () => {
    expect(lines([item("flour", "200", "g"), item("flour", "300", "g")])).toEqual([
      "500 g flour",
    ]);
  });

  it("adds up fractions of imperial units", () => {
    expect(lines([item("milk", "1", "cup"), item("milk", "½", "cup")])).toEqual([
      "1½ cup milk",
    ]);
  });

  it("treats unit spellings and case as the same unit", () => {
    expect(
      lines([item("Flour", "200", "grams"), item("flour", "100", "G")])
    ).toEqual(["300 g Flour"]);
  });

  it("combines units of the same kind and system into the largest one", () => {
    expect(lines([item("flour", "500", "g"), item("flour", "1", "kg")])).toEqual([
      "1.5 kg flour",
    ]);
    expect(lines([item("butter", "8", "oz"), item("butter", "1", "lb")])).toEqual([
      "1½ lb butter",
    ]);
    expect(lines([item("oil", "1", "tbsp"), item("oil", "1", "tsp")])).toEqual([
      "1⅓ tbsp oil",
    ]);
  });

  it("keeps metric and imperial amounts apart", () => {
    expect(lines([item("milk", "1", "cup"), item("milk", "100", "ml")])).toEqual([
      "1 cup milk",
      "100 ml milk",
    ]);
  });

  it("keeps different kinds of unit apart", () => {
    expect(lines([item("sugar", "100", "g"), item("sugar", "1", "cup")])).toEqual([
      "100 g sugar",
      "1 cup sugar",
    ]);
  });

  it("combines unknown units only with the same unit", () => {
    expect(
      lines([
        item("garlic", "2", "cloves"),
        item("garlic", "1", "clove"),
        item("garlic", "1", "head"),
      ])
    ).toEqual(["3 cloves garlic", "1 head garlic"]);
    expect(lines([item("parsley", "1", "bunch"), item("parsley", "2", "bunches")])).toEqual([
      "3 bunches parsley",
    ]);
  });

  it("adds up counts without a unit", () => {
    expect(lines([item("eggs", "2"), item("eggs", "3")])).toEqual(["5 eggs"]);
  });

  it("never merges a count with a measured amount", () => {
    expect(lines([item("eggs", "2"), item("eggs", "100", "g")])).toEqual([
      "2 eggs",
      "100 g eggs",
    ]);
  });

  it("keeps ranges and descriptive amounts on their own line", () => {
    expect(
      lines([
        item("flour", "1-2", "cup"),
        item("flour", "1", "cup"),
        item("salt", "to taste"),
        item("salt", "to taste"),
      ])
    ).toEqual(["1-2 cup flour", "1 cup flour", "to taste salt", "to taste salt"]);
  });

  it("collapses duplicate items without any amount", () => {
    expect(lines([item("salt"), item("Salt"), item("pepper")])).toEqual([
      "salt",
      "pepper",
    ]);
  });

  it("keeps different ingredients apart and follows first appearance", () => {
    expect(
      lines([
        item("flour", "200", "g"),
        item("sugar", "50", "g"),
        item("flour", "100", "g"),
      ])
    ).toEqual(["300 g flour", "50 g sugar"]);
  });

  it("leaves a single item exactly as it was added", () => {
    expect(lines([item("flour", "1 1/2", "cups")])).toEqual(["1 1/2 cups flour"]);
  });

  it("tracks ids, sources and checked state of the merged items", () => {
    const a = item("flour", "200", "g", { recipeTitle: "Bread", checked: true });
    const b = item("flour", "300", "g", { recipeTitle: "Cake", checked: false });
    const c = item("flour", "100", "g", { recipeTitle: "Bread", checked: true });
    const [line] = mergeShoppingItems([a, b, c]);
    expect(line.itemIds).toEqual([a.id, b.id, c.id]);
    expect(line.sources).toEqual(["Bread", "Cake"]);
    expect(line.checked).toBe(false);

    const [allChecked] = mergeShoppingItems([a, c]);
    expect(allChecked.checked).toBe(true);
  });

  it("returns an empty list for no items", () => {
    expect(mergeShoppingItems([])).toEqual([]);
  });
});

describe("groupShoppingItemsByRecipe", () => {
  it("groups by recipe in order and puts loose items last", () => {
    const manual = item("milk");
    const bread1 = item("flour", "200", "g", { recipeId: "r1", recipeTitle: "Bread", recipeHref: "/r/a/bread" });
    const cake = item("sugar", "50", "g", { recipeId: "r2", recipeTitle: "Cake" });
    const bread2 = item("yeast", "7", "g", { recipeId: "r1", recipeTitle: "Bread" });

    const groups = groupShoppingItemsByRecipe([manual, bread1, cake, bread2]);
    expect(groups.map((g) => g.recipeId)).toEqual(["r1", "r2", null]);
    expect(groups[0]).toMatchObject({ title: "Bread", href: "/r/a/bread" });
    expect(groups[0].items).toEqual([bread1, bread2]);
    expect(groups[2].items).toEqual([manual]);
  });

  it("has no loose group when every item belongs to a recipe", () => {
    const groups = groupShoppingItemsByRecipe([
      item("flour", null, null, { recipeId: "r1", recipeTitle: "Bread" }),
    ]);
    expect(groups).toHaveLength(1);
  });
});

describe("formatShoppingListText", () => {
  const items = [
    item("flour", "200", "g", { recipeId: "r1", recipeTitle: "Bread" }),
    item("flour", "300", "g", { recipeId: "r2", recipeTitle: "Cake" }),
    item("eggs", "2", null, { recipeId: "r2", recipeTitle: "Cake", checked: true }),
    item("milk"),
  ];

  it("lists merged lines still to buy", () => {
    expect(formatShoppingListText(items, "combined")).toBe("- 500 g flour\n- milk");
  });

  it("adds recipe headings when grouped", () => {
    expect(formatShoppingListText(items, "recipe")).toBe(
      "Bread:\n- 200 g flour\n\nCake:\n- 300 g flour\n\nOther:\n- milk"
    );
  });

  it("drops the heading when there are only manual items", () => {
    expect(formatShoppingListText([item("milk"), item("bread")], "recipe")).toBe(
      "- milk\n- bread"
    );
  });

  it("is empty when everything is checked", () => {
    expect(formatShoppingListText([item("milk", null, null, { checked: true })], "combined")).toBe("");
  });
});

describe("ingredientToShoppingInput", () => {
  it("uses the converted amount and unit when there is one", () => {
    expect(
      ingredientToShoppingInput({
        text: "milk",
        amount: "1",
        unit: "cup",
        scaledAmount: "2",
        converted: { displayAmount: "473", unit: "ml" },
      })
    ).toEqual({ text: "milk", amount: "473", unit: "ml" });
  });

  it("uses the scaled amount, then the original", () => {
    expect(
      ingredientToShoppingInput({ text: " eggs ", amount: "2", scaledAmount: "4", converted: null })
    ).toEqual({ text: "eggs", amount: "4", unit: null });
    expect(
      ingredientToShoppingInput({ text: "salt", amount: "to taste", scaledAmount: null })
    ).toEqual({ text: "salt", amount: "to taste", unit: null });
    expect(ingredientToShoppingInput({ text: "pepper" })).toEqual({
      text: "pepper",
      amount: null,
      unit: null,
    });
  });
});

describe("parseManualItem", () => {
  it("splits amount, known unit and name", () => {
    expect(parseManualItem("500 g flour")).toEqual({ amount: "500", unit: "g", text: "flour" });
    expect(parseManualItem("1½ cups  milk")).toEqual({ amount: "1½", unit: "cups", text: "milk" });
    expect(parseManualItem("2 fl oz cream")).toEqual({ amount: "2", unit: "fl oz", text: "cream" });
  });

  it("keeps a count without a unit", () => {
    expect(parseManualItem("2 lemons")).toEqual({ amount: "2", unit: null, text: "lemons" });
    expect(parseManualItem("3 large eggs")).toEqual({ amount: "3", unit: null, text: "large eggs" });
  });

  it("keeps text that doesn't start with a number whole", () => {
    expect(parseManualItem("  dish soap ")).toEqual({ text: "dish soap" });
    expect(parseManualItem("7up")).toEqual({ text: "7up" });
    expect(parseManualItem("1-2 limes")).toEqual({ text: "1-2 limes" });
  });

  it("merges with recipe items once parsed", () => {
    const manual = parseManualItem("300 g flour");
    expect(
      lines([
        item("flour", "200", "g"),
        item(manual.text, manual.amount ?? null, manual.unit ?? null),
      ])
    ).toEqual(["500 g flour"]);
  });
});
