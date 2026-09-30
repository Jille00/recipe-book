import { isUuid, parsePaginationParam } from "@/lib/api-utils";
import type { SearchFilters } from "@/lib/db/queries/search";
import { DEFAULT_BROWSE_SORT, isBrowseSort, type BrowseSort } from "@/lib/browse-sort";

export const MAX_BROWSE_PAGE = 1000;
const MAX_QUERY_LENGTH = 100;
const MAX_TAGS = 20;
// Well inside Postgres int4; no recipe takes longer or serves more.
const MAX_FILTER_NUMBER = 100_000;

/** A search param as Next hands it over: repeated keys arrive as an array. */
export type RawParam = string | string[] | undefined;

export interface BrowseSearchParams {
  q?: RawParam;
  tags?: RawParam;
  difficulty?: RawParam;
  prepTime?: RawParam;
  cookTime?: RawParam;
  minServings?: RawParam;
  maxServings?: RawParam;
  sort?: RawParam;
  page?: RawParam;
}

function first(value: RawParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: RawParam): number | undefined {
  const raw = first(value);
  if (!raw || !/^\d+$/.test(raw.trim())) return undefined;
  const n = Number(raw);
  return n > 0 ? Math.min(n, MAX_FILTER_NUMBER) : undefined;
}

export function parseBrowsePage(value: RawParam): number {
  return parsePaginationParam(first(value) ?? null, {
    fallback: 1,
    min: 1,
    max: MAX_BROWSE_PAGE,
  });
}

/**
 * Turns /browse's query string into search filters. Anything from the URL is
 * untrusted: repeated keys, tag ids that aren't uuids and numbers past int4
 * would otherwise reach Postgres and fail the whole page with a 500.
 */
export function parseBrowseFilters(params: BrowseSearchParams): SearchFilters {
  const filters: SearchFilters = {};

  const query = first(params.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  if (query) filters.query = query;

  const tagIds = [params.tags ?? []].flat().filter(isUuid);
  if (tagIds.length > 0) {
    filters.tagIds = [...new Set(tagIds)].slice(0, MAX_TAGS);
  }

  const difficulty = first(params.difficulty);
  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
    filters.difficulty = difficulty;
  }

  filters.maxPrepTime = positiveInt(params.prepTime);
  filters.maxCookTime = positiveInt(params.cookTime);
  filters.minServings = positiveInt(params.minServings);
  filters.maxServings = positiveInt(params.maxServings);

  for (const key of Object.keys(filters) as (keyof SearchFilters)[]) {
    if (filters[key] === undefined) delete filters[key];
  }
  return filters;
}

/** The listing order; anything unknown falls back to newest first. */
export function parseBrowseSort(value: RawParam): BrowseSort {
  const raw = first(value);
  return isBrowseSort(raw) ? raw : DEFAULT_BROWSE_SORT;
}

/**
 * Whether any filter would actually apply, ignoring invalid values. A
 * non-default sort counts too: it is another permutation of the same listing.
 */
export function hasActiveBrowseFilters(params: BrowseSearchParams): boolean {
  return (
    Object.keys(parseBrowseFilters(params)).length > 0 ||
    parseBrowseSort(params.sort) !== DEFAULT_BROWSE_SORT
  );
}
