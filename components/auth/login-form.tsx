"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { Button, Input, Label } from "@/components/ui";
import { Loader2, Mail, Lock, MailCheck } from "lucide-react";

// Where to go after signing in. Validated so a crafted link can't send someone
// to another site right after they sign in.
function getSafeCallbackUrl(url: string | null): string {
  return safeRedirectPath(url, "/dashboard");
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Set when the password was right but the email isn't confirmed yet.
  // better-auth has already emailed a fresh link by the time we find out.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnconfirmedEmail(null);
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
        // Carried through the confirmation link so confirming continues to
        // wherever this sign-in was headed.
        callbackURL: callbackUrl,
      });

      if (result.error) {
        const isUnconfirmed =
          result.error.code === "EMAIL_NOT_VERIFIED" || result.error.status === 403;
        if (isUnconfirmed) {
          setUnconfirmedEmail(email);
        } else {
          setError(result.error.message || "Invalid email or password");
        }
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {unconfirmedEmail && (
        <div
          role="status"
          className="rounded-xl border border-secondary/30 bg-secondary/10 p-4"
        >
          <div className="flex items-start gap-3">
            <MailCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-secondary-foreground"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium">Confirm your email to sign in</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a new link to{" "}
                <span className="font-medium text-foreground">{unconfirmedEmail}</span>.
                Open it and you&apos;ll be signed in.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pl-10"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
