import { describe, expect, it } from "vitest";
import {
  RECIPE_CAPS,
  enforceRecipeCaps,
  flattenInstructions,
  isUsableRecipe,
  mapRecipeNode,
  parseIsoDuration,
  parseYield,
  resolveImageUrl,
  resolveTimes,
  truncate,
} from "./map-recipe";
import { findRecipeNode } from "./json-ld";

const PAGE = "https://www.example.com/recipes/soup/";

describe("parseIsoDuration", () => {
  it.each([
    ["PT15M", 15],
    ["PT1H30M", 90],
    ["P0DT2H", 120],
    ["PT90M", 90],
    ["P0DT0H15M", 15],
    ["PT0H25M", 25],
    ["P1D", 1440],
    ["P1DT1H", 1500],
    ["PT1.5H", 90],
    ["PT45S", 1],
    ["pt20m", 20],
    [" PT10M ", 10],
  ])("%s is %i minutes", (input, minutes) => {
    expect(parseIsoDuration(input)).toBe(minutes);
  });

  it.each([["PT0M"], ["P0DT0H0M"], ["P"], ["PT"], ["20 minutes"], ["15"], ["P1Y"], ["P2W"], ["PT-5M"], [""], [15], [null], [undefined], ["P40D"]])(
    "%j is undefined",
    (input) => {
      expect(parseIsoDuration(input)).toBeUndefined();
    }
  );
});

describe("resolveTimes", () => {
  it("uses prep and cook when present", () => {
    expect(resolveTimes({ prepTime: "PT10M", cookTime: "PT20M", totalTime: "PT45M" })).toEqual({
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
    });
  });

  it("derives cook time as total minus prep", () => {
    expect(resolveTimes({ prepTime: "PT15M", totalTime: "PT1H" })).toEqual({
      prepTimeMinutes: 15,
      cookTimeMinutes: 45,
    });
  });

  it("does not derive a zero or negative cook time", () => {
    expect(resolveTimes({ prepTime: "PT15M", cookTime: "P0DT0H0M", totalTime: "PT15M" })).toEqual({
      prepTimeMinutes: 15,
      cookTimeMinutes: undefined,
    });
    expect(resolveTimes({ prepTime: "PT30M", totalTime: "PT20M" }).cookTimeMinutes).toBeUndefined();
  });

  it("uses total time as cook time when it is all there is", () => {
    expect(resolveTimes({ totalTime: "PT20M" })).toEqual({ prepTimeMinutes: undefined, cookTimeMinutes: 20 });
  });
});

describe("parseYield", () => {
  it.each([
    [4, 4],
    [4.5, 4],
    ["4", 4],
    ["4 servings", 4],
    [["4", "4 servings"], 4],
    [["", "6 personen"], 6],
    ["Makes 12 cookies", 12],
    ["4-6", 4],
    ["Serves 0 to 2", 2],
    [{ "@type": "QuantitativeValue", value: 8 }, 8],
  ])("%j yields %i", (input, expected) => {
    expect(parseYield(input)).toBe(expected);
  });

  it.each([[undefined], [""], ["a few"], [0], [-3], [[]], ["100000 crumbs"]])("%j yields nothing", (input) => {
    expect(parseYield(input)).toBeUndefined();
  });
});

