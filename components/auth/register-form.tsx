"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signUp, sendVerificationEmail } from "@/lib/auth-client";
import { Button, Input, Label } from "@/components/ui";
import { registerSchema } from "@/lib/utils/validation";
import { CONFIRM_EMAIL_PATH } from "@/lib/auth-links";
import { ArrowLeft, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";

/** Seconds to wait before another confirmation email can be requested. */
const RESEND_COOLDOWN = 60;

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
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
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
        <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Confirm your email</p>
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
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.form && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {errors.form}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="pl-10"
          />
        </div>
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-10"
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="pl-10"
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="pl-10"
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
