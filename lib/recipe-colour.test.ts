import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AA_TEXT, contrastRatio } from "./color-contrast";
import {
  RECIPE_COLOURS,
  automaticRecipeColour,
  colourForTags,
  isRecipeColour,
  hashSeed,
  recipeColour,
  recipeColourClass,
} from "./recipe-colour";

describe("hashSeed", () => {
  it("is stable and unsigned", () => {
    expect(hashSeed("kookboek")).toBe(hashSeed("kookboek"));
    expect(hashSeed("")).toBeGreaterThanOrEqual(0);
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });
});

describe("colourForTags", () => {
  it.each([
    [["Seafood"], "sea"],
    [["soups-stews"], "carrot"],
    [["Desserts"], "beet"],
    [["Bread"], "rye"],
    [["baking"], "butter"],
    [["Breakfast"], "lemon"],
    [["Drinks"], "lemon"],
    [["Vegan"], "basil"],
    [["Pasta"], "tomato"],
    [["poultry"], "tomato"],
    [["Dinner"], "plum"],
  ])("maps %j to %s", (tags, colour) => {
    expect(colourForTags(tags)).toBe(colour);
  });

  it("prefers the most specific tag over the tag order", () => {
    expect(colourForTags(["dinner", "seafood"])).toBe("sea");
    expect(colourForTags(["dinner", "meat"])).toBe("tomato");
    expect(colourForTags(["dinner", "vegan", "vegetarian"])).toBe("basil");
    expect(colourForTags(["baking", "desserts"])).toBe("beet");
  });

  it("ignores tags it doesn't know", () => {
    expect(colourForTags(["Gluten-free"])).toBeNull();
    expect(colourForTags(undefined)).toBeNull();
  });
});

describe("recipeColour", () => {
  it("is stable per recipe and always one of the nine", () => {
    const colour = recipeColour("vqbjxsxze3jx");
    expect(recipeColour("vqbjxsxze3jx")).toBe(colour);
    expect(RECIPE_COLOURS).toContain(colour);
    expect(RECIPE_COLOURS).toContain(recipeColour(""));
  });

  it("lets the tags win over the seed", () => {
    expect(recipeColour("vqbjxsxze3jx", ["Seafood"])).toBe("sea");
    expect(recipeColourClass("vqbjxsxze3jx", ["Seafood"])).toBe("recipe-sea");
  });

  it("spreads untagged recipes over several colours", () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => recipeColour(`recipe-${i}`)));
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });
});

describe("a colour the cook picked", () => {
  it("wins over the tags and the seed", () => {
    expect(recipeColour("vqbjxsxze3jx", ["Seafood"], "butter")).toBe("butter");
    expect(recipeColourClass("vqbjxsxze3jx", ["Seafood"], "butter")).toBe("recipe-butter");
  });

  it("falls back to automatic when nothing, or nonsense, is stored", () => {
    const automatic = automaticRecipeColour("vqbjxsxze3jx", ["Seafood"]);
    expect(automatic).toBe("sea");
    expect(recipeColour("vqbjxsxze3jx", ["Seafood"], null)).toBe(automatic);
    expect(recipeColour("vqbjxsxze3jx", ["Seafood"], "")).toBe(automatic);
    expect(recipeColour("vqbjxsxze3jx", ["Seafood"], "chartreuse")).toBe(automatic);
  });

  it("recognises exactly the nine names", () => {
    for (const colour of RECIPE_COLOURS) expect(isRecipeColour(colour)).toBe(true);
    for (const value of ["", "Tomato", "recipe-tomato", null, undefined, 3]) {
      expect(isRecipeColour(value)).toBe(false);
    }
  });
});

describe("recipe colour pairs (app/globals.css) meet WCAG AA", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  /** The --recipe / --on-recipe pair declared by `selector {`. */
  function pair(selector: string): [string, string] {
    const start = css.indexOf(`${selector} {`);
    if (start === -1) throw new Error(`No ${selector} block`);
    const body = css.slice(start, css.indexOf("}", start));
    const read = (name: string) => body.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
    return [read("recipe") ?? "", read("on-recipe") ?? ""];
  }

  it.each(RECIPE_COLOURS)("%s carries its text at >= 4.5:1", (colour) => {
    const [recipe, onRecipe] = pair(`.recipe-${colour}`);
    expect(contrastRatio(onRecipe, recipe)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("plum at night still carries its text", () => {
    const [nightPlum] = pair(".dark .recipe-plum");
    const [, onPlum] = pair(".recipe-plum");
    expect(contrastRatio(onPlum, nightPlum)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
