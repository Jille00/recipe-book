import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  extractPageTitle,
  extractReadableText,
  findMetaContent,
  htmlToLines,
  htmlToPlainText,
  readAttribute,
} from "./html-text";

describe("decodeHtmlEntities", () => {
  it.each([
    ["Mac &amp; cheese", "Mac & cheese"],
    ["Grandma&#39;s pie", "Grandma's pie"],
    ["Grandma&#x27;s pie", "Grandma's pie"],
    ["Grandma&#X27;s pie", "Grandma's pie"],
    ["&quot;best&quot;", '"best"'],
    // Non-breaking and other typographic spaces become plain spaces.
    ["a&nbsp;b&thinsp;c", "a b c"],
    ["&frac12; cup", "½ cup"],
    ["cr&egrave;me br&ucirc;l&eacute;e", "crème brûlée"],
    ["180&deg;C", "180°C"],
    ["it&#8217;s", "it’s"],
    ["it&#146;s", "it’s"],
    ["&lt;b&gt;", "<b>"],
    ["&unknown; stays", "&unknown; stays"],
    ["no entities", "no entities"],
    ["&#0; and &#xD800; dropped", " and  dropped"],
  ])("decodes %j", (input, expected) => {
    expect(decodeHtmlEntities(input)).toBe(expected);
  });

  it("decodes double-encoded text once more", () => {
    expect(decodeHtmlEntities("Grandma&amp;#39;s &amp;amp; co")).toBe("Grandma's & co");
  });
});

describe("htmlToPlainText", () => {
  it("strips tags, decodes entities and collapses whitespace", () => {
    expect(htmlToPlainText("<p>Mix the <strong>flour</strong>&nbsp;and\n  sugar.</p>")).toBe(
      "Mix the flour and sugar."
    );
  });

  it("strips markup that was entity encoded", () => {
    expect(htmlToPlainText("&lt;p&gt;Hello&lt;/p&gt;")).toBe("Hello");
  });

  it("keeps comparisons that are not tags", () => {
    expect(htmlToPlainText("use < 5 g & > 2 g")).toBe("use < 5 g & > 2 g");
  });

  it("removes comments", () => {
    expect(htmlToPlainText("a<!-- hidden -->b")).toBe("a b");
  });

  it("handles non-strings", () => {
    expect(htmlToPlainText(undefined)).toBe("");
    expect(htmlToPlainText(4)).toBe("4");
    expect(htmlToPlainText({})).toBe("");
  });
});

describe("htmlToLines", () => {
  it("turns block elements and breaks into lines", () => {
    expect(htmlToLines("<p>One</p><p>Two<br>Three</p><ul><li>Four</li><li>Five</li></ul>")).toEqual([
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
    ]);
  });

  it("splits on newlines and drops empty lines", () => {
    expect(htmlToLines("Step one.\r\n\r\n  Step two.  \nStep three.")).toEqual([
      "Step one.",
      "Step two.",
      "Step three.",
    ]);
  });
});

describe("extractReadableText", () => {
  it("drops scripts, styles and navigation and keeps content lines", () => {
    const html = `<html><head><title>T</title><style>.a{}</style></head><body>
      <nav><a href="/">Home</a></nav>
      <script>var secret = "x";</script>
      <h1>Pancakes</h1><p>Mix &amp; fry.</p>
      <footer>Copyright</footer></body></html>`;
    const text = extractReadableText(html);
    expect(text).toBe("Pancakes\nMix & fry.");
  });

  it("prefers <main> when it has enough text", () => {
    const main = "Ingredient line. ".repeat(40);
    const html = `<body><div>Sidebar junk</div><main><p>${main}</p></main></body>`;
    expect(extractReadableText(html)).toBe(main.trim());
  });
});

describe("page metadata", () => {
  it("reads og:title before <title>", () => {
    expect(
      extractPageTitle(`<meta property="og:title" content="Best &amp; Pie"><title>Site</title>`)
    ).toBe("Best & Pie");
    expect(extractPageTitle("<title> Lemon  cake </title>")).toBe("Lemon cake");
    expect(extractPageTitle("<p>nothing</p>")).toBeUndefined();
  });

  it("reads meta content regardless of attribute order and quoting", () => {
    expect(findMetaContent(`<meta content='https://x.test/a.jpg' property='og:image'>`, "og:image")).toBe(
      "https://x.test/a.jpg"
    );
    expect(findMetaContent(`<META NAME=og:image CONTENT=https://x.test/b.jpg>`, "og:image")).toBe(
      "https://x.test/b.jpg"
    );
  });

  it("reads attributes", () => {
    expect(readAttribute(`<script type="application/ld+json">`, "type")).toBe("application/ld+json");
    expect(readAttribute(`<script data-type="x">`, "type")).toBeUndefined();
  });
});
