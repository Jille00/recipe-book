const MAX_TERMS = 8;

/**
 * A Postgres tsquery (for to_tsquery('simple', …)) that finds recipes
 * containing every word of `text` as a word prefix: "ricot cake" matches
 * "Ricotta Cake". Null when there is nothing to search for.
 *
 * Only letters and digits survive, so nothing in the input can be read as
 * tsquery syntax (&, |, !, parentheses, quotes, weights).
 */
export function prefixTsQuery(text: string): string | null {
  const terms = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!terms) return null;
  const unique = [...new Set(terms)].slice(0, MAX_TERMS);
  return unique.map((term) => `${term}:*`).join(" & ");
}
