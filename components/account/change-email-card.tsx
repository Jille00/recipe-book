"use client";

import { useRef, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { changeEmail } from "@/lib/auth-client";
import {
  authErrorMessage,
  validateChangeEmail,
  type ChangeEmailField,
  type FieldErrors,
} from "@/lib/account-forms";
import {
  AccountCardHeader,
  AccountField,
  focusField,
  FormAlert,
  NoticePanel,
} from "./account-field";

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
      <AccountCardHeader
        title="Email address"
        description={
          <>
            You sign in with{" "}
            <span className="font-medium break-all text-foreground">{currentEmail}</span>.
          </>
        }
      />
      <CardContent>
        {sentTo ? (
          <div className="space-y-4">
            <NoticePanel
              role="status"
              icon={<MailCheck aria-hidden="true" />}
              title="Check your inbox"
            >
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
            </NoticePanel>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setSentTo(null)}>
                Use a different address
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
              <Button type="submit" variant="outline" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Sending..." : "Change email"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
