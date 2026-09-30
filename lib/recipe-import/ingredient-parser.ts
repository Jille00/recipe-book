/**
 * Splits a free-text ingredient line ("1 1/2 cups flour, sifted") into the
 * amount / unit / text fields the recipe form uses. Deliberately conservative:
 * when a line does not clearly start with an amount (and optionally a unit),
 * the whole line is kept as text instead of being mangled.
 */

import type { ExtractedIngredient } from "@/types/extraction";
import { VULGAR_FRACTIONS, normalizeUnit } from "@/lib/utils/unit-conversion";
import { collapseWhitespace } from "./html-text";

const VULGAR_CHARS = Object.keys(VULGAR_FRACTIONS).join("");

// One quantity: "1 1/2", "1½", "1 ½", "1/2", "1.5", "1,5", "½".
const NUMBER = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${VULGAR_CHARS}]|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[${VULGAR_CHARS}])`;
// A single quantity or a range: "2-3", "2 – 3", "1 to 2".
const AMOUNT_PATTERN = new RegExp(
  `^(${NUMBER})(?:\\s*[-‐‑‒–—]\\s*(${NUMBER})|\\s+to\\s+(${NUMBER}))?(?=$|[\\s(]|[a-zA-Z])`
);

/**
 * Countable and informal units that the unit-conversion table does not know
 * about, including common Dutch ones. Words for the ingredient itself ("eggs")
 * are intentionally absent: "3 eggs" has no unit.
 */
const EXTRA_UNITS = new Set([
  "clove",
  "cloves",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "can",
  "cans",
  "tin",
  "tins",
  "jar",
  "jars",
  "sprig",
  "sprigs",
  "slice",
  "slices",
  "piece",
  "pieces",
  "stalk",
  "stalks",
  "stick",
  "sticks",
  "head",
  "heads",
  "bunch",
  "bunches",
  "handful",
  "handfuls",
  "package",
  "packages",
  "packet",
  "packets",
  "pkg",
  "bag",
  "bags",
  "box",
  "boxes",
  "bottle",
  "bottles",
  "carton",
  "cartons",
  "container",
  "containers",
  "envelope",
  "envelopes",
  "sheet",
  "sheets",
  "drop",
  "drops",
  "knob",
  "knobs",
  "splash",
  "cube",
  "cubes",
  "scoop",
  "scoops",
  "gr",
  "grs",
  // Dutch
  "el",
  "tl",
  "eetlepel",
  "eetlepels",
  "theelepel",
  "theelepels",
  "snufje",
  "snufjes",
  "teen",
  "teentje",
  "teentjes",
  "tenen",
  "stuk",
  "stuks",
  "blik",
  "blikken",
  "blikje",
  "blikjes",
  "zak",
  "zakje",
  "zakjes",
  "takje",
  "takjes",
  "bosje",
  "bosjes",
  "plak",
  "plakken",
  "plakje",
  "plakjes",
  "kopje",
  "kopjes",
  "scheutje",
  "potje",
  "potjes",
  "pakje",
  "pakjes",
]);

// Two-word units have to be tried before their first word ("fl oz", not "fl").
const MULTI_WORD_UNIT = /^(fl\.?\s*oz\.?|fluid\s+ounces?)(?=$|[\s,.)/])/i;
const WORD_UNIT = /^([a-zA-Z]+)(\.?)(?=$|[\s,)/])/;

// Parenthetical prices some blogs append: "($0.20)", "(€1,50)".
const PRICE_NOTE = /\s*\(\s*[$€£]\s*\d+(?:[.,]\d+)?\s*\)/g;

function isUnitWord(word: string): boolean {
  const lower = word.toLowerCase();
  if (EXTRA_UNITS.has(lower)) return true;
  // The unit table accepts "c" (cup) and "t"/"T" (spoons); they are real units
  // in recipes, so they are allowed, but only as a standalone word.
  return normalizeUnit(word) !== null;
}

/** Canonical form for units the conversion table knows ("tablespoons" → "tbsp"). */
function canonicalUnit(word: string): string {
  const cleaned = word.replace(/\.$/, "").replace(/\s+/g, " ");
  const lower = cleaned.toLowerCase();
  if (lower === "gr" || lower === "grs") return "g";
  if (EXTRA_UNITS.has(lower)) return lower;
  const def = normalizeUnit(cleaned) ?? normalizeUnit(lower);
  return def ? def.symbol : lower;
}

function normaliseAmount(first: string, second?: string): string {
  const one = (value: string) =>
    value
      .replace(/\s+/g, " ")
      .replace(/(\d) ([^\d\s/])/, "$1$2") // "1 ½" → "1½"
      // A decimal comma ("1,5") becomes a point; "1,000" is a thousands separator.
      .replace(/^(\d+),(\d{3})$/, "$1$2")
      .replace(/^(\d+),(\d+)$/, "$1.$2");
  return second ? `${one(first)}-${one(second)}` : one(first);
}

/** Top-level balanced "(...)" groups as [start, end] index pairs, or null if unbalanced. */
function topLevelGroups(text: string): [number, number][] | null {
  const groups: [number, number][] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === ")") {
      depth--;
      if (depth < 0) return null;
      if (depth === 0) groups.push([start, i]);
    }
  }
  return depth === 0 ? groups : null;
}

/**
 * WP Recipe Maker wraps ingredient notes in an extra pair of parentheses and
 * may start them with a comma: "((Note 1))", "(, sliced (6mm))". Unwrap a
 * group whose content is itself only parenthesised groups, and drop a leading
 * comma inside a group. Unbalanced text is left alone.
 */
export function tidyParentheses(text: string): string {
  let result = text;
  for (let pass = 0; pass < 3; pass++) {
    const groups = topLevelGroups(result);
    if (!groups) return result;
    let changed = false;
    // Work from the end so earlier indexes stay valid.
    for (let g = groups.length - 1; g >= 0; g--) {
      const [start, end] = groups[g];
      const inner = result.slice(start + 1, end);
      const trimmed = inner.replace(/^\s*,\s*/, "").trim();
      const innerGroups = topLevelGroups(trimmed);
      const onlyGroups =
        trimmed.startsWith("(") &&
        innerGroups !== null &&
        innerGroups.length > 0 &&
        trimmed.replace(/\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "").trim() === "";
      let replacement: string;
      if (onlyGroups) replacement = trimmed;
      else if (!trimmed) replacement = "";
      else replacement = `(${trimmed})`;
      if (replacement !== result.slice(start, end + 1)) {
        result = result.slice(0, start) + replacement + result.slice(end + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return result;
}

function cleanText(text: string): string {
  return collapseWhitespace(tidyParentheses(text))
    .replace(/^[,;:\s]+/, "")
    .replace(/\s+([,;)])/g, "$1");
}

/** Parse one ingredient line. Always returns a non-empty `text` for non-empty input. */
export function parseIngredient(raw: string): ExtractedIngredient {
  const line = collapseWhitespace(
    raw
      .replace(/⁄/g, "/")
      .replace(PRICE_NOTE, "")
      // Leading list markers ("- ", "• ", "* ").
      .replace(/^\s*[-•*▪◦·]\s+/, "")
  );
  if (!line) return { text: "" };

  const amountMatch = AMOUNT_PATTERN.exec(line);
  if (!amountMatch) return { text: cleanText(line) || line };

  const amount = normaliseAmount(amountMatch[1], amountMatch[2] ?? amountMatch[3]);
  let rest = line.slice(amountMatch[0].length);
  const attached = rest.length > 0 && /^[a-zA-Z]/.test(rest);
  rest = rest.trimStart();

  // "1 (14 oz) can tomatoes": the size note sits between amount and unit.
  let sizeNote = "";
  const noteMatch = /^\(([^()]{1,60})\)\s*/.exec(rest);
  if (noteMatch && !attached) {
    sizeNote = `(${noteMatch[1].trim()})`;
    rest = rest.slice(noteMatch[0].length);
  }

  let unit: string | undefined;
  const multi = MULTI_WORD_UNIT.exec(rest);
  const word = multi ? null : WORD_UNIT.exec(rest);
  if (multi) {
    unit = canonicalUnit(multi[1].replace(/\s+/g, " "));
    rest = rest.slice(multi[0].length);
  } else if (word && isUnitWord(word[1])) {
    unit = canonicalUnit(word[1]);
    rest = rest.slice(word[0].length);
  } else if (attached) {
    // "3eggs", "2x": digits glued to something that is not a unit. Unsure.
    return { text: cleanText(line) };
  }

  // "30g / 2 tbsp butter", "200g/7oz flour": keep the alternative measure as a note.
  let altNote = "";
  if (unit) {
    const alt = new RegExp(
      `^\\s*\\/\\s*(${NUMBER}\\s*(?:fl\\.?\\s*oz|[a-zA-Z]+)\\.?)(?=$|[\\s,)])`
    ).exec(rest);
    if (alt) {
      altNote = `(${alt[1].replace(/\s+/g, " ").trim()})`;
      rest = rest.slice(alt[0].length);
    } else {
      // "2/3 cup (142g) brown sugar": the weight note moves after the name.
      const afterUnit = /^\s*\(([^()]{1,60})\)\s*/.exec(rest);
      if (afterUnit && rest.slice(afterUnit[0].length).trim()) {
        altNote = `(${afterUnit[1].trim()})`;
        rest = rest.slice(afterUnit[0].length);
      }
    }
  }

  rest = rest.replace(/^\s*of\s+/i, "");
  let text = cleanText(rest);
  const notes = [sizeNote, altNote].filter(Boolean).join(" ");
  if (notes) text = text ? `${text} ${notes}` : "";

  if (!text) {
    // "2 cups" with nothing after it: there is no ingredient to name.
    return { text: cleanText(line) };
  }

  return unit ? { amount, unit, text } : { amount, text };
}
