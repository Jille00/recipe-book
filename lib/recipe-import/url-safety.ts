/**
 * Pure classification of URLs and IP addresses for server-side fetching of
 * user-supplied links (SSRF protection). Everything here is synchronous and
 * free of I/O so it can be tested exhaustively; lib/recipe-import/safe-fetch.ts
 * applies it to every redirect hop and to every address DNS returns.
 */

/** Strict dotted-decimal IPv4 ("93.184.216.34") to 4 bytes, else null. */
export function parseIPv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const bytes: number[] = [];
  for (const part of parts) {
    // No octal ("010"), hex ("0x7f"), empty or signed parts: only the canonical form.
    if (!/^(?:0|[1-9]\d{0,2})$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    bytes.push(value);
  }
  return bytes;
}

/**
 * IPv6 text (optionally in brackets, with "::" compression and an embedded
 * dotted IPv4 tail) to 16 bytes, else null. Zone ids ("fe80::1%eth0") are
 * rejected.
 */
export function parseIPv6(address: string): number[] | null {
  let text = address;
  if (text.startsWith("[") && text.endsWith("]")) text = text.slice(1, -1);
  if (!text.includes(":") || text.includes("%")) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(text)) return null;

  let tailBytes: number[] = [];
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    tailBytes = v4;
    text = text.slice(0, lastColon + 1) + "0:0"; // placeholder for 2 groups
  }

  const doubleColon = text.indexOf("::");
  if (doubleColon !== text.lastIndexOf("::")) return null;

  const parseGroups = (segment: string): number[] | null => {
    if (segment === "") return [];
    const groups = segment.split(":");
    const values: number[] = [];
    for (const group of groups) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
      values.push(parseInt(group, 16));
    }
    return values;
  };

  let groups: number[];
  if (doubleColon === -1) {
    const all = parseGroups(text);
    if (!all || all.length !== 8) return null;
    groups = all;
  } else {
    const head = parseGroups(text.slice(0, doubleColon));
    const rest = parseGroups(text.slice(doubleColon + 2));
    if (!head || !rest) return null;
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array<number>(missing).fill(0), ...rest];
  }

  const bytes: number[] = [];
  for (const group of groups) bytes.push(group >> 8, group & 0xff);
  if (tailBytes.length === 4) bytes.splice(12, 4, ...tailBytes);
  return bytes;
}

function inIPv4Range(bytes: number[], base: [number, number, number, number], prefix: number): boolean {
  for (let bit = 0; bit < prefix; bit++) {
    const byte = bit >> 3;
    const mask = 0x80 >> (bit & 7);
    if ((bytes[byte] & mask) !== (base[byte] & mask)) return false;
  }
  return true;
}

/** IPv4 ranges that must never be fetched from the server. */
const BLOCKED_IPV4: Array<[[number, number, number, number], number]> = [
  [[0, 0, 0, 0], 8], // "this network" / unspecified
  [[10, 0, 0, 0], 8], // private
  [[100, 64, 0, 0], 10], // carrier-grade NAT
  [[127, 0, 0, 0], 8], // loopback
  [[169, 254, 0, 0], 16], // link-local, incl. cloud metadata 169.254.169.254
  [[172, 16, 0, 0], 12], // private
  [[192, 0, 0, 0], 24], // IETF protocol assignments
  [[192, 0, 2, 0], 24], // documentation (TEST-NET-1)
  [[192, 88, 99, 0], 24], // 6to4 relay anycast
  [[192, 168, 0, 0], 16], // private
  [[198, 18, 0, 0], 15], // benchmarking
  [[198, 51, 100, 0], 24], // documentation (TEST-NET-2)
  [[203, 0, 113, 0], 24], // documentation (TEST-NET-3)
  [[224, 0, 0, 0], 4], // multicast
  [[240, 0, 0, 0], 4], // reserved, incl. broadcast 255.255.255.255
];

export function isPublicIPv4Bytes(bytes: number[]): boolean {
  return !BLOCKED_IPV4.some(([base, prefix]) => inIPv4Range(bytes, base, prefix));
}

