/**
 * Finding schema.org Recipe data in the JSON-LD blocks of an HTML page.
 */

import { readAttribute } from "./html-text";

export type JsonObject = Record<string, unknown>;

// Enough for real pages; stops a hostile page from making us walk forever.
const MAX_BLOCKS = 50;
const MAX_DEPTH = 12;
const MAX_NODES = 5_000;

// Every C0 control character (built from char codes to keep the source readable).
const CONTROL_CHARACTERS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}]+`,
  "g"
);

const SCRIPT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

/** Raw text of every `<script type="application/ld+json">` block. */
export function findJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  SCRIPT_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCRIPT_PATTERN.exec(html)) && blocks.length < MAX_BLOCKS) {
    const type = readAttribute(` ${match[1]}`, "type");
    if (!type) continue;
    const mime = type.split(";")[0].trim().toLowerCase();
    if (mime === "application/ld+json") {
      blocks.push(match[2]);
    }
  }
  return blocks;
}

/**
 * Parse one JSON-LD block, tolerating the wrappers and mistakes seen in the
 * wild: HTML comments or CDATA around the JSON, and raw control characters
 * (unescaped newlines/tabs inside strings). Returns undefined when it is not
 * JSON at all.
 */
export function parseJsonLdBlock(raw: string): unknown {
  let text = raw.trim();
  // Wrappers can be nested either way round (a comment inside CDATA or the
  // reverse), so peel them until nothing changes.
  for (let i = 0; i < 4; i++) {
    const before = text;
    text = text
      .replace(/^(?:\/\/\s*)?<!\[CDATA\[/, "")
      .replace(/(?:\/\/\s*)?\]\]>$/, "")
      .replace(/^<!--/, "")
      .replace(/(?:\/\/\s*)?-->$/, "")
      .trim()
      .replace(/;$/, "")
      .trim();
    if (text === before) break;
  }
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    // Raw line breaks and tabs inside strings are invalid JSON but common.
    // Outside strings they are insignificant whitespace, so a space is safe.
    try {
      return JSON.parse(text.replace(CONTROL_CHARACTERS, " "));
    } catch {
      return undefined;
    }
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for "Recipe", ["Recipe", ...] and IRIs like "http://schema.org/Recipe". */
export function hasRecipeType(node: JsonObject): boolean {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => {
    if (typeof t !== "string") return false;
    const name = t.trim().replace(/^https?:\/\/(?:www\.)?schema\.org\//i, "").replace(/^schema:/i, "");
    return name.toLowerCase() === "recipe";
  });
}

/**
 * Every Recipe-typed object anywhere in the parsed blocks: top-level arrays,
 * `@graph` containers and nested properties (e.g. a WebPage's mainEntity).
 */
export function collectRecipeNodes(roots: unknown[]): JsonObject[] {
  const found: JsonObject[] = [];
  const seen = new Set<unknown>();
  let visited = 0;

  const walk = (value: unknown, depth: number) => {
    if (depth > MAX_DEPTH || visited >= MAX_NODES) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (!isObject(value) || seen.has(value)) return;
    seen.add(value);
    visited++;

    if (hasRecipeType(value)) {
      found.push(value);
      // A Recipe does not contain other recipes worth importing.
      return;
    }
    for (const child of Object.values(value)) {
      if (typeof child === "object" && child !== null) walk(child, depth + 1);
    }
  };

  for (const root of roots) walk(root, 0);
  return found;
}

function countOf(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return value ? 1 : 0;
}

/** Rough completeness score, used to choose between several Recipe nodes. */
export function recipeCompleteness(node: JsonObject): number {
  let score = 0;
  if (typeof node.name === "string" && node.name.trim()) score += 5;
  score += Math.min(countOf(node.recipeIngredient ?? node.ingredients), 30) * 2;
  score += Math.min(countOf(node.recipeInstructions), 30) * 2;
  if (node.image) score += 2;
  if (node.recipeYield) score += 1;
  if (node.prepTime || node.cookTime || node.totalTime) score += 1;
  if (node.description) score += 1;
  return score;
}

/** Index of every object with an "@id", so references like {"@id": "#primaryimage"} can be followed. */
export function buildIdIndex(roots: unknown[]): Map<string, JsonObject> {
  const index = new Map<string, JsonObject>();
  let visited = 0;
  const walk = (value: unknown, depth: number) => {
    if (depth > MAX_DEPTH || visited >= MAX_NODES) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    if (!isObject(value)) return;
    visited++;
    const id = value["@id"];
    // Only keep real definitions, not the bare references themselves.
    if (typeof id === "string" && Object.keys(value).length > 1 && !index.has(id)) {
      index.set(id, value);
    }
    for (const child of Object.values(value)) {
      if (typeof child === "object" && child !== null) walk(child, depth + 1);
    }
  };
  for (const root of roots) walk(root, 0);
  return index;
}

function isReference(value: unknown): value is { "@id": string } {
  return (
    isObject(value) &&
    typeof value["@id"] === "string" &&
    Object.keys(value).length === 1
  );
}

/**
 * Replace top-level `{"@id": ...}` references (and references inside
 * top-level arrays) with the objects they point to. Returns a shallow copy.
 */
export function resolveReferences(node: JsonObject, index: Map<string, JsonObject>): JsonObject {
  const resolve = (value: unknown) =>
    isReference(value) ? (index.get(value["@id"]) ?? value) : value;
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = Array.isArray(value) ? value.map(resolve) : resolve(value);
  }
  return result;
}

/**
 * The most complete Recipe node on the page (with references resolved), or
 * undefined when there is none. Invalid blocks are skipped.
 */
export function findRecipeNode(html: string): JsonObject | undefined {
  const parsed = findJsonLdBlocks(html)
    .map(parseJsonLdBlock)
    .filter((value) => value !== undefined);
  const candidates = collectRecipeNodes(parsed);
  let best: JsonObject | undefined;
  let bestScore = -1;
  for (const candidate of candidates) {
    const score = recipeCompleteness(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best ? resolveReferences(best, buildIdIndex(parsed)) : undefined;
}
