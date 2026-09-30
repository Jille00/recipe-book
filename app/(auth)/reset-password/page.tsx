import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Kookboek account",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      seed="kookboek-reset-password"
      tags={["breakfast"]}
      quote="A recipe has no soul. You, as the cook, must bring soul to the recipe."
      author="Thomas Keller"
    >
      <AuthHeading
        title="Choose a new password"
        description="Pick something strong you haven't used before."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
