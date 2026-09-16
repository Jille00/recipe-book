import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm the email address for your Kookboek account",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
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

// Only continue to a path on this site. Anything else could send someone off
// to another domain straight after they've been signed in.
function safeNext(next: string | undefined): string {
  return safeRedirectPath(next, "/dashboard");
}

export default async function ConfirmEmailPage({ searchParams }: Props) {
  const { error, next } = await searchParams;
  const failure = error ? (FAILURES[error] ?? FAILURES.invalid_token) : null;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Message */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Kookboek"
                width={96}
                height={96}
                className="h-12 w-auto"
              />
            </Link>
            <div
              className={
                failure
                  ? "mt-8 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  : "mt-8 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground"
              }
            >
              {failure ? (
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-balance">
              {failure ? failure.title : "Your email is confirmed"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {failure
                ? failure.body
                : "Your account is ready and you're signed in."}
            </p>
          </div>

          {failure ? (
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
        </div>
      </div>

      {/* Right side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-primary/10 to-secondary/20" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <p className="font-display text-4xl font-semibold text-foreground/80">
              &ldquo;People who love to eat are always the best people.&rdquo;
            </p>
            <p className="mt-4 text-muted-foreground">— Julia Child</p>
          </div>
        </div>
      </div>
    </div>
  );
}
