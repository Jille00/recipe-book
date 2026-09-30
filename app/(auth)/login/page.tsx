import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "../_components/auth-shell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Kookboek account",
  alternates: { canonical: "/login" },
};

interface Props {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: Props) {
  // Already signed in: skip the form and continue to wherever it was headed.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    const { callbackUrl } = await searchParams;
    redirect(
      safeRedirectPath(
        typeof callbackUrl === "string" ? callbackUrl : undefined,
        "/dashboard"
      )
    );
  }

  return (
    <AuthShell
      seed="kookboek-login"
      tags={["desserts"]}
      quote="Cooking is like love. It should be entered into with abandon or not at all."
      author="Harriet Van Horne"
    >
      <AuthHeading title="Welcome back" description="Sign in to get back to your recipes." />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
