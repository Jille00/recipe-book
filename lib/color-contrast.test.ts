import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AA_TEXT,
  AA_UI,
  blend,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from "./color-contrast";

describe("parseHex", () => {
  it("reads 6- and 3-digit hex", () => {
    expect(parseHex("#c75d3a")).toEqual([199, 93, 58]);
    expect(parseHex("fff")).toEqual([255, 255, 255]);
  });

  it("rejects anything else", () => {
    expect(() => parseHex("red")).toThrow();
    expect(() => parseHex("#12345")).toThrow();
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for equal colours", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#1a1816", "#fffcf8")).toBeCloseTo(
      contrastRatio("#fffcf8", "#1a1816"),
      10
    );
  });

  it("matches the guide's published light-mode ratio", () => {
    // STYLE_GUIDE 09: charcoal on cream is ~9.4 (guide rounds loosely)
    expect(contrastRatio("#4a4640", "#fffcf8")).toBeGreaterThan(7);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("blend", () => {
  it("returns the background at alpha 0 and the foreground at alpha 1", () => {
    expect(blend("#ff0000", "#0000ff", 0)).toEqual([0, 0, 255]);
    expect(blend("#ff0000", "#0000ff", 1)).toEqual([255, 0, 0]);
    expect(blend("#ffffff", "#000000", 0.5)).toEqual([128, 128, 128]);
  });
});

/** The custom properties declared in the first `selector {` block. */
function readBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block`);
  const body = css.slice(start, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) {
    vars[match[1]] = match[2];
  }
  return vars;
}

describe("dark theme tokens (app/globals.css) meet WCAG AA", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const dark = readBlock(css, ".dark");
  const palette = readBlock(css, "@theme inline");
  const surfaces = {
    background: dark.background,
    card: dark.card,
    muted: dark.muted,
  };

  const textPairs: Array<[fg: string, bg: string]> = [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["popover-foreground", "popover"],
    ["primary-foreground", "primary"],
    ["primary-foreground", "primary-hover"],
    ["primary-foreground", "destructive"],
    ["primary-foreground", "destructive-hover"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "muted"],
    ["accent-foreground", "accent"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-primary-foreground", "sidebar-primary"],
    ["sidebar-accent-foreground", "sidebar-accent"],
  ];

  it.each(textPairs)("%s on %s >= 4.5:1", (fg, bg) => {
    expect(contrastRatio(dark[fg], dark[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  // Tokens used as text colour directly on any surface.
  it.each(["foreground", "muted-foreground", "primary", "destructive", "secondary-foreground"])(
    "%s as text on every dark surface >= 4.5:1",
    (token) => {
      for (const surface of Object.values(surfaces)) {
        expect(contrastRatio(dark[token], surface)).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  );

  it.each(["input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"])(
    "%s as a UI boundary / graphic on every dark surface >= 3:1",
    (token) => {
      for (const surface of Object.values(surfaces)) {
        expect(contrastRatio(dark[token], surface)).toBeGreaterThanOrEqual(AA_UI);
      }
    }
  );

  it("the dark difficulty badges keep 4.5:1 on their tints over the card", () => {
    const card = dark.card;
    // components/ui/badge.tsx dark variants
    expect(
      contrastRatio(palette["color-sage-300"], blend(palette["color-sage-400"], card, 0.15))
    ).toBeGreaterThanOrEqual(AA_TEXT);
    expect(
      contrastRatio(palette["color-amber-300"], blend(palette["color-amber"], card, 0.15))
    ).toBeGreaterThanOrEqual(AA_TEXT);
    expect(
      contrastRatio(palette["color-paprika-300"], blend(palette["color-paprika"], card, 0.2))
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
