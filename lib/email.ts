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

/**
 * The one layout every transactional email uses: a heading, a short message,
 * a single call-to-action button, a plain-link fallback and a footnote.
 * Keeping it in one place stops the emails from drifting apart visually.
 */
function renderActionEmail({
  heading,
  name,
  paragraphs,
  buttonLabel,
  url,
  footnote,
}: {
  heading: string;
  name?: string | null;
  paragraphs: string[];
  buttonLabel: string;
  url: string;
  footnote: string;
}) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const safeUrl = escapeHtml(url);

  const text = [
    name ? `Hi ${name},` : "Hi,",
    "",
    ...paragraphs,
    "",
    url,
    "",
    footnote,
    "",
    "— Kookboek",
  ].join("\n");

  const paragraphRows = paragraphs
    .map(
      (paragraph, index) => `
            <tr>
              <td style="font-size:15px;line-height:1.6;padding-bottom:${
                index === paragraphs.length - 1 ? 24 : 12
              }px;">
                ${escapeHtml(paragraph)}
              </td>
            </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAF6F0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#2B2A28;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF6F0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#FFFDF9;border:1px solid #EAE2D6;border-radius:12px;padding:32px;">
            <tr>
              <td style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;padding-bottom:16px;">
                ${escapeHtml(heading)}
              </td>
            </tr>
            <tr>
              <td style="font-size:15px;line-height:1.6;padding-bottom:8px;">${greeting}</td>
            </tr>${paragraphRows}
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${safeUrl}" style="display:inline-block;background:#C75D3A;color:#FFFDF9;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;text-transform:uppercase;padding:12px 24px;border-radius:8px;">
                  ${escapeHtml(buttonLabel)}
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
                ${escapeHtml(footnote)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}

export function buildPasswordResetEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}) {
  const { html, text } = renderActionEmail({
    heading: "Reset your password",
    name,
    paragraphs: [
      "We received a request to reset the password for your Kookboek account.",
      "Click the button below to choose a new password. This link expires in 1 hour.",
    ],
    buttonLabel: "Reset password",
    url,
    footnote: "If you didn't request a password reset, you can safely ignore this email.",
  });

  return { subject: "Reset your Kookboek password", html, text };
}

export function buildVerificationEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}) {
  const { html, text } = renderActionEmail({
    heading: "Confirm your email",
    name,
    paragraphs: [
      "Welcome to Kookboek. Confirm this is your email address to finish creating your account.",
      "Click the button below to confirm. This link expires in 24 hours.",
    ],
    buttonLabel: "Confirm email",
    url,
    footnote:
      "If you didn't create a Kookboek account, you can safely ignore this email.",
  });

  return { subject: "Confirm your email for Kookboek", html, text };
}
