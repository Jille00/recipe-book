/**
 * Account rules enforced on the server. The register and reset forms check
 * the same things for quick feedback, but a direct POST to better-auth skips
 * the forms, so these run in lib/auth.ts before the request is handled.
 */

export const MAX_NAME_LENGTH = 100;

/** Why `password` isn't acceptable, or null when it is. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password must be 128 characters or less";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

/** Why `name` isn't acceptable as a display name, or null when it is. */
export function nameProblem(name: unknown): string | null {
  if (typeof name !== "string" || name.trim().length === 0) return "Name is required";
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or less`;
  }
  return null;
}
