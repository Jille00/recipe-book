import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Kookboek account and start sharing recipes",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-primary/10 to-secondary/20" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <p className="font-display text-4xl font-semibold text-foreground/80">
              &ldquo;The kitchen is the heart of every home, for the most
              part.&rdquo;
            </p>
            <p className="mt-4 text-muted-foreground">— Debi Mazar</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
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
              Create an account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start sharing your favorite recipes today
            </p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
