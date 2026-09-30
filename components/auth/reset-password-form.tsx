"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";
import { Button, Input, Label } from "@/components/ui";
import { resetPasswordSchema } from "@/lib/utils/validation";
import { Loader2, Lock, CheckCircle2, AlertTriangle } from "lucide-react";

/** Mirrors resetPasswordSchema and lib/auth-rules.ts, so the rules are known before the first attempt. */
const PASSWORD_RULES =
  "8 to 128 characters, with an uppercase letter, a lowercase letter, and a number.";

/** Fields in the order they appear, so focus lands on the first bad one. */
const FIELD_ORDER = ["password", "confirmPassword"] as const;
type ResetField = (typeof FIELD_ORDER)[number];

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!token || tokenError) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-destructive">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">This link is invalid or has expired</p>
              <p className="text-sm text-muted-foreground">
                Password reset links only work once and expire after 1 hour.
                Request a new one to continue.
              </p>
            </div>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-(--duration-fast) hover:text-primary-hover hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div
          role="status"
          className="rounded-lg border border-success/25 bg-success/10 p-4 dark:border-success-light/30 dark:bg-success-light/15"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-success dark:text-success-light">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Password updated</p>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. You can now sign in with your new password.
              </p>
            </div>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
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
      const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
      if (firstInvalid) {
        const input = formRef.current?.elements.namedItem(firstInvalid);
        if (input instanceof HTMLElement) input.focus();
      }
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword({
        newPassword: validation.data.password,
        token,
      });

      if (result.error) {
        setErrors({
          form: result.error.message || "Could not reset your password. Please request a new link.",
        });
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setErrors({ form: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const fieldProps = (field: ResetField, hintId?: string) => {
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
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            {...fieldProps("password", "password-hint")}
            type="password"
            placeholder="Create a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
            className="pl-11"
          />
        </div>
        <p id="password-hint" className="text-[13px] text-muted-foreground">
          {PASSWORD_RULES}
        </p>
        <FieldError id="password-error" message={errors.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            {...fieldProps("confirmPassword")}
            type="password"
            placeholder="Confirm your new password"
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
            Updating password...
          </>
        ) : (
          "Reset password"
        )}
      </Button>
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
