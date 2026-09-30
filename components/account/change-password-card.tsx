"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { changePassword } from "@/lib/auth-client";
import {
  authErrorMessage,
  firstInvalidField,
  validateChangePassword,
  type ChangePasswordField,
  type FieldErrors,
} from "@/lib/account-forms";
import { AccountField, focusField, FormAlert } from "./account-field";

const FIELD_ORDER = ["currentPassword", "newPassword", "confirmPassword"] as const;

/** Mirrors lib/auth-rules.ts, so the rules are known before the first attempt. */
const PASSWORD_RULES =
  "8 to 128 characters, with an uppercase letter, a lowercase letter, and a number.";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordCard() {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<ChangePasswordField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: ChangePasswordField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fieldErrors = validateChangePassword(values);
    setErrors(fieldErrors);
    const firstInvalid = firstInvalidField(FIELD_ORDER, fieldErrors);
    if (firstInvalid) {
      focusField(formRef.current, firstInvalid);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        // Anyone signed in elsewhere, perhaps with the old password, is
        // signed out; this browser gets a fresh session.
        revokeOtherSessions: true,
      });

      if (result.error) {
        const message = authErrorMessage(result.error, "Could not change your password.");
        if (result.error.code === "INVALID_PASSWORD") {
          setErrors({ currentPassword: message });
          focusField(formRef.current, "currentPassword");
        } else {
          setFormError(message);
        }
        return;
      }

      setValues(EMPTY);
      toast.success("Password changed. Other devices have been signed out.");
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
          <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          Password
        </CardTitle>
        <CardDescription>
          Changing your password signs you out on every other device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
          <FormAlert message={formError} />

          <AccountField
            id="currentPassword"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={setField("currentPassword")}
            error={errors.currentPassword}
            required
          />
          <AccountField
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={setField("newPassword")}
            hint={PASSWORD_RULES}
            error={errors.newPassword}
            required
          />
          <AccountField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={setField("confirmPassword")}
            error={errors.confirmPassword}
            required
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
