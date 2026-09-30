/**
 * WCAG 2.x contrast helpers. Pure functions, used by the token audit test
 * (lib/color-contrast.test.ts) that keeps app/globals.css at AA.
 */

export type Rgb = readonly [number, number, number];

/** "#rgb" or "#rrggbb" to [r, g, b] (0-255). Throws on anything else. */
export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as unknown as Rgb;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(color: string | Rgb): number {
  const [r, g, b] = typeof color === "string" ? parseHex(color) : color;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours, 1 to 21. Order does not matter. */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The colour a translucent `fg` at `alpha` (0-1) produces over an opaque
 * `bg`, e.g. Tailwind's `bg-success/10` over a white card.
 */
export function blend(fg: string, bg: string, alpha: number): Rgb {
  const f = parseHex(fg);
  const b = parseHex(bg);
  return [0, 1, 2].map((i) => Math.round(f[i] * alpha + b[i] * (1 - alpha))) as unknown as Rgb;
}

/** WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
export const AA_TEXT = 4.5;
export const AA_UI = 3;
