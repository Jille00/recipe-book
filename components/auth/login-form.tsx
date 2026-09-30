"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { Button, Input, Label } from "@/components/ui";
import { forgotPasswordSchema } from "@/lib/utils/validation";
import { Loader2, Mail, Lock, MailCheck } from "lucide-react";

// Where to go after signing in. Validated so a crafted link can't send someone
// to another site right after they sign in.
function getSafeCallbackUrl(url: string | null): string {
  return safeRedirectPath(url, "/dashboard");
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Set when the password was right but the email isn't confirmed yet.
  // better-auth has already emailed a fresh link by the time we find out.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnconfirmedEmail(null);

    // Only the shape is checked here; whether the password is right is the
    // server's call. Older accounts may predate the current password rules.
    const nextFieldErrors: { email?: string; password?: string } = {};
    const emailCheck = forgotPasswordSchema.shape.email.safeParse(email);
    if (!email.trim()) {
      nextFieldErrors.email = "Please enter your email address";
    } else if (!emailCheck.success) {
      nextFieldErrors.email =
        emailCheck.error.issues[0]?.message || "Please enter a valid email address";
    }
    if (!password) {
      nextFieldErrors.password = "Please enter your password";
    }
    setFieldErrors(nextFieldErrors);

    const firstInvalid = (["email", "password"] as const).find(
      (field) => nextFieldErrors[field]
    );
    if (firstInvalid) {
      const input = formRef.current?.elements.namedItem(firstInvalid);
      if (input instanceof HTMLElement) input.focus();
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
        // Carried through the confirmation link so confirming continues to
        // wherever this sign-in was headed.
        callbackURL: callbackUrl,
      });

      if (result.error) {
        // better-auth also answers 403 for an untrusted origin or callback, where
        // the password was never checked and no email went out.
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setUnconfirmedEmail(email);
        } else {
          setError(result.error.message || "Invalid email or password");
        }
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {unconfirmedEmail && (
        <div
          role="status"
          className="rounded-lg bg-muted p-4"
        >
          <div className="flex items-start gap-3">
            <MailCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium">Confirm your email to sign in</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a new link to{" "}
                <span className="font-medium text-foreground">{unconfirmedEmail}</span>.
                Open it and you&apos;ll be signed in.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          id="login-error"
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-11"
          />
        </div>
        {fieldErrors.email && (
          <p id="email-error" className="text-[13px] text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="rounded-sm text-sm font-medium text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary-hover hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            aria-invalid={fieldErrors.password || error ? true : undefined}
            aria-describedby={
              fieldErrors.password
                ? "password-error"
                : error
                  ? "login-error"
                  : undefined
            }
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pl-11"
          />
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="text-[13px] text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary-hover hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
