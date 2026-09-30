import { passwordProblem } from "@/lib/auth-rules";

/**
 * Checks for the forms on the account settings page. They run before the
 * request for quick feedback; better-auth and the hooks in lib/auth.ts check
 * the same things again on the server.
 */

/** What the person must type to confirm deleting their account. */
export const DELETE_CONFIRMATION = "DELETE";

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export function validateChangePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): FieldErrors<ChangePasswordField> {
  const errors: FieldErrors<ChangePasswordField> = {};
  if (!input.currentPassword) errors.currentPassword = "Enter your current password";

  const problem = passwordProblem(input.newPassword);
  if (problem) {
    errors.newPassword = problem.replace(/^Password/, "New password");
  } else if (input.currentPassword && input.newPassword === input.currentPassword) {
    errors.newPassword = "Choose a password that differs from your current one";
  }

  if (!input.confirmPassword) errors.confirmPassword = "Confirm your new password";
  else if (input.confirmPassword !== input.newPassword) {
    errors.confirmPassword = "Passwords don't match";
  }
  return errors;
}

export type ChangeEmailField = "newEmail";

// Deliberately loose: the confirmation link is the real check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateChangeEmail(
  newEmail: string,
  currentEmail: string
): FieldErrors<ChangeEmailField> {
  const email = newEmail.trim();
  if (!email) return { newEmail: "Enter your new email address" };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { newEmail: "Please enter a valid email address" };
  }
  if (email.toLowerCase() === currentEmail.toLowerCase()) {
    return { newEmail: "That's already your email address" };
  }
  return {};
}

export type DeleteAccountField = "password" | "confirmation";

export function validateDeleteAccount(input: {
  password: string;
  confirmation: string;
}): FieldErrors<DeleteAccountField> {
  const errors: FieldErrors<DeleteAccountField> = {};
  if (!input.password) errors.password = "Enter your password";
  if (input.confirmation.trim() !== DELETE_CONFIRMATION) {
    errors.confirmation = `Type ${DELETE_CONFIRMATION} to confirm`;
  }
  return errors;
}

/** The first field with a problem, in form order, so focus can go there. */
export function firstInvalidField<Field extends string>(
  order: readonly Field[],
  errors: FieldErrors<Field>
): Field | undefined {
  return order.find((field) => errors[field]);
}

/**
 * A readable message for an error from the better-auth client. Its messages
 * are written for developers ("Invalid password"), so the common ones are
 * reworded; messages from the hooks in lib/auth.ts are already readable.
 */
export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  fallback: string
): string {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (error.status === 401) return "Your session has expired. Please sign in again.";
  switch (error.code) {
    case "INVALID_PASSWORD":
      return "That password is incorrect";
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
    case "USER_ALREADY_EXISTS":
      return "Another account already uses that email address";
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "Your account has no password set. Use “Forgot password” to create one.";
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return "New password must be 8 to 128 characters";
  }
  return error.message || fallback;
}
