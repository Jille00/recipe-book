import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { buildPasswordResetEmail, sendEmail } from "@/lib/email";

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
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const email = buildPasswordResetEmail({ name: user.name, url });
      await sendEmail({ to: user.email, ...email });
    },
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
      "/forget-password": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 60, max: 10 },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
