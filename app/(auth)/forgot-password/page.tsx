import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset the password for your Kookboek account",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      seed="kookboek-forgot-password"
      tags={["drinks"]}
      quote="No one is born a great cook, one learns by doing."
      author="Julia Child"
    >
      <AuthHeading
        title="Forgot your password?"
        description="Enter the email for your account and we'll send you a link to reset it."
      />
      <ForgotPasswordForm />
    </AuthShell>
  );
}
