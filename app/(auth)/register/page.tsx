import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Sign Up - Recipe Book",
  description: "Create your Recipe Book account and start sharing recipes",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-neutral-50 dark:bg-neutral-900">
      <RegisterForm />
    </div>
  );
}
