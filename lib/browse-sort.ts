// Kept apart from browse-params (which pulls in next/server through
// api-utils) so the client-side sort control can import it.

export const BROWSE_SORTS = ["newest", "top-rated", "quickest"] as const;

export type BrowseSort = (typeof BROWSE_SORTS)[number];

export const DEFAULT_BROWSE_SORT: BrowseSort = "newest";

export const BROWSE_SORT_LABELS: Record<BrowseSort, string> = {
  newest: "Newest",
  "top-rated": "Top rated",
  quickest: "Quickest",
};

export function isBrowseSort(value: unknown): value is BrowseSort {
  return (BROWSE_SORTS as readonly unknown[]).includes(value);
}
