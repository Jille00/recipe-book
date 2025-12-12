import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Log In - Recipe Book",
  description: "Sign in to your Recipe Book account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-50 dark:bg-neutral-900">
      <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded-xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
