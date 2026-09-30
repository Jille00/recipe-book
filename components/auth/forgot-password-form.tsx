"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button, Input, Label } from "@/components/ui";
import { forgotPasswordSchema } from "@/lib/utils/validation";
import { Loader2, Mail, MailCheck, ArrowLeft } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Validation problems belong to the email field; anything else is shown
  // for the form as a whole.
  const [fieldError, setFieldError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldError("");

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setFieldError(
        email.trim()
          ? validation.error.issues[0]?.message || "Please enter a valid email address"
          : "Please enter your email address"
      );
      emailRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const result = await requestPasswordReset({
        email: validation.data.email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        setError(result.error.message || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div role="status" className="rounded-lg bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-primary">
              <MailCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>,
                we&apos;ve sent a link to reset your password. The link expires in 1 hour.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Didn&apos;t get the email? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary-hover hover:underline"
          >
            try again
          </button>
          .
        </p>

        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary-hover hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div
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
            ref={emailRef}
            id="email"
            name="email"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "email-error" : undefined}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="pl-11"
          />
        </div>
        {fieldError && (
          <p id="email-error" className="text-[13px] text-destructive">
            {fieldError}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending link...
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary-hover hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
