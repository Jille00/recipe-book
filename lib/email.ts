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

// Oogst colours and type (docs/STYLE_GUIDE.md 01, 02, 07). Email can't read
// the tokens in app/globals.css, so they are repeated here.
const INK = "#2D1B33";
const FIG = "#6A5A70";
const LEEK = "#F1F4E8";
const TOMATO = "#C9331C";
const LEMON = "#F4C92F";
const BASIL = "#25703F";
const NIGHT = "#1B1020";
const NIGHT_CARD = "#281830";
const NIGHT_TEXT = "#F3EEE0";
const NIGHT_MUTED = "#C4B5C9";
const BUTTER = "#F8E9B4";
const TEXT_FONT = "'Sofia Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const DISPLAY_FONT =
  "'Sofia Sans Extra Condensed','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The one layout every transactional email uses: the mark, a white panel on
 * the leek page with a heading, a short message, a single call-to-action
 * pill, a plain-link fallback and a footnote.
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
              <td class="kb-text" style="font-size:17px;line-height:1.5;color:${INK};padding-bottom:${
                index === paragraphs.length - 1 ? 28 : 12
              }px;">
                ${escapeHtml(paragraph)}
              </td>
            </tr>`
    )
    .join("");

  // Static markup never puts `">` right before `<`: lib/email.test.ts uses
  // that sequence to detect a value breaking out of an attribute.
  // Oogst (docs/STYLE_GUIDE.md) within what mail clients allow: tables and
  // inline styles, with the day colours inline and the night ones in a
  // media query for the clients that honour it. Sofia Sans loads where web
  // fonts are supported (Apple Mail, iOS); elsewhere the stacks fall back to
  // a condensed bold for the heading and Helvetica for the text.
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@400;700&family=Sofia+Sans+Extra+Condensed:wght@800&display=swap" rel="stylesheet" />
    <style>
      @media (prefers-color-scheme: dark) {
        .kb-page { background: ${NIGHT} !important; }
        .kb-panel { background: ${NIGHT_CARD} !important; }
        .kb-text, .kb-mark { color: ${NIGHT_TEXT} !important; }
        .kb-muted, .kb-muted a { color: ${NIGHT_MUTED} !important; }
        .kb-button { background: ${BUTTER} !important; color: ${NIGHT} !important; }
      }
    </style>
  </head>
  <body class="kb-page" style="margin:0;padding:0;background:${LEEK};font-family:${TEXT_FONT};color:${INK};">
    <table role="presentation" class="kb-page" width="100%" cellspacing="0" cellpadding="0" style="background:${LEEK};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;">
            <tr>
              <td style="padding:0 8px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="bottom" style="padding-right:3px;">
                      <div style="width:8px;height:28px;border-radius:2px;background:${TOMATO};font-size:0;line-height:0;">&nbsp;</div>
                    </td>
                    <td valign="bottom" style="padding-right:3px;">
                      <div style="width:8px;height:21px;border-radius:2px;background:${LEMON};font-size:0;line-height:0;">&nbsp;</div>
                    </td>
                    <td valign="bottom" style="padding-right:10px;">
                      <div style="width:8px;height:25px;border-radius:2px;background:${BASIL};font-size:0;line-height:0;">&nbsp;</div>
                    </td>
                    <td valign="bottom" class="kb-mark" style="font-family:${DISPLAY_FONT};font-size:36px;line-height:28px;font-weight:800;color:${INK};">kookboek</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" class="kb-panel" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#FFFFFF;border-radius:24px;padding:32px;">
            <tr>
              <td class="kb-text" style="font-family:${DISPLAY_FONT};font-size:52px;line-height:0.92;font-weight:800;color:${INK};padding-bottom:20px;">
                ${escapeHtml(heading)}
              </td>
            </tr>
            <tr>
              <td class="kb-text" style="font-size:17px;line-height:1.5;color:${INK};padding-bottom:8px;">${greeting}</td>
            </tr>${paragraphRows}
            <tr>
              <td style="padding-bottom:28px;">
                <a href="${safeUrl}" class="kb-button" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;line-height:48px;padding:0 24px;border-radius:999px;">
                  ${escapeHtml(buttonLabel)}
                </a>
              </td>
            </tr>
            <tr>
              <td class="kb-muted" style="font-size:14px;line-height:1.5;color:${FIG};padding-bottom:16px;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${safeUrl}" style="color:${FIG};font-weight:700;word-break:break-all;">${safeUrl}</a>
              </td>
            </tr>
            <tr>
              <td class="kb-muted" style="font-size:14px;line-height:1.5;color:${FIG};">
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

/**
 * Sent to the account's current address when someone asks to move the account
 * to `newEmail`. Nothing changes until this is approved, so a person who got
 * hold of a signed-in session can't quietly take the account over.
 */
export function buildEmailChangeApprovalEmail({
  name,
  newEmail,
  url,
}: {
  name?: string | null;
  newEmail: string;
  url: string;
}) {
  const { html, text } = renderActionEmail({
    heading: "Approve your new email",
    name,
    paragraphs: [
      `Someone asked to change the email address of your Kookboek account to ${newEmail}.`,
      "If that was you, click the button below to approve it. We'll then send a link to the new address to finish the change. This link expires in 24 hours.",
    ],
    buttonLabel: "Approve change",
    url,
    footnote:
      "If you didn't ask for this, ignore this email and your address stays the same. You may want to change your password.",
  });

  return { subject: "Approve the email change for your Kookboek account", html, text };
}

/** Sent to the new address once the current one has approved the change. */
export function buildEmailChangeVerificationEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}) {
  const { html, text } = renderActionEmail({
    heading: "Confirm your new email",
    name,
    paragraphs: [
      "Confirm this address to finish moving your Kookboek account to it. Until then you keep signing in with your old address.",
      "Click the button below to confirm. This link expires in 24 hours.",
    ],
    buttonLabel: "Confirm new email",
    url,
    footnote:
      "If you didn't ask to use this address for Kookboek, you can safely ignore this email.",
  });

  return { subject: "Confirm your new email for Kookboek", html, text };
}