export function isPublicIPv6Bytes(bytes: number[]): boolean {
  const allZero = (from: number, to: number) => bytes.slice(from, to).every((b) => b === 0);
  const embeddedV4 = () => isPublicIPv4Bytes(bytes.slice(12, 16));

  // ::ffff:a.b.c.d (IPv4-mapped) and ::a.b.c.d (IPv4-compatible, which also
  // covers :: and ::1): judge the IPv4 address they carry.
  if (allZero(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) return embeddedV4();
  if (allZero(0, 12)) return embeddedV4();
  // ::ffff:0:a.b.c.d (IPv4-translated).
  if (allZero(0, 8) && bytes[8] === 0xff && bytes[9] === 0xff && allZero(10, 12)) return false;
  // 64:ff9b::/96 NAT64 carries an IPv4 address; 64:ff9b:1::/48 is local use.
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b) {
    return allZero(4, 12) ? embeddedV4() : false;
  }
  // 2002::/16 6to4 embeds an IPv4 address in bytes 2-5.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return isPublicIPv4Bytes(bytes.slice(2, 6));

  // Everything else must be global unicast (2000::/3) ...
  if ((bytes[0] & 0xe0) !== 0x20) return false; // ::/8 misc, fc00::/7, fe80::/10, ff00::/8, 100::/64
  // ... and not a special block inside it.
  if (bytes[0] === 0x20 && bytes[1] === 0x01) {
    if (bytes[2] < 0x02) return false; // 2001::/23 IETF assignments, incl. Teredo 2001::/32
    if (bytes[2] === 0x0d && bytes[3] === 0xb8) return false; // 2001:db8::/32 documentation
  }
  if (bytes[0] === 0x3f && bytes[1] === 0xff && (bytes[2] & 0xf0) === 0x00) return false; // 3fff::/20 documentation
  return true;
}

/**
 * True only for a syntactically valid IPv4 or IPv6 address that is publicly
 * routable. Anything unparseable (including "0x7f.0.0.1" or "2130706433") is
 * treated as not public.
 */
export function isPublicIpAddress(address: string): boolean {
  if (typeof address !== "string" || !address) return false;
  const v4 = parseIPv4(address);
  if (v4) return isPublicIPv4Bytes(v4);
  const v6 = parseIPv6(address);
  if (v6) return isPublicIPv6Bytes(v6);
  return false;
}

export type UrlRejection =
  | "invalid"
  | "protocol"
  | "credentials"
  | "port"
  | "hostname"
  | "address";

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: UrlRejection };

export const MAX_URL_LENGTH = 2048;

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".localdomain",
  ".home.arpa",
  ".lan",
  ".intranet",
  ".corp",
];

/**
 * Validate a URL the server is about to request. Accepts only http(s) on the
 * default ports without credentials, whose host is either a public IP literal
 * or a dotted DNS name that is not a local/internal name. DNS results are
 * checked separately at connect time.
 */
export function checkFetchUrl(input: string | URL): UrlCheck {
  let url: URL;
  try {
    const text = typeof input === "string" ? input.trim() : input.toString();
    if (!text || text.length > MAX_URL_LENGTH) return { ok: false, reason: "invalid" };
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "protocol" };
  }
  if (url.username || url.password) return { ok: false, reason: "credentials" };
  // The URL parser drops a port that equals the scheme default.
  if (url.port !== "" && url.port !== "80" && url.port !== "443") {
    return { ok: false, reason: "port" };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, reason: "hostname" };

  // IPv6 literal: the URL parser keeps the brackets in `hostname`.
  if (host.startsWith("[")) {
    const bytes = parseIPv6(host);
    if (!bytes) return { ok: false, reason: "invalid" };
    return isPublicIPv6Bytes(bytes) ? { ok: true, url } : { ok: false, reason: "address" };
  }

  // The WHATWG parser already turns "2130706433", "0x7f.1" and "0177.0.0.1"
  // into dotted decimal, so a numeric host here is canonical.
  const v4 = parseIPv4(host);
  if (v4) {
    return isPublicIPv4Bytes(v4) ? { ok: true, url } : { ok: false, reason: "address" };
  }

  // Anything else must look like an ordinary DNS name.
  if (!/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/.test(host)) return { ok: false, reason: "hostname" };
  const labels = host.split(".");
  if (labels.some((label) => label.length > 63 || label.startsWith("-") || label.endsWith("-"))) {
    return { ok: false, reason: "hostname" };
  }
  // A numeric-looking final label would be an IP in disguise ("1.2.3.0x4").
  const tld = labels[labels.length - 1];
  if (/^(?:\d+|0x[0-9a-f]*)$/.test(tld)) return { ok: false, reason: "address" };
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: "hostname" };
  }
  return { ok: true, url };
}
