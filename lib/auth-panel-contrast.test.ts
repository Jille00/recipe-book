import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AA_TEXT, contrastRatio } from "./color-contrast";
import {
  AUTH_PANEL_ATTRIBUTION_TEXT,
  AUTH_PANEL_QUOTE_TEXT,
  AUTH_PANEL_SURFACE,
} from "@/app/(auth)/_components/auth-panel-classes";

/**
 * The quote beside the auth forms (app/(auth)/_components/auth-shell.tsx):
 * a Delft tile wall with the quote on an opaque card block, so the text sits
 * on that block's background and never on the painted tiles. Checked here in
 * both themes, straight from the classes the shell uses and app/globals.css.
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

/** A Tailwind colour name (`card`, `delft`) to hex in `theme`. */
function color(name: string, theme: Theme): string {
  const value = themes[theme][name] ?? palette[`color-${name}`];
  if (!value) throw new Error(`Unknown colour ${name}`);
  return value;
}

/** `bg-card` / `text-foreground` to the colour name; opaque classes only. */
function colorName(className: string, prefix: "bg" | "text"): string {
  const match = className.match(new RegExp(`^${prefix}-([\\w-]+)$`));
  if (!match) throw new Error(`Expected a single opaque ${prefix}- class, got "${className}"`);
  return match[1];
}

const authDir = join(root, "app/(auth)");
const shellSource = readFileSync(join(authDir, "_components/auth-shell.tsx"), "utf8");
const pages = readdirSync(authDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => join(entry.name, "page.tsx"));

describe("auth quote panel text meets WCAG AA", () => {
  it("every auth page uses the shell with the tile wall", () => {
    expect(pages.length).toBeGreaterThanOrEqual(5);
    for (const file of pages) {
      expect(readFileSync(join(authDir, file), "utf8"), file).toContain("<AuthShell");
    }
  });

  it("the shell puts the quote on the checked surface with the checked text colours", () => {
    expect(shellSource).toContain("<DelftWall");
    expect(shellSource).toContain("AUTH_PANEL_SURFACE");
    expect(shellSource).toContain("AUTH_PANEL_QUOTE_TEXT");
    expect(shellSource).toContain("AUTH_PANEL_ATTRIBUTION_TEXT");
  });

  it.each(["light", "dark"] as const)("in %s mode", (theme) => {
    const surface = color(colorName(AUTH_PANEL_SURFACE, "bg"), theme);
    for (const textClass of [AUTH_PANEL_QUOTE_TEXT, AUTH_PANEL_ATTRIBUTION_TEXT]) {
      const text = colorName(textClass, "text");
      expect(
        contrastRatio(color(text, theme), surface),
        `${text} on ${AUTH_PANEL_SURFACE} (${theme})`
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
