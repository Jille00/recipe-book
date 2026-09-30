import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { buildContentSecurityPolicy, createNonce } from "@/lib/csp";

// Every authenticated page. /browse, /r/..., the auth pages and the home page
// stay public.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/favorites",
  "/profile",
  "/settings",
  "/recipes",
  "/shopping-list",
  "/collections",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isProtected(pathname) && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    // Carry the requested destination so the login form can send the user
    // back where they were headed instead of always to /dashboard.
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the request's CSP header and puts it on the
  // scripts it renders; the response header is what the browser enforces.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, build assets, image optimisation or files
      // with an extension (favicon, robots.txt, sitemap.xml, images).
      source: "/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)",
      // Prefetches are cached and reused, so a nonce in them would be stale.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
