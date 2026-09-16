/**
 * Transactional email sending via Amazon SES.
 *
 * Uses ACCESS_KEY_AWS / SECRET_ACCESS_KEY_AWS (named this way because Vercel
 * reserves the standard AWS_* names) and AWS_SES_REGION. When credentials are
 * missing (e.g. local development), the email is logged to the server console
 * instead so the flow can still be exercised end-to-end.
 */

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "Kookboek <no-reply@kookboek.app>";

let sesClient: SESv2Client | null = null;

function getSesClient(): SESv2Client | null {
  if (sesClient) return sesClient;

  const accessKeyId = process.env.ACCESS_KEY_AWS;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY_AWS;
  if (!accessKeyId || !secretAccessKey) return null;

  sesClient = new SESv2Client({
    region: process.env.AWS_SES_REGION || "eu-central-1",
    credentials: { accessKeyId, secretAccessKey },
  });
  return sesClient;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const client = getSesClient();

  if (!client) {
    console.warn(
      `[email] AWS credentials not set. Email to ${to} was not sent.\nSubject: ${subject}\n\n${text}`
    );
    return;
  }

  await client.send(
    new SendEmailCommand({
      FromEmailAddress: FROM_ADDRESS,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: { Data: text, Charset: "UTF-8" },
          },
        },
      },
    })
  );
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
