import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nameProblem, passwordProblem } from "@/lib/auth-rules";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  buildEmailChangeApprovalEmail,
  buildEmailChangeVerificationEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  sendEmail,
} from "@/lib/email";

import { isEmailChangeToken, withConfirmationLanding } from "@/lib/auth-links";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  trustedOrigins: [
    "https://kookboek.app",
    "https://www.kookboek.app",
    ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"]),
  ],
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
    sendVerificationEmail: async ({ user, url, token }) => {
      // Also sends the second link of an email change (see user.changeEmail
      // below), in which case `user.email` is already the new address.
      const email = isEmailChangeToken(token)
        ? buildEmailChangeVerificationEmail({
            name: user.name,
            url: withConfirmationLanding(url, { emailChange: "done" }),
          })
        : buildVerificationEmail({ name: user.name, url: withConfirmationLanding(url) });
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
  user: {
    // Changing the address takes two links: the current address approves the
    // change, then the new address confirms it (sent by sendVerificationEmail
    // above). Only then is the email updated.
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const email = buildEmailChangeApprovalEmail({
          name: user.name,
          newEmail,
          url: withConfirmationLanding(url, { emailChange: "approved" }),
        });
        await sendEmail({ to: user.email, ...email });
      },
    },
    // The password is required by the hook below. Database rows go with the
    // user row (every user_id foreign key cascades); photos live in storage
    // and are removed here first.
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        try {
          // Loaded on demand: it pulls in the storage client and image code,
          // which no other auth request needs.
          const { removeUserImages } = await import("@/lib/account-images");
          await removeUserImages(user.id);
        } catch (error) {
          console.error("Removing photos before account deletion failed:", error);
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "We couldn't remove your photos, so nothing was deleted. Please try again.",
          });
        }
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  // Brute-force brake on the auth endpoints (sign-in, sign-up, password
  // reset, ...). Counters live in Postgres (the rate_limit table) so every
  // serverless instance shares them; in memory each instance would count on
  // its own and the effective limit would grow with the number of instances.
  rateLimit: {
    storage: "database",
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
      // These check the current password, so brake guessing like sign-in.
      "/change-password": { window: 60, max: 10 },
      "/delete-user": { window: 60, max: 10 },
      // Sends email to the account's address.
      "/change-email": { window: 60 * 60, max: 5 },
    },
  },
  // better-auth itself only checks a minimum password length and accepts a
  // name or image of any type and size. The forms check more, but anyone can
  // POST to these endpoints directly.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const body = (ctx.body ?? {}) as Record<string, unknown>;
      const reject = (message: string | null) => {
        if (message) throw new APIError("BAD_REQUEST", { message });
      };

      switch (ctx.path) {
        case "/sign-up/email":
          reject(nameProblem(body.name));
          reject(passwordProblem(body.password));
          break;
        case "/reset-password":
        case "/change-password":
          reject(passwordProblem(body.newPassword));
          break;
        case "/delete-user":
          // better-auth would otherwise delete a recently signed-in account
          // without a password, so a borrowed session could do it.
          reject(
            typeof body.password === "string" && body.password.length > 0
              ? null
              : "Enter your password to delete your account"
          );
          break;
        case "/update-user":
          if ("name" in body) reject(nameProblem(body.name));
          if ("image" in body && body.image !== null) {
            const image = body.image;
            const ok =
              typeof image === "string" && image.length <= 2000 && /^https:\/\//.test(image);
            reject(ok ? null : "Image must be an https URL");
          }
          break;
      }
    }),
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
