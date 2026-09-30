"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signUp, sendVerificationEmail } from "@/lib/auth-client";
import { Button, Input, Label } from "@/components/ui";
import { registerSchema } from "@/lib/utils/validation";
import { CONFIRM_EMAIL_PATH } from "@/lib/auth-links";
import { ArrowLeft, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";

/** Seconds to wait before another confirmation email can be requested. */
const RESEND_COOLDOWN = 60;

/** Mirrors registerSchema and lib/auth-rules.ts, so the rules are known before the first attempt. */
const PASSWORD_RULES =
  "8 to 128 characters, with an uppercase letter, a lowercase letter, and a number.";

/** Fields in the order they appear, so focus lands on the first bad one. */
const FIELD_ORDER = ["name", "email", "password", "confirmPassword"] as const;
type RegisterField = (typeof FIELD_ORDER)[number];

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  // Once the account exists the form is replaced by a "check your inbox"
  // screen: new accounts must confirm their email before they can sign in.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Validate with zod
    const validation = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0];
        // Keep the first problem per field: it is the one to fix first.
        if (typeof field === "string" && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
      if (firstInvalid) {
        const input = formRef.current?.elements.namedItem(firstInvalid);
        if (input instanceof HTMLElement) input.focus();
      }
      return;
    }

    try {
      const result = await signUp.email({
        name,
        email,
        password,
        callbackURL: CONFIRM_EMAIL_PATH,
      });

      if (result.error) {
        setErrors({ form: result.error.message || "Registration failed" });
      } else {
        setRegisteredEmail(email);
        // The first email was just sent; don't invite an immediate duplicate.
        setCooldown(RESEND_COOLDOWN);
      }
    } catch {
      setErrors({ form: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail || cooldown > 0 || resendState === "sending") return;
    setResendState("sending");
    try {
      const result = await sendVerificationEmail({
        email: registeredEmail,
        callbackURL: CONFIRM_EMAIL_PATH,
      });
      setResendState(result.error ? "error" : "sent");
      if (!result.error) setCooldown(RESEND_COOLDOWN);
    } catch {
      setResendState("error");
    }
  };

  if (registeredEmail) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-primary">
              <MailCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Confirm your email</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a link to{" "}
                <span className="font-medium text-foreground">{registeredEmail}</span>.
                Open it to finish creating your account. The link expires in 24 hours.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or send it again.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0 || resendState === "sending"}
            isLoading={resendState === "sending"}
          >
            {cooldown > 0 ? `Send again in ${cooldown}s` : "Send the email again"}
          </Button>
          {resendState === "sent" && (
            <p className="text-sm text-muted-foreground">
              Sent. It can take a minute to arrive.
            </p>
          )}
          {resendState === "error" && (
            <p className="text-sm text-destructive">
              We couldn&apos;t send it right now. Wait a moment and try again.
            </p>
          )}
        </div>

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

  const fieldProps = (field: RegisterField, hintId?: string) => {
    const errorId = errors[field] ? `${field}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ");
    return {
      id: field,
      name: field,
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy || undefined,
    };
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errors.form}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <div className="relative">
          <User
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            {...fieldProps("name")}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="pl-11"
          />
        </div>
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            {...fieldProps("email")}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-11"
          />
        </div>
        <FieldError id="email-error" message={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            {...fieldProps("password", "password-hint")}
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="pl-11"
          />
        </div>
        <p id="password-hint" className="text-[13px] text-muted-foreground">
          {PASSWORD_RULES}
        </p>
        <FieldError id="password-error" message={errors.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            {...fieldProps("confirmPassword")}
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="pl-11"
          />
        </div>
        <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[13px] text-destructive">
      {message}
    </p>
  );
}
