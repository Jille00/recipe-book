import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Kookboek account",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Kookboek"
                width={96}
                height={96}
                className="h-12 w-auto"
              />
            </Link>
            <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick something strong you haven&apos;t used before
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-primary/10 to-secondary/20" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <p className="font-display text-4xl font-semibold text-foreground/80">
              &ldquo;A recipe has no soul. You, as the cook, must bring soul to the recipe.&rdquo;
            </p>
            <p className="mt-4 text-muted-foreground">— Thomas Keller</p>
          </div>
        </div>
      </div>
    </div>
  );
}
