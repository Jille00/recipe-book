import { describe, expect, it } from "vitest";
import {
  collectRecipeNodes,
  findJsonLdBlocks,
  findRecipeNode,
  hasRecipeType,
  parseJsonLdBlock,
} from "./json-ld";

const page = (...scripts: string[]) =>
  `<!doctype html><html><head><title>Page</title>${scripts.join("\n")}</head><body><p>Hi</p></body></html>`;

const ld = (json: unknown) => `<script type="application/ld+json">${JSON.stringify(json)}</script>`;

describe("findJsonLdBlocks", () => {
  it("finds blocks regardless of attribute order, quoting, casing and whitespace", () => {
    const html = [
      `<script type="application/ld+json">{"a":1}</script>`,
      `<script id="x" type='application/ld+json' class="y">{"a":2}</script>`,
      `<SCRIPT TYPE = "Application/LD+JSON" >{"a":3}</SCRIPT >`,
      `<script type=application/ld+json>{"a":4}</script>`,
      `<script\n  data-rh="true"\n  type="application/ld+json; charset=utf-8">{"a":5}</script>`,
      `<script type="text/javascript">{"a":6}</script>`,
      `<script>{"a":7}</script>`,
      `<script type="application/json">{"a":8}</script>`,
    ].join("");
    expect(findJsonLdBlocks(html)).toEqual(['{"a":1}', '{"a":2}', '{"a":3}', '{"a":4}', '{"a":5}']);
  });
});

describe("parseJsonLdBlock", () => {
  it("parses plain JSON", () => {
    expect(parseJsonLdBlock(' {"@type":"Recipe"} ')).toEqual({ "@type": "Recipe" });
  });

  it("tolerates HTML comment and CDATA wrappers", () => {
    expect(parseJsonLdBlock('<!-- {"a":1} -->')).toEqual({ a: 1 });
    expect(parseJsonLdBlock('//<![CDATA[\n{"a":2}\n//]]>')).toEqual({ a: 2 });
    expect(parseJsonLdBlock('<![CDATA[<!--{"a":3}-->]]>')).toEqual({ a: 3 });
  });

  it("tolerates raw line breaks and tabs inside strings", () => {
    expect(parseJsonLdBlock('{"text":"line one\nline\ttwo"}')).toEqual({ text: "line one line two" });
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseJsonLdBlock("{not json")).toBeUndefined();
    expect(parseJsonLdBlock("")).toBeUndefined();
  });
});

describe("hasRecipeType", () => {
  it.each([
    ["Recipe"],
    [["Recipe", "NewsArticle"]],
    ["http://schema.org/Recipe"],
    ["https://schema.org/Recipe"],
    ["schema:Recipe"],
    [" recipe "],
  ])("accepts %j", (type) => {
    expect(hasRecipeType({ "@type": type })).toBe(true);
  });

  it.each([["Article"], [["WebPage"]], [undefined], [42], ["RecipeCollection"]])("rejects %j", (type) => {
    expect(hasRecipeType({ "@type": type })).toBe(false);
  });
});

describe("findRecipeNode", () => {
  it("finds a plain Recipe", () => {
    const html = page(ld({ "@context": "https://schema.org", "@type": "Recipe", name: "Soup" }));
    expect(findRecipeNode(html)?.name).toBe("Soup");
  });

  it("finds a Recipe inside a Yoast @graph and resolves @id references", () => {
    const html = page(
      ld({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", "@id": "https://blog.test/soup/", name: "Soup page" },
          {
            "@type": "ImageObject",
            "@id": "https://blog.test/soup/#primaryimage",
            url: "https://blog.test/soup.jpg",
          },
          {
            "@type": "Recipe",
            name: "Blog soup",
            image: { "@id": "https://blog.test/soup/#primaryimage" },
            recipeIngredient: ["1 onion"],
          },
        ],
      })
    );
    const node = findRecipeNode(html);
    expect(node?.name).toBe("Blog soup");
    expect(node?.image).toEqual({
      "@type": "ImageObject",
      "@id": "https://blog.test/soup/#primaryimage",
      url: "https://blog.test/soup.jpg",
    });
  });

  it("finds a Recipe in a top-level array and with an array @type", () => {
    const html = page(ld([{ "@type": "Organization" }, { "@type": ["Recipe", "NewsArticle"], name: "Stew" }]));
    expect(findRecipeNode(html)?.name).toBe("Stew");
  });

  it("finds a Recipe typed with a schema IRI", () => {
    const html = page(ld({ "@type": "http://schema.org/Recipe", name: "Pie" }));
    expect(findRecipeNode(html)?.name).toBe("Pie");
  });

  it("finds a Recipe nested as a page's mainEntity", () => {
    const html = page(ld({ "@type": "WebPage", mainEntity: { "@type": "Recipe", name: "Nested" } }));
    expect(findRecipeNode(html)?.name).toBe("Nested");
  });

  it("skips invalid JSON blocks mixed with a valid one", () => {
    const html = page(
      `<script type="application/ld+json">{ this is broken </script>`,
      `<script type="application/ld+json"></script>`,
      ld({ "@type": "Recipe", name: "Valid" }),
      `<script type="application/ld+json">[1,2,</script>`
    );
    expect(findRecipeNode(html)?.name).toBe("Valid");
  });

  it("prefers the most complete of several recipes", () => {
    const html = page(
      ld({ "@type": "Recipe", name: "Teaser" }),
      ld({
        "@type": "Recipe",
        name: "Full",
        recipeIngredient: ["1 egg", "2 cups flour"],
        recipeInstructions: ["Mix.", "Bake."],
      }),
      ld({ "@type": "Recipe", name: "Partial", recipeIngredient: ["1 egg"] })
    );
    expect(findRecipeNode(html)?.name).toBe("Full");
  });

  it("returns undefined without recipe data", () => {
    expect(findRecipeNode(page(ld({ "@type": "Article", name: "News" })))).toBeUndefined();
    expect(findRecipeNode("<p>no scripts</p>")).toBeUndefined();
  });

  it("does not loop on deeply nested or large structures", () => {
    let deep: Record<string, unknown> = { "@type": "Recipe", name: "Too deep" };
    for (let i = 0; i < 50; i++) deep = { child: deep };
    expect(collectRecipeNodes([deep])).toEqual([]);
  });
});