describe("flattenInstructions", () => {
  it("splits a plain string on line breaks", () => {
    expect(flattenInstructions("Chop the onion.\nFry it.\n\nServe.")).toEqual([
      "Chop the onion.",
      "Fry it.",
      "Serve.",
    ]);
  });

  it("keeps a string without line breaks as one step", () => {
    expect(flattenInstructions("Mix everything and bake for 20 minutes.")).toEqual([
      "Mix everything and bake for 20 minutes.",
    ]);
  });

  it("splits an HTML string on paragraphs and list items", () => {
    expect(flattenInstructions("<ol><li>Boil &amp; drain.</li><li><p>Serve</p></li></ol>")).toEqual([
      "Boil & drain.",
      "Serve",
    ]);
  });

  it("handles a string array", () => {
    expect(flattenInstructions(["Step one.", "  ", "<b>Step</b> two."])).toEqual(["Step one.", "Step two."]);
  });

  it("handles HowToStep objects, preferring text over name", () => {
    expect(
      flattenInstructions([
        { "@type": "HowToStep", name: "Stap 1", text: "Kook de pasta." },
        { "@type": "HowToStep", name: "Only a name" },
        { "@type": "HowToStep", text: "" },
      ])
    ).toEqual(["Kook de pasta.", "Only a name"]);
  });

  it("flattens HowToSections and labels them when there are several", () => {
    expect(
      flattenInstructions([
        {
          "@type": "HowToSection",
          name: "Dough",
          itemListElement: [
            { "@type": "HowToStep", text: "Mix flour." },
            { "@type": "HowToStep", text: "Knead." },
          ],
        },
        {
          "@type": "HowToSection",
          name: "Filling",
          itemListElement: [{ "@type": "HowToStep", text: "Cook apples." }],
        },
      ])
    ).toEqual(["Dough: Mix flour.", "Knead.", "Filling: Cook apples."]);
  });

  it("does not label a single section", () => {
    expect(
      flattenInstructions([
        { "@type": "HowToSection", name: "Bereiding", itemListElement: [{ "@type": "HowToStep", text: "Bak." }] },
      ])
    ).toEqual(["Bak."]);
  });

  it("handles mixtures, ItemLists and HowToDirection children", () => {
    expect(
      flattenInstructions([
        "Preheat the oven.",
        { "@type": "HowToStep", text: "Grease a tin." },
        {
          "@type": "ItemList",
          itemListElement: [{ "@type": "ListItem", text: "Pour batter." }],
        },
        {
          "@type": "HowToStep",
          itemListElement: [{ "@type": "HowToDirection", text: "Bake 20 min." }],
        },
      ])
    ).toEqual(["Preheat the oven.", "Grease a tin.", "Pour batter.", "Bake 20 min."]);
  });

  it("returns nothing for missing data", () => {
    expect(flattenInstructions(undefined)).toEqual([]);
    expect(flattenInstructions([null, 3, {}])).toEqual([]);
  });
});

describe("resolveImageUrl", () => {
  it("accepts a string, an ImageObject and arrays", () => {
    expect(resolveImageUrl("https://cdn.test/a.jpg", PAGE)).toBe("https://cdn.test/a.jpg");
    expect(resolveImageUrl({ "@type": "ImageObject", url: "https://cdn.test/b.jpg" }, PAGE)).toBe(
      "https://cdn.test/b.jpg"
    );
    expect(resolveImageUrl({ "@type": "ImageObject", contentUrl: "https://cdn.test/c.jpg" }, PAGE)).toBe(
      "https://cdn.test/c.jpg"
    );
    expect(resolveImageUrl(["https://cdn.test/d.jpg", "https://cdn.test/e.jpg"], PAGE)).toBe(
      "https://cdn.test/d.jpg"
    );
  });

  it("resolves relative URLs against the page", () => {
    expect(resolveImageUrl("/images/soup.jpg", PAGE)).toBe("https://www.example.com/images/soup.jpg");
    expect(resolveImageUrl("soup.jpg", PAGE)).toBe("https://www.example.com/recipes/soup/soup.jpg");
    expect(resolveImageUrl("//cdn.test/soup.jpg", PAGE)).toBe("https://cdn.test/soup.jpg");
  });

  it("skips empty and non-http entries", () => {
    expect(resolveImageUrl(["", "data:image/png;base64,AAAA", "javascript:x", "https://cdn.test/ok.jpg"], PAGE)).toBe(
      "https://cdn.test/ok.jpg"
    );
    expect(resolveImageUrl(["", { url: 5 }], PAGE)).toBeUndefined();
    expect(resolveImageUrl(undefined, PAGE)).toBeUndefined();
  });

  it("prefers the original or largest size over small thumbnails", () => {
    expect(
      resolveImageUrl(
        [
          "https://blog.test/soup-225x225.jpg",
          "https://blog.test/soup-1200x800.jpg",
          "https://blog.test/soup-500x375.jpg",
        ],
        PAGE
      )
    ).toBe("https://blog.test/soup-1200x800.jpg");
    expect(
      resolveImageUrl(["https://blog.test/soup-225x225.jpg", "https://blog.test/soup.jpg"], PAGE)
    ).toBe("https://blog.test/soup.jpg");
    expect(
      resolveImageUrl(
        [
          { url: "https://cdn.test/small.jpg", width: 100, height: 100 },
          { url: "https://cdn.test/big.jpg", width: "1600", height: "900" },
        ],
        PAGE
      )
    ).toBe("https://cdn.test/big.jpg");
  });
});

