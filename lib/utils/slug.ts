// Used when a title produces no URL-safe characters at all (e.g. a title
// written entirely in a non-Latin script). generateUniqueSlug will append a
// counter to keep these distinct.
export const FALLBACK_SLUG = "recipe";

// Latin characters that have no combining-mark decomposition and therefore
// need an explicit transliteration.
const CHARACTER_MAP: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  đ: "d",
  ð: "d",
  þ: "th",
  ł: "l",
  ħ: "h",
  ı: "i",
  ŋ: "n",
  ƒ: "f",
  "&": " and ",
};

export function generateSlug(text: string): string {
  if (typeof text !== "string") return FALLBACK_SLUG;

  const slug = text
    .toLowerCase()
    .trim()
    // Transliterate characters that NFD cannot decompose
    .replace(/[ßæœøđðþłħıŋƒ&]/g, (char) => CHARACTER_MAP[char] ?? char)
    // Split accented letters into base letter + combining mark ("é" -> "e" + ́ )
    .normalize("NFD")
    // Drop the combining marks, keeping the base ASCII letters
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || FALLBACK_SLUG;
}

export function generateUniqueSlug(text: string, existingSlugs: string[]): string {
  const baseSlug = generateSlug(text);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}
