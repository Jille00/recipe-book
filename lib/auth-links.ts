import { safeRedirectPath } from "@/lib/safe-redirect";

/** Where a verification link lands, whether it worked or not. */
export const CONFIRM_EMAIL_PATH = "/confirm-email";

/**
 * Makes every verification link land on the confirmation page.
 *
 * better-auth builds the link from whatever callbackURL the browser sent,
 * defaulting to "/". Rewriting it here means the landing page can never be
 * skipped by a caller that forgot to pass it. A destination the person was
 * heading to, such as the page that sent them to sign in, is kept as `next`
 * so the confirmation page can continue there.
 */
export function withConfirmationLanding(
  verificationUrl: string,
  options: { emailChange?: EmailChangeStage } = {}
): string {
  const url = new URL(verificationUrl);
  const requested = url.searchParams.get("callbackURL") ?? "/";
  const { emailChange } = options;

  if (!requested.startsWith(CONFIRM_EMAIL_PATH)) {
    // Only same-site paths may be carried forward (see safeRedirectPath for
    // why a simple "doesn't start with //" check is not enough).
    const destination = safeRedirectPath(requested, "/");
    const landing = new URLSearchParams();
    if (destination !== "/") landing.set("next", destination);
    if (emailChange) landing.set(EMAIL_CHANGE_PARAM, emailChange);
    const query = landing.toString();
    url.searchParams.set("callbackURL", query ? `${CONFIRM_EMAIL_PATH}?${query}` : CONFIRM_EMAIL_PATH);
  } else if (emailChange) {
    // An email change reuses the landing of its first link for the second
    // one, so the stage has to be replaced rather than kept.
    const landing = new URL(requested, "https://landing.invalid");
    landing.searchParams.set(EMAIL_CHANGE_PARAM, emailChange);
    url.searchParams.set("callbackURL", `${CONFIRM_EMAIL_PATH}${landing.search}`);
  }

  return url.toString();
}

/**
 * Changing the email address takes two links (see user.changeEmail in
 * lib/auth.ts): "approved" lands after the current address approved the
 * change, "done" after the new address was confirmed and the change made.
 */
export type EmailChangeStage = "approved" | "done";

/** The query parameter on the confirmation page that carries the stage. */
export const EMAIL_CHANGE_PARAM = "change";

export function parseEmailChangeStage(value: unknown): EmailChangeStage | null {
  return value === "approved" || value === "done" ? value : null;
}

/**
 * Whether a better-auth verification token finishes an email change, as
 * opposed to confirming the address of a new account.
 *
 * The token is a signed JWT; better-auth checks the signature when the link
 * is opened. This only reads the payload to pick the right email wording, so
 * it doesn't need to (and can't) verify it.
 */
export function isEmailChangeToken(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return (
      typeof json === "object" &&
      json !== null &&
      typeof (json as { updateTo?: unknown }).updateTo === "string"
    );
  } catch {
    return false;
  }
}
