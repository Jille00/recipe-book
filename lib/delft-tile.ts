/**
 * Delft tiles: every recipe gets its own hand-painted-looking tile, generated
 * from a seed (its share code) so it never changes between visits.
 *
 * Real Delft tiles share a grammar: a white glazed square, a painted centre
 * motif, and corner ornaments that join up with the neighbouring tiles' when
 * they're laid as a wall. The centre motif here follows the recipe's category
 * (a tulip for desserts, wheat for baking, ...); the seed picks the corner
 * style and the small irregularities that make each one look painted.
 */

export type TileMotif =
  | "tulip"
  | "wheat"
  | "fish"
  | "bowl"
  | "windmill"
  | "cup"
  | "sprig"
  | "sun"
  | "hen"
  | "pot"
  | "rosette";

export type TileCorner = "ox-head" | "spider" | "fleur" | "quarter";

export interface TileSpec {
  motif: TileMotif;
  corner: TileCorner;
  /** Degrees the motif leans, like a painter's hand: -5..5. */
  tilt: number;
  /** Whether the motif sits inside a painted ring. */
  medallion: boolean;
  /** Opacity of the blue wash behind the motif: 0.10..0.24. */
  wash: number;
  /** Line weight in viewBox units (tile is 100 wide): 1.6..2.2. */
  stroke: number;
  /** Rotation of windmill sails and rosette petals: 0..44. */
  spin: number;
}

/** 32-bit FNV-1a hash: a stable number for any string. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a small, well-distributed PRNG. Returns 0 <= n < 1. */
export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tag slugs (and names) to motifs, most specific first: a recipe tagged
// "dinner" and "seafood" gets the fish, not the generic dinner windmill.
const MOTIF_BY_TAG: Array<[RegExp, TileMotif]> = [
  [/fish|seafood|vis|zeevruchten/, "fish"],
  [/soup|stew|soep|stoof/, "bowl"],
  [/dessert|sweet|cake|taart|toetje/, "tulip"],
  [/bak|baking|bread|brood|pastry|pasta/, "wheat"],
  [/breakfast|ontbijt|brunch/, "sun"],
  [/drink|beverage|cocktail|drank/, "cup"],
  [/poultry|chicken|kip|gevogelte/, "hen"],
  [/meat|vlees|beef|rund|pork|varken/, "pot"],
  [/vegan|vegetar|salad|salade|groente/, "sprig"],
  [/dinner|diner|main|hoofd/, "windmill"],
];

const CORNERS: TileCorner[] = ["ox-head", "spider", "fleur", "quarter"];
const FALLBACK_MOTIFS: TileMotif[] = ["rosette", "tulip", "windmill", "sprig"];

/** The motif for a recipe's tags, or null when none of them suggest one. */
export function motifForTags(tags: readonly string[] | null | undefined): TileMotif | null {
  const keys = (tags ?? []).map((tag) => tag.toLowerCase());
  for (const [pattern, motif] of MOTIF_BY_TAG) {
    if (keys.some((key) => pattern.test(key))) return motif;
  }
  return null;
}

/**
 * Everything needed to paint one tile. Same seed and tags, same tile.
 * Untagged recipes still get a motif, picked by the seed.
 */
export function tileSpec(seed: string, tags?: readonly string[] | null): TileSpec {
  const random = seededRandom(seed || "kookboek");
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const range = (min: number, max: number) => min + random() * (max - min);

  const corner = pick(CORNERS);
  const fallback = pick(FALLBACK_MOTIFS);
  return {
    motif: motifForTags(tags) ?? fallback,
    corner,
    tilt: Math.round(range(-5, 5) * 10) / 10,
    medallion: random() < 0.55,
    wash: Math.round(range(0.1, 0.24) * 100) / 100,
    stroke: Math.round(range(1.6, 2.2) * 100) / 100,
    spin: Math.round(range(0, 44)),
  };
}