describe("truncate", () => {
  it("leaves short text alone and cuts long text within the limit", () => {
    expect(truncate("short", 10)).toBe("short");
    const cut = truncate("word ".repeat(100), 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith("…")).toBe(true);
  });
});

describe("enforceRecipeCaps", () => {
  it("truncates text fields and limits counts to what saving accepts", () => {
    const { recipe, warnings } = enforceRecipeCaps({
      title: "T".repeat(300),
      description: "D".repeat(1500),
      ingredients: Array.from({ length: 120 }, (_, i) => ({
        text: `ingredient ${i} ${"x".repeat(600)}`,
        amount: "1".repeat(60),
        unit: "u".repeat(60),
      })),
      instructions: Array.from({ length: 130 }, (_, i) => ({ step: i + 7, text: "s".repeat(2500) })),
      servings: 2.4,
      prepTimeMinutes: 10.6,
    });
    expect(recipe.title.length).toBeLessThanOrEqual(RECIPE_CAPS.title);
    expect(recipe.description!.length).toBeLessThanOrEqual(RECIPE_CAPS.description);
    expect(recipe.ingredients).toHaveLength(100);
    expect(recipe.ingredients.every((i) => i.text.length <= 500)).toBe(true);
    expect(recipe.ingredients.every((i) => i.amount!.length <= 50 && i.unit!.length <= 50)).toBe(true);
    expect(recipe.instructions).toHaveLength(100);
    expect(recipe.instructions.every((s) => s.text.length <= 2000)).toBe(true);
    expect(recipe.instructions.map((s) => s.step)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(recipe.servings).toBe(2);
    expect(recipe.prepTimeMinutes).toBe(11);
    expect(warnings).toHaveLength(2);
  });

  it("drops empty steps and ingredients and renumbers", () => {
    const { recipe } = enforceRecipeCaps({
      title: "x",
      ingredients: [{ text: "" }, { text: "salt" }],
      instructions: [
        { step: 1, text: " " },
        { step: 2, text: "Go." },
      ],
      servings: 0,
    });
    expect(recipe.ingredients).toEqual([{ text: "salt" }]);
    expect(recipe.instructions).toEqual([{ step: 1, text: "Go." }]);
    expect(recipe.servings).toBeUndefined();
  });
});

describe("mapRecipeNode", () => {
  const fullNode = {
    "@type": "Recipe",
    name: "Grandma&#39;s <em>Tomato</em> Soup",
    description: "<p>Warm &amp; cosy.</p>",
    image: ["", { "@type": "ImageObject", url: "/img/soup.jpg" }],
    recipeYield: ["4", "4 servings"],
    prepTime: "PT15M",
    totalTime: "PT1H",
    recipeCategory: ["Soup", "Dinner"],
    recipeIngredient: ["1 (14 oz) can tomatoes", "2-3 cloves garlic", "Salt to taste", "  "],
    recipeInstructions: [
      { "@type": "HowToStep", text: "Fry the garlic." },
      { "@type": "HowToStep", text: "Add tomatoes &amp; simmer." },
    ],
  };

  it("maps a complete recipe with high confidence", () => {
    const result = mapRecipeNode(fullNode, { pageUrl: PAGE });
    expect(result).toEqual({
      recipe: {
        title: "Grandma's Tomato Soup",
        description: "Warm & cosy.",
        ingredients: [
          { amount: "1", unit: "can", text: "tomatoes (14 oz)" },
          { amount: "2-3", unit: "cloves", text: "garlic" },
          { text: "Salt to taste" },
        ],
        instructions: [
          { step: 1, text: "Fry the garlic." },
          { step: 2, text: "Add tomatoes & simmer." },
        ],
        prepTimeMinutes: 15,
        cookTimeMinutes: 45,
        servings: 4,
        suggestedCategory: "Soup, Dinner",
        imageUrl: "https://www.example.com/img/soup.jpg",
      },
      confidence: "high",
      warnings: [],
    });
    expect(isUsableRecipe(result)).toBe(true);
  });

  it("uses the fallback title and warns about what is missing", () => {
    const result = mapRecipeNode(
      { "@type": "Recipe", recipeIngredient: ["1 egg"] },
      { pageUrl: PAGE, fallbackTitle: "Page title" }
    );
    expect(result.recipe.title).toBe("Page title");
    expect(result.confidence).toBe("medium");
    expect(result.warnings).toEqual(["The page did not include instructions. Please add them yourself."]);
    expect(isUsableRecipe(result)).toBe(true);
  });

  it("reports several missing parts", () => {
    const result = mapRecipeNode({ "@type": "Recipe" }, { pageUrl: PAGE });
    expect(result.confidence).toBe("medium");
    expect(result.warnings?.[0]).toBe(
      "The page did not include a title, ingredients or instructions. Please add them yourself."
    );
    expect(isUsableRecipe(result)).toBe(false);
    expect(result.recipe).toEqual({ title: "", ingredients: [], instructions: [] });
  });

  it("maps a WordPress/Yoast page end to end", () => {
    const html = `<html><head>
      <script type="application/ld+json" class="yoast-schema-graph">{"@context":"https://schema.org","@graph":[
        {"@type":"Article","@id":"https://blog.test/pie/#article","headline":"Pie"},
        {"@type":"ImageObject","@id":"https://blog.test/pie/#primaryimage","url":"https://blog.test/pie.jpg"},
        {"@type":"Recipe","name":"Apple Pie","image":{"@id":"https://blog.test/pie/#primaryimage"},
         "recipeYield":["8","8 slices"],"prepTime":"PT30M","cookTime":"PT45M",
         "recipeIngredient":["2 &frac12; cups flour","1 cup cold butter, cubed","6 apples"],
         "recipeInstructions":[{"@type":"HowToSection","name":"Crust","itemListElement":[{"@type":"HowToStep","text":"Make the crust."}]},
                               {"@type":"HowToSection","name":"Filling","itemListElement":[{"@type":"HowToStep","text":"Slice apples."},{"@type":"HowToStep","text":"Bake."}]}]}
      ]}</script></head><body></body></html>`;
    const node = findRecipeNode(html);
    expect(node).toBeDefined();
    const result = mapRecipeNode(node!, { pageUrl: "https://blog.test/pie/" });
    expect(result.recipe).toMatchObject({
      title: "Apple Pie",
      servings: 8,
      prepTimeMinutes: 30,
      cookTimeMinutes: 45,
      imageUrl: "https://blog.test/pie.jpg",
      ingredients: [
        { amount: "2½", unit: "cup", text: "flour" },
        { amount: "1", unit: "cup", text: "cold butter, cubed" },
        { amount: "6", text: "apples" },
      ],
      instructions: [
        { step: 1, text: "Crust: Make the crust." },
        { step: 2, text: "Filling: Slice apples." },
        { step: 3, text: "Bake." },
      ],
    });
    expect(result.confidence).toBe("high");
  });

  it("enforces caps on mapped data", () => {
    const result = mapRecipeNode(
      {
        "@type": "Recipe",
        name: "N".repeat(500),
        recipeIngredient: Array.from({ length: 150 }, (_, i) => `${i + 1} g sugar`),
        recipeInstructions: Array.from({ length: 150 }, () => "Stir."),
      },
      { pageUrl: PAGE }
    );
    expect(result.recipe.title.length).toBeLessThanOrEqual(200);
    expect(result.recipe.ingredients).toHaveLength(100);
    expect(result.recipe.instructions).toHaveLength(100);
    expect(result.warnings).toHaveLength(2);
  });
});
