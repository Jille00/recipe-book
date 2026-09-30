import { describe, expect, it } from "vitest";
import { parseIngredient, tidyParentheses } from "./ingredient-parser";

describe("parseIngredient", () => {
  it.each([
    ["2 cups flour", { amount: "2", unit: "cup", text: "flour" }],
    ["1 1/2 tsp salt", { amount: "1 1/2", unit: "tsp", text: "salt" }],
    ["½ cup sugar", { amount: "½", unit: "cup", text: "sugar" }],
    ["1½ cups milk", { amount: "1½", unit: "cup", text: "milk" }],
    ["1 ½ cups milk", { amount: "1½", unit: "cup", text: "milk" }],
    ["2-3 cloves garlic", { amount: "2-3", unit: "cloves", text: "garlic" }],
    ["2 – 3 cloves garlic", { amount: "2-3", unit: "cloves", text: "garlic" }],
    ["1 to 2 tablespoons lemon juice", { amount: "1-2", unit: "tbsp", text: "lemon juice" }],
    ["200g butter", { amount: "200", unit: "g", text: "butter" }],
    ["200 g butter", { amount: "200", unit: "g", text: "butter" }],
    ["1.5kg potatoes", { amount: "1.5", unit: "kg", text: "potatoes" }],
    ["0,5 l melk", { amount: "0.5", unit: "L", text: "melk" }],
    ["1 (14 oz) can tomatoes", { amount: "1", unit: "can", text: "tomatoes (14 oz)" }],
    ["3 large eggs", { amount: "3", text: "large eggs" }],
    ["4 eggs", { amount: "4", text: "eggs" }],
    ["2 tbsp. olive oil", { amount: "2", unit: "tbsp", text: "olive oil" }],
    ["1 lb. boneless chicken", { amount: "1", unit: "lb", text: "boneless chicken" }],
    ["1 Tbsp butter", { amount: "1", unit: "tbsp", text: "butter" }],
    ["1 T sugar", { amount: "1", unit: "tbsp", text: "sugar" }],
    ["1 t vanilla", { amount: "1", unit: "tsp", text: "vanilla" }],
    ["8 fl oz cream", { amount: "8", unit: "fl oz", text: "cream" }],
    ["8 fl. oz. cream", { amount: "8", unit: "fl oz", text: "cream" }],
    ["2 cups of water", { amount: "2", unit: "cup", text: "water" }],
    ["1 pinch nutmeg", { amount: "1", unit: "pinch", text: "nutmeg" }],
    ["2 sprigs rosemary", { amount: "2", unit: "sprigs", text: "rosemary" }],
    ["3 slices bread", { amount: "3", unit: "slices", text: "bread" }],
    ["2 bay leaves", { amount: "2", text: "bay leaves" }],
    ["400 gr spaghetti", { amount: "400", unit: "g", text: "spaghetti" }],
    ["2 el olijfolie", { amount: "2", unit: "el", text: "olijfolie" }],
    ["1 tl kaneel", { amount: "1", unit: "tl", text: "kaneel" }],
    ["2 teentjes knoflook", { amount: "2", unit: "teentjes", text: "knoflook" }],
    ["1,000 g flour", { amount: "1000", unit: "g", text: "flour" }],
    ["2/3 cup (142g) light brown sugar, packed", { amount: "2/3", unit: "cup", text: "light brown sugar, packed (142g)" }],
    ["30g / 2 tbsp unsalted butter", { amount: "30", unit: "g", text: "unsalted butter (2 tbsp)" }],
    ["200g/7oz plain flour", { amount: "200", unit: "g", text: "plain flour (7oz)" }],
    ["1 tsp smoked paprika ($0.20)", { amount: "1", unit: "tsp", text: "smoked paprika" }],
    ["4 chicken thighs ((Note 1))", { amount: "4", text: "chicken thighs (Note 1)" }],
    ["3 garlic cloves (, finely minced)", { amount: "3", text: "garlic cloves (finely minced)" }],
    ["- 2 cups flour", { amount: "2", unit: "cup", text: "flour" }],
    ["2 15-ounce cans black beans", { amount: "2", text: "15-ounce cans black beans" }],
    ["1 1⁄2 cups oats", { amount: "1 1/2", unit: "cup", text: "oats" }],
  ])("parses %j", (input, expected) => {
    expect(parseIngredient(input)).toEqual(expected);
  });

  it.each([
    "Salt to taste",
    "Freshly ground pepper",
    "Pinch of red pepper flakes",
    "Juice of 1 lemon",
    "a handful of basil",
    "2% milk",
    "3eggs",
    "2 cups",
    "1-inch piece ginger",
  ])("keeps %j as text when unsure", (input) => {
    expect(parseIngredient(input)).toEqual({ text: input });
  });

  it("collapses whitespace", () => {
    expect(parseIngredient("  2  tsp   smoked paprika ")).toEqual({
      amount: "2",
      unit: "tsp",
      text: "smoked paprika",
    });
  });

  it("does not take a hyphenated word for a unit", () => {
    expect(parseIngredient("2 T-bone steaks")).toEqual({ amount: "2", text: "T-bone steaks" });
  });

  it("returns empty text for empty input", () => {
    expect(parseIngredient("   ")).toEqual({ text: "" });
  });
});

describe("tidyParentheses", () => {
  it("unwraps doubled and comma-led notes", () => {
    expect(tidyParentheses("stock (, low-sodium (note 4))")).toBe("stock (low-sodium (note 4))");
    expect(tidyParentheses("thighs ((~250g each) (Note 1))")).toBe("thighs (~250g each) (Note 1)");
    expect(tidyParentheses("oil ((or any neutral oil))")).toBe("oil (or any neutral oil)");
    expect(tidyParentheses("butter ()")).toBe("butter ");
  });

  it("leaves unbalanced text alone", () => {
    expect(tidyParentheses("sugar (see note")).toBe("sugar (see note");
    expect(tidyParentheses("sugar) (x")).toBe("sugar) (x");
  });
});
