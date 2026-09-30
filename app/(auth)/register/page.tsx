import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "../_components/auth-shell";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Kookboek account and start sharing recipes",
  alternates: { canonical: "/register" },
};

export default async function RegisterPage() {
  // Already signed in: there is no account to create.
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      seed="kookboek-register"
      tags={["baking"]}
      quote="The kitchen is the heart of every home, for the most part."
      author="Debi Mazar"
      panelSide="left"
    >
      <AuthHeading
        title="Start your cookbook"
        description="Create an account to save, scale and share your recipes."
      />
      <RegisterForm />
    </AuthShell>
  );
}
