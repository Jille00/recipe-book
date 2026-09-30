import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading, AuthShell } from "../_components/auth-shell";
import { Button } from "@/components/ui";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { parseEmailChangeStage, type EmailChangeStage } from "@/lib/auth-links";

export const metadata: Metadata = {
  title: "Confirm email",
  description: "Confirm the email address for your Kookboek account",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string; next?: string; change?: string }>;
}

/**
 * Where every confirmation link lands (see lib/auth-links.ts).
 *
 * better-auth has already done the work by the time we get here: on success it
 * marked the email verified and signed the person in, and on failure it added
 * an `error` query parameter.
 */

// Messages for the errors better-auth's verify-email endpoint can report.
const FAILURES: Record<string, { title: string; body: string }> = {
  token_expired: {
    title: "This link has expired",
    body: "Confirmation links last 24 hours. Sign in and we'll send you a fresh one straight away.",
  },
  invalid_token: {
    title: "This link isn't valid",
    body: "It may have been copied incompletely, or already replaced by a newer link. Sign in and we'll send you a fresh one.",
  },
  user_not_found: {
    title: "We couldn't find that account",
    body: "The account for this link no longer exists. You can create a new one.",
  },
  unauthorized: {
    title: "You're signed in to a different account",
    body: "Sign out, then open the link again to confirm this email.",
  },
};

// The same errors when the link was part of changing an email address (see
// user.changeEmail in lib/auth.ts). The fix is to start over from settings.
const CHANGE_FAILURES: Record<string, { title: string; body: string }> = {
  token_expired: {
    title: "This link has expired",
    body: "Email change links last 24 hours. Start the change again from your account settings.",
  },
  invalid_token: {
    title: "This link isn't valid",
    body: "It may have been copied incompletely. Start the change again from your account settings.",
  },
  user_not_found: {
    title: "This change is already done",
    body: "The account no longer uses the address this link was for. Check your account settings for the current one.",
  },
  unauthorized: FAILURES.unauthorized,
};

const CHANGE_SUCCESS: Record<EmailChangeStage, { title: string; body: string }> = {
  approved: {
    title: "Change approved",
    body: "We've sent a link to your new address. Open it to finish the change; until then you keep signing in with your current address.",
  },
  done: {
    title: "Your email address is updated",
    body: "Use your new address the next time you sign in.",
  },
};

// Only continue to a path on this site. Anything else could send someone off
// to another domain straight after they've been signed in.
function safeNext(next: string | undefined): string {
  return safeRedirectPath(next, "/dashboard");
}

export default async function ConfirmEmailPage({ searchParams }: Props) {
  const { error, next, change } = await searchParams;
  const emailChange = parseEmailChangeStage(change);
  const failures = emailChange ? CHANGE_FAILURES : FAILURES;
  const failure = error ? (failures[error] ?? failures.invalid_token) : null;
  const success = emailChange
    ? CHANGE_SUCCESS[emailChange]
    : { title: "Your email is confirmed", body: "Your account is ready and you're signed in." };

  return (
    <AuthShell
      seed="kookboek-confirm-email"
      tags={["vegetarian"]}
      quote="People who love to eat are always the best people."
      author="Julia Child"
    >
      <AuthHeading
        title={failure ? failure.title : success.title}
        description={failure ? failure.body : success.body}
        icon={
          <div
            className={
              failure
                ? "flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                : "flex size-10 items-center justify-center rounded-full bg-success/10 text-success dark:bg-success-light/15 dark:text-success-light"
            }
          >
            {failure ? (
              <AlertTriangle className="size-5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-5" aria-hidden="true" />
            )}
          </div>
        }
      />

      {emailChange ? (
        <Button asChild className="w-full">
          <Link href={safeRedirectPath(next, "/settings")}>Back to account settings</Link>
        </Button>
      ) : failure ? (
        <Button asChild className="w-full">
          {error === "user_not_found" ? (
            <Link href="/register">Create an account</Link>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </Button>
      ) : (
        <Button asChild className="w-full">
          <Link href={safeNext(next)}>Start cooking</Link>
        </Button>
      )}
    </AuthShell>
  );
}
