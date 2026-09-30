import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AA_TEXT, blend, contrastRatio, type Rgb } from "./color-contrast";

/**
 * The quote panel beside the auth forms (app/(auth)/<page>/page.tsx): a
 * translucent `bg-gradient-to-br from-{colour}/{alpha} via-… to-…` wash over the page
 * background, with the quote in `text-foreground/80` and the attribution in
 * `text-charcoal dark:text-muted-foreground`. Checked against every gradient
 * stop, in both themes, straight from the page sources and app/globals.css.
 */

const root = process.cwd();
const css = readFileSync(join(root, "app/globals.css"), "utf8");

/** The hex custom properties declared in the first `selector {` block. */
function readBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block`);
  const body = css.slice(start, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) {
    vars[match[1]] = match[2];
  }
  return vars;
}

const palette = readBlock("@theme inline");
const themes = { light: readBlock(":root"), dark: readBlock(".dark") };
type Theme = keyof typeof themes;

/** A Tailwind colour name (`primary`, `charcoal`) to hex in `theme`. */
function color(name: string, theme: Theme): string {
  const value = themes[theme][name] ?? palette[`color-${name}`];
  if (!value) throw new Error(`Unknown colour ${name}`);
  return value;
}

const toHex = (rgb: Rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** The `dark:`-aware text colour a class list gives, as [name, alpha]. */
function textColor(classes: string, theme: Theme): [string, number] {
  const tokens = classes.split(/\s+/);
  const pick = (prefix: string) =>
    tokens
      .filter((t) => t.startsWith(`${prefix}text-`))
      .map((t) => t.slice(prefix.length + "text-".length))
      .find((t) => !/^(xs|sm|base|lg|\d?xl|center|left|right)$/.test(t));
  const token = (theme === "dark" && pick("dark:")) || pick("");
  if (!token) throw new Error(`No text colour in "${classes}"`);
  const [name, alpha] = token.split("/");
  return [name, alpha ? Number(alpha) / 100 : 1];
}

const authDir = join(root, "app/(auth)");
const pages = readdirSync(authDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(entry.name, "page.tsx"))
  .filter((file) => {
    try {
      return readFileSync(join(authDir, file), "utf8").includes("bg-gradient-to-br");
    } catch {
      return false;
    }
  });

describe("auth quote panel text meets WCAG AA", () => {
  it("finds the panels", () => {
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });

  describe.each(pages)("%s", (file) => {
    const source = readFileSync(join(authDir, file), "utf8");
    const gradient = source.match(/bg-gradient-to-br ([^"]+)"/)?.[1] ?? "";
    const stops = [...gradient.matchAll(/(?:from|via|to)-([\w-]+)\/(\d+)/g)].map(
      ([, name, alpha]) => [name, Number(alpha) / 100] as const
    );
    const panelBlock = source.slice(source.indexOf("bg-gradient-to-br"));
    const quoteClasses = panelBlock.match(/<p className="([^"]*font-display[^"]*)">/)?.[1];
    const attributionClasses = panelBlock.match(/<p className="([^"]*)">—/)?.[1];

    it("has a gradient, a quote and an attribution", () => {
      expect(stops.length).toBeGreaterThanOrEqual(2);
      expect(quoteClasses).toBeTruthy();
      expect(attributionClasses).toBeTruthy();
    });

    it.each(["light", "dark"] as const)("in %s mode", (theme) => {
      const page = color("background", theme);
      for (const [name, alpha] of stops) {
        const surface = toHex(blend(color(name, theme), page, alpha));
        for (const classes of [quoteClasses!, attributionClasses!]) {
          const [text, textAlpha] = textColor(classes, theme);
          const fg = blend(color(text, theme), surface, textAlpha);
          expect(
            contrastRatio(fg, surface),
            `${text}/${textAlpha} on ${name}/${alpha} (${theme})`
          ).toBeGreaterThanOrEqual(AA_TEXT);
        }
      }
    });
  });
});
