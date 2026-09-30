/**
 * The Content-Security-Policy for pages. Scripts run only when they carry this
 * request's nonce (Next.js adds it to its own scripts when it finds the nonce
 * in the request's CSP header) or are loaded by one that does
 * ('strict-dynamic'). Injected markup such as `<script>` or `onerror=` can't
 * run, even if an escaping bug lets it into the page.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // libheif (HEIC photos in Chrome/Firefox) is WebAssembly.
      "'wasm-unsafe-eval'",
      // React's dev tooling evaluates code; production never does.
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Inline style attributes are everywhere in React and Radix.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", "https://*.supabase.co"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** A fresh, unguessable nonce for one response. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
