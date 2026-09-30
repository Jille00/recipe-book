"use client";

import { useRef, useState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { changeEmail } from "@/lib/auth-client";
import {
  authErrorMessage,
  validateChangeEmail,
  type ChangeEmailField,
  type FieldErrors,
} from "@/lib/account-forms";
import { AccountField, focusField, FormAlert } from "./account-field";

interface ChangeEmailCardProps {
  currentEmail: string;
  /** Verified accounts approve the change from their current address first. */
  emailVerified: boolean;
}

export function ChangeEmailCard({ currentEmail, emailVerified }: ChangeEmailCardProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [newEmail, setNewEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors<ChangeEmailField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fieldErrors = validateChangeEmail(newEmail, currentEmail);
    setErrors(fieldErrors);
    if (fieldErrors.newEmail) {
      focusField(formRef.current, "newEmail");
      return;
    }

    setIsSubmitting(true);
    try {
      const requested = newEmail.trim().toLowerCase();
      const result = await changeEmail({
        newEmail: requested,
        // Rewritten to the confirmation page by lib/auth-links.ts, which then
        // offers a way back here.
        callbackURL: "/settings",
      });

      if (result.error) {
        const message = authErrorMessage(result.error, "Could not start the email change.");
        if (result.error.status === 422 || result.error.code?.startsWith("USER_ALREADY_EXISTS")) {
          setErrors({ newEmail: message });
          focusField(formRef.current, "newEmail");
        } else {
          setFormError(message);
        }
        return;
      }

      setSentTo(requested);
      setNewEmail("");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
          Email address
        </CardTitle>
        <CardDescription>
          You sign in with <span className="font-medium text-foreground">{currentEmail}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sentTo ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-xl border border-secondary/30 bg-secondary/10 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
                  <MailCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Check your inbox</p>
                  {emailVerified ? (
                    <p className="text-sm text-muted-foreground">
                      We sent a link to <span className="font-medium text-foreground">{currentEmail}</span>{" "}
                      to approve the change. After that, we&apos;ll send one more link to{" "}
                      <span className="font-medium text-foreground">{sentTo}</span> to confirm it.
                      Your address stays the same until then.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      We sent a link to <span className="font-medium text-foreground">{sentTo}</span>.
                      Open it to confirm the new address.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">The links expire in 24 hours.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setSentTo(null)}>
                Use a Different Address
              </Button>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormAlert message={formError} />
            <AccountField
              id="newEmail"
              label="New email address"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              hint={
                emailVerified
                  ? "We'll ask your current address to approve the change, then confirm the new one."
                  : "We'll send a confirmation link to the new address."
              }
              error={errors.newEmail}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Sending..." : "Change Email"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
