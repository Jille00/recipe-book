"use client";

import { createAuthClient } from "better-auth/react";

// In the browser, always talk to the origin the page was served from. This
// avoids cross-origin requests (and CORS preflight failures) when the app is
// reached via a different host than NEXT_PUBLIC_APP_URL, e.g. www vs. apex.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({ baseURL });

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;
