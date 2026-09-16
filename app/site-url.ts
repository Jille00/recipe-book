/**
 * Single source of truth for the site's canonical origin.
 *
 * The app is served from the www host, but NEXT_PUBLIC_APP_URL is sometimes
 * configured with the apex domain. Canonical tags, OG urls, the sitemap and
 * JSON-LD must all agree on one host, so every absolute URL we emit is
 * normalised to the www form here.
 */
const DEFAULT_SITE_URL = "https://www.kookboek.app";

function normalizeOrigin(input: string | undefined): string {
  if (!input) return DEFAULT_SITE_URL;

  try {
    const url = new URL(input);
    if (url.hostname === "kookboek.app") {
      url.hostname = "www.kookboek.app";
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);

/** Build an absolute, canonical URL for a site-relative path. */
export function absoluteUrl(path: string = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Default social sharing image. Next.js replaces (rather than merges) the
 * `openGraph` object per route, so pages that declare their own Open Graph
 * metadata re-use this instead of silently dropping the image.
 */
export const SITE_OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Kookboek - Your Personal Cookbook",
} as const;
