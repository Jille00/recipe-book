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
    // STYLE_GUIDE 01: fig on leek is 5.69
    expect(contrastRatio("#6a5a70", "#f1f4e8")).toBeCloseTo(5.69, 1);
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

  it("the difficulty badges keep 4.5:1 on their tints, day and night", () => {
    // components/ui/badge.tsx: status colour as text on a 10% (day) or 15%
    // (night) tint of itself over the card.
    const day = "#ffffff";
    for (const status of ["success", "warning", "danger"]) {
      const colour = palette[`color-${status}`];
      expect(contrastRatio(colour, blend(colour, day, 0.1))).toBeGreaterThanOrEqual(AA_TEXT);
      const light = palette[`color-${status}-light`];
      expect(contrastRatio(light, blend(light, dark.card, 0.15))).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("light theme tokens (app/globals.css) meet WCAG AA", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const light = readBlock(css, ":root");
  const palette = readBlock(css, "@theme inline");
  const surfaces = {
    background: light.background,
    card: light.card,
    muted: light.muted,
  };

  it.each([
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["primary-foreground", "primary"],
    ["primary-foreground", "primary-hover"],
    ["cta-foreground", "cta"],
    ["cta-foreground", "cta-hover"],
    ["secondary-foreground", "secondary"],
    ["muted-foreground", "muted"],
    ["accent-foreground", "accent"],
  ])("%s on %s >= 4.5:1", (fg, bg) => {
    expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(["foreground", "muted-foreground", "primary", "destructive"])(
    "%s as text on every light surface >= 4.5:1",
    (token) => {
      for (const surface of Object.values(surfaces)) {
        expect(contrastRatio(light[token], surface)).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  );

  it.each(["input", "ring"])("%s as a UI boundary on every light surface >= 3:1", (token) => {
    for (const surface of Object.values(surfaces)) {
      expect(contrastRatio(light[token], surface)).toBeGreaterThanOrEqual(AA_UI);
    }
  });

  it("the footer's leek text reads on its aubergine band, also at 75%", () => {
    const ink = palette["color-ink"];
    const leek = palette["color-leek"];
    expect(contrastRatio(leek, ink)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(blend(leek, ink, 0.75), ink)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
