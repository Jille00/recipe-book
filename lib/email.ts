/**
 * Transactional email sending.
 *
 * Uses the Resend REST API when RESEND_API_KEY is set. When it is not set
 * (e.g. local development), the email is logged to the server console instead
 * so the flow can still be exercised end-to-end.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "Kookboek <no-reply@kookboek.app>";

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set. Email to ${to} was not sent.\nSubject: ${subject}\n\n${text}`
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, text }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to send email (${response.status}): ${body}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPasswordResetEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const safeUrl = escapeHtml(url);

  const text = [
    name ? `Hi ${name},` : "Hi,",
    "",
    "We received a request to reset the password for your Kookboek account.",
    "Open the link below to choose a new password. It expires in 1 hour.",
    "",
    url,
    "",
    "If you didn't request this, you can safely ignore this email.",
    "",
    "— Kookboek",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF6F0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#2B2A28;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF6F0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#FFFDF9;border:1px solid #EAE2D6;border-radius:12px;padding:32px;">
            <tr>
              <td style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;padding-bottom:16px;">
                Reset your password
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;padding-bottom:8px;">${greeting}</td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;padding-bottom:24px;">
                We received a request to reset the password for your Kookboek account.
                Click the button below to choose a new password. This link expires in 1 hour.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${safeUrl}" style="display:inline-block;background:#C75D3A;color:#FFFDF9;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;padding:12px 24px;border-radius:8px;">
                  Reset password
                </a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.6;color:#7A736B;padding-bottom:16px;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${safeUrl}" style="color:#C75D3A;word-break:break-all;">${safeUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;line-height:1.6;color:#7A736B;">
                If you didn't request a password reset, you can safely ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: "Reset your Kookboek password", html, text };
}
