import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    // Carry the requested destination so the login form can send the user
    // back where they were headed instead of always to /dashboard.
    loginUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Every authenticated route. /browse, /r/:shareToken and the auth pages
  // stay public.
  matcher: [
    "/dashboard",
    "/favorites",
    "/profile",
    "/settings",
    "/recipes",
    "/recipes/:path*",
  ],
};
