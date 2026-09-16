import { describe, expect, it } from "vitest";
import { buildPasswordResetEmail, buildVerificationEmail } from "./email";

const URL_WITH_QUERY = "https://www.kookboek.app/reset-password?token=abc&callbackURL=%2F";

const builders = [
  {
    label: "buildPasswordResetEmail",
    build: buildPasswordResetEmail,
    subject: "Reset your Kookboek password",
    heading: "Reset your password",
    button: "Reset password",
  },
  {
    label: "buildVerificationEmail",
    build: buildVerificationEmail,
    subject: "Confirm your email for Kookboek",
    heading: "Confirm your email",
    button: "Confirm email",
  },
] as const;

describe.each(builders)("$label", ({ build, subject, heading, button }) => {
  it("has the expected subject", () => {
    expect(build({ name: "Jo", url: "https://www.kookboek.app/x" }).subject).toBe(subject);
  });

  it("renders the heading and a call-to-action button linking to the url", () => {
    const { html } = build({ name: "Jo", url: "https://www.kookboek.app/x" });
    expect(html).toContain(heading);
    expect(html).toContain(button);
    expect(html).toMatch(new RegExp(`<a href="https://www\\.kookboek\\.app/x"[^>]*>\\s*${button}\\s*</a>`));
  });

  it("greets by name", () => {
    const { html, text } = build({ name: "Jo", url: "https://www.kookboek.app/x" });
    expect(html).toContain("Hi Jo,");
    expect(text.startsWith("Hi Jo,\n")).toBe(true);
  });

  it.each([[undefined], [null], [""]])("greets without a name when the name is %j", (name) => {
    const { html, text } = build({ name, url: "https://www.kookboek.app/x" });
    expect(html).toContain(">Hi,<");
    expect(html).not.toContain("Hi undefined");
    expect(html).not.toContain("Hi null");
    expect(text.startsWith("Hi,\n")).toBe(true);
  });

  it("escapes HTML in the name", () => {
    const { html } = build({ name: '<script>alert("x")</script> & Co', url: "https://www.kookboek.app/x" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Hi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Co,");
  });

  it("escapes the url in the HTML, including ampersands", () => {
    const { html } = build({ name: "Jo", url: URL_WITH_QUERY });
    expect(html).toContain('href="https://www.kookboek.app/reset-password?token=abc&amp;callbackURL=%2F"');
    expect(html).not.toContain("token=abc&callbackURL");
  });

  it("cannot break out of the href attribute", () => {
    const { html } = build({ name: "Jo", url: 'https://x.test/"><script>alert(1)</script>' });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('"><');
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("keeps the raw url and real newlines in the plain-text version", () => {
    const { text } = build({ name: "Jo & <Co>", url: URL_WITH_QUERY });
    expect(text).toContain(`\n${URL_WITH_QUERY}\n`);
    expect(text).not.toContain("&amp;");
    expect(text).not.toContain("\\n");
    expect(text).toContain("Hi Jo & <Co>,");
    expect(text.split("\n").length).toBeGreaterThan(5);
    expect(text.trimEnd().endsWith("— Kookboek")).toBe(true);
  });

  it("produces a full HTML document", () => {
    const { html } = build({ url: "https://www.kookboek.app/x" });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });
});

describe("email copy", () => {
  it("tells the reader how long the reset link lasts", () => {
    const { html, text } = buildPasswordResetEmail({ url: "https://www.kookboek.app/x" });
    expect(text).toContain("expires in 1 hour");
    expect(html).toContain("expires in 1 hour");
  });

  it("tells the reader how long the verification link lasts", () => {
    const { text } = buildVerificationEmail({ url: "https://www.kookboek.app/x" });
    expect(text).toContain("expires in 24 hours");
  });

  it("leaves apostrophes in the copy readable", () => {
    const { html } = buildPasswordResetEmail({ url: "https://www.kookboek.app/x" });
    expect(html).toContain("If you didn't request a password reset");
  });
});
