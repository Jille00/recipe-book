/**
 * Small, dependency-free helpers for turning HTML fragments into plain text.
 * Used for text found in JSON-LD (which often carries inline HTML and entity
 * encoded characters) and for reading a whole page as text for the AI
 * fallback. None of this is a sanitiser: the output is only ever rendered as
 * text by React.
 */

// Spaces of every kind decode to a plain space: all text is whitespace-collapsed.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  shy: "",
  zwj: "",
  zwnj: "",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  deg: "°",
  times: "×",
  divide: "÷",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  frac13: "⅓",
  frac23: "⅔",
  frac18: "⅛",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  cent: "¢",
  prime: "′",
  Prime: "″",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  aelig: "æ",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  ntilde: "ñ",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  oslash: "ø",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  yacute: "ý",
  yuml: "ÿ",
  szlig: "ß",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Auml: "Ä",
  Aring: "Å",
  Ccedil: "Ç",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  Iacute: "Í",
  Iuml: "Ï",
  Ntilde: "Ñ",
  Oacute: "Ó",
  Ouml: "Ö",
  Uacute: "Ú",
  Uuml: "Ü",
};

const ENTITY_PATTERN = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;
// Something that still looks like an entity after one decoding pass, which
// happens when a CMS encoded text twice ("&amp;#39;").
const LEFTOVER_ENTITY = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|amp|quot|apos|lt|gt|nbsp);/;

function decodeOnce(input: string): string {
  return input.replace(ENTITY_PATTERN, (match, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      // Invalid code points, NUL and lone surrogates are dropped rather than
      // producing garbage characters.
      if (
        !Number.isFinite(code) ||
        code <= 0 ||
        code > 0x10ffff ||
        (code >= 0xd800 && code <= 0xdfff)
      ) {
        return "";
      }
      // Windows-1252 quirk: &#146; and friends mean curly quotes/dashes.
      const cp1252 = CP1252_REPLACEMENTS[code];
      return cp1252 ?? String.fromCodePoint(code);
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)
      ? NAMED_ENTITIES[body]
      : match;
  });
}

const CP1252_REPLACEMENTS: Record<number, string> = {
  130: "‚",
  132: "„",
  133: "…",
  145: "‘",
  146: "’",
  147: "“",
  148: "”",
  150: "–",
  151: "—",
};

/** Decode numeric and common named HTML entities. Unknown names are kept. */
export function decodeHtmlEntities(input: string): string {
  if (!input || input.indexOf("&") === -1) return input;
  const once = decodeOnce(input);
  return LEFTOVER_ENTITY.test(once) ? decodeOnce(once) : once;
}

// A tag starts with a letter (or "/" + letter), so "use < 5 g" is left alone.
const TAG_PATTERN = /<\/?[a-zA-Z][^<>]*>/g;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const BLOCK_BREAK_PATTERN =
  /<(?:br\s*\/?|\/(?:p|div|li|h[1-6]|tr|ul|ol|section|article|blockquote|pre|table|dd|dt|figcaption|header|footer))\s*>/gi;

/**
 * Convert an inline HTML fragment into single-line plain text: tags removed,
 * entities decoded, whitespace collapsed.
 */
export function htmlToPlainText(input: unknown): string {
  if (typeof input !== "string") {
    return typeof input === "number" ? String(input) : "";
  }
  const withoutTags = input.replace(COMMENT_PATTERN, " ").replace(TAG_PATTERN, " ");
  // Entities can themselves encode markup ("&lt;p&gt;"), so strip once more.
  const decoded = decodeHtmlEntities(withoutTags).replace(TAG_PATTERN, " ");
  return collapseWhitespace(decoded);
}

/**
 * Like {@link htmlToPlainText} but keeps line structure: block-level closing
 * tags and <br> become line breaks. Returns trimmed, non-empty lines.
 */
export function htmlToLines(input: string): string[] {
  const withBreaks = input
    .replace(COMMENT_PATTERN, " ")
    .replace(BLOCK_BREAK_PATTERN, "\n")
    .replace(/<li\b[^<>]*>/gi, "\n");
  const decoded = decodeHtmlEntities(withBreaks.replace(TAG_PATTERN, " "));
  const normalised = decoded
    .replace(/<(?:br\s*\/?|\/(?:p|div|li))\s*>/gi, "\n")
    .replace(TAG_PATTERN, " ");
  return normalised
    .split(/\r\n|[\r\n\u2028\u2029]/)
    .map(collapseWhitespace)
    .filter((line) => line.length > 0);
}

export function collapseWhitespace(input: string): string {
  // \s covers NBSP and the other Unicode spaces; zero-width characters are
  // removed outright.
  return input.replace(/[\u200b-\u200d\ufeff]/g, "").replace(/\s+/g, " ").trim();
}

const NON_CONTENT_ELEMENTS =
  /<(script|style|noscript|template|svg|iframe|object|canvas|select|button|form|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/**
 * Pull the readable text out of a whole HTML page for the AI fallback. Scripts,
 * styles, navigation and other chrome are dropped and block elements become
 * line breaks. When the page has a <main> or <article> with a meaningful
 * amount of text, only that part is used.
 */
export function extractReadableText(html: string): string {
  let body = html;
  const bodyMatch = /<body\b[^>]*>([\s\S]*)<\/body\s*>/i.exec(html);
  if (bodyMatch) body = bodyMatch[1];

  body = body.replace(COMMENT_PATTERN, " ").replace(NON_CONTENT_ELEMENTS, " ");
  // A second pass catches elements that were nested inside a removed-but-
  // mismatched element (for example <nav> inside <aside>).
  body = body.replace(NON_CONTENT_ELEMENTS, " ");

  const toText = (fragment: string) =>
    htmlToLines(
      fragment
        .replace(/<\/(?:td|th)\s*>/gi, " ")
        .replace(/<h[1-6]\b[^<>]*>/gi, "\n")
    ).join("\n");

  for (const tag of ["main", "article"]) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)<\\/${tag}\\s*>`, "i");
    const match = pattern.exec(body);
    if (match) {
      const text = toText(match[1]);
      if (text.length >= 500) return text;
    }
  }

  return toText(body);
}

/** The page's <title> or og:title, for when structured data has no name. */
export function extractPageTitle(html: string): string | undefined {
  const og = findMetaContent(html, "og:title");
  if (og) return og;
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  const title = match ? htmlToPlainText(match[1]) : "";
  return title || undefined;
}

/** Content of a <meta property|name="..."> tag, decoded. */
export function findMetaContent(html: string, key: string): string | undefined {
  const metaPattern = /<meta\b[^>]*>/gi;
  const wanted = key.toLowerCase();
  let match: RegExpExecArray | null;
  while ((match = metaPattern.exec(html))) {
    const tag = match[0];
    const name = readAttribute(tag, "property") ?? readAttribute(tag, "name");
    if (name?.toLowerCase() !== wanted) continue;
    const content = readAttribute(tag, "content");
    if (content) {
      const text = htmlToPlainText(content);
      if (text) return text;
    }
  }
  return undefined;
}

/** Read one attribute from a start tag, handling ", ' and unquoted values. */
export function readAttribute(tag: string, attribute: string): string | undefined {
  const pattern = new RegExp(
    `\\s${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    "i"
  );
  const match = pattern.exec(tag);
  if (!match) return undefined;
  return match[1] ?? match[2] ?? match[3];
}
