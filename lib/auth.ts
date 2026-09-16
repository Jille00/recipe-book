import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
  sendEmail,
} from "@/lib/email";

import { withConfirmationLanding } from "@/lib/auth-links";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  trustedOrigins: ['https://kookboek.app', 'https://www.kookboek.app', 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // New accounts must confirm their email before they can sign in. Accounts
    // created before this existed were marked verified by migration 0003, so
    // turning this on locks nobody out.
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    revokeSessionsOnPasswordReset: true,
    // A reset link is emailed, so completing a reset proves the person
    // controls the inbox. Counting that as verification means someone who
    // never confirmed their email is not left unable to sign in after resetting.
    onPasswordReset: async ({ user }) => {
      if (user.emailVerified) return;
      await db
        .update(schema.user)
        .set({ emailVerified: true })
        .where(eq(schema.user.id, user.id));
    },
    sendResetPassword: async ({ user, url }) => {
      const email = buildPasswordResetEmail({ name: user.name, url });
      await sendEmail({ to: user.email, ...email });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const email = buildVerificationEmail({
        name: user.name,
        url: withConfirmationLanding(url),
      });
      await sendEmail({ to: user.email, ...email });
    },
    sendOnSignUp: true,
    // Signing in to an unconfirmed account sends a fresh link. This only runs
    // after the password has been checked, so it can't be used to send email
    // to an address you don't control.
    sendOnSignIn: true,
    // Clicking the link signs you in, so confirming lands you in the app.
    autoSignInAfterVerification: true,
    // People often confirm later than they sign up; a day is friendlier than
    // better-auth's one-hour default.
    expiresIn: 60 * 60 * 24,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // Brute-force brake on the auth endpoints (sign-in, sign-up, password
  // reset, ...). NOTE: better-auth's default storage for these counters is
  // in-memory, so on Vercel every lambda instance keeps its own counters and
  // the effective limit scales with the number of warm instances. Configure a
  // shared secondary storage (Redis/Upstash) - or `rateLimit.storage:
  // "database"` - for multi-instance correctness.
  rateLimit: {
    // Matches better-auth's own default of production-only, but stated
    // explicitly so the limits below are obviously intentional.
    enabled: process.env.NODE_ENV === "production",
    window: 60, // seconds
    max: 120, // requests per window per IP across auth endpoints
    customRules: {
      "/get-session": { window: 60, max: 240 },
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 10 },
      // This better-auth version serves password reset requests here; the
      // older "/forget-password" key never matched, so this limit was inert.
      "/request-password-reset": { window: 60 * 60, max: 5 },
      // Sends email to an address, so keep it tight.
      "/send-verification-email": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 60, max: 10 },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
