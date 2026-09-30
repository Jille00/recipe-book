import { describe, it, expect, vi } from "vitest";

// Never talk to AWS from tests.
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: vi.fn(),
  SendEmailCommand: vi.fn(),
}));

import { buildPasswordResetEmail, buildVerificationEmail } from "@/lib/email";

describe("buildPasswordResetEmail", () => {
  it("builds subject, html and text", () => {
    const email = buildPasswordResetEmail({ name: "Jo", url: "https://www.kookboek.app/reset?token=abc" });
    expect(email.subject).toBe("Reset your Kookboek password");
    expect(email.text.startsWith("Hi Jo,\n")).toBe(true);
    expect(email.text).toContain("https://www.kookboek.app/reset?token=abc");
    expect(email.html).toContain("Reset your password");
    expect(email.html).toContain("Hi Jo,");
    expect(email.html).toContain('href="https://www.kookboek.app/reset?token=abc"');
  });

  it("greets without a name", () => {
    expect(buildPasswordResetEmail({ url: "https://x.test" }).text.startsWith("Hi,\n")).toBe(true);
    expect(buildPasswordResetEmail({ name: null, url: "https://x.test" }).html).toContain(">Hi,<");
  });

  it("escapes the name and URL in the HTML", () => {
    const email = buildPasswordResetEmail({
      name: '<script>alert("x")</script>',
      url: 'https://x.test/?a=1&b="2"',
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(email.html).toContain('href="https://x.test/?a=1&amp;b=&quot;2&quot;"');
    // Plain text keeps the raw values
    expect(email.text).toContain('<script>alert("x")</script>');
  });
});

describe("buildVerificationEmail", () => {
  it("builds the confirmation email", () => {
    const email = buildVerificationEmail({ name: "Jo", url: "https://www.kookboek.app/verify?t=1" });
    expect(email.subject).toBe("Confirm your email for Kookboek");
    expect(email.html).toContain("Confirm your email");
    expect(email.html).toContain("Confirm email");
    expect(email.text).toContain("expires in 24 hours");
    expect(email.text.trimEnd().endsWith("— Kookboek")).toBe(true);
  });
});
