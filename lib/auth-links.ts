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
export function withConfirmationLanding(verificationUrl: string): string {
  const url = new URL(verificationUrl);
  const requested = url.searchParams.get("callbackURL") ?? "/";

  if (!requested.startsWith(CONFIRM_EMAIL_PATH)) {
    // Only same-site relative paths may be carried forward.
    const isSafePath = requested.startsWith("/") && !requested.startsWith("//");
    const landing =
      isSafePath && requested !== "/"
        ? `${CONFIRM_EMAIL_PATH}?next=${encodeURIComponent(requested)}`
        : CONFIRM_EMAIL_PATH;
    url.searchParams.set("callbackURL", landing);
  }

  return url.toString();
}
