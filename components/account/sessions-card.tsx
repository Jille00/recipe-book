"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { AccountCardHeader } from "./account-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { revokeSessions, signOut } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/account-forms";

export function SessionsCard({ sessionCount }: { sessionCount: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOutEverywhere = async (event: React.MouseEvent) => {
    // Keep the dialog open, showing progress, until the request settles.
    event.preventDefault();
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      // Ends every session, this one included, then clears this browser's
      // cookie (the session behind it is already gone).
      const result = await revokeSessions();
      if (result.error) {
        throw new Error(authErrorMessage(result.error, "Could not sign out your devices."));
      }
      await signOut().catch(() => {});
      toast.success("Signed out on every device");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out your devices.");
      setIsSigningOut(false);
      setOpen(false);
    }
  };

  const devices =
    sessionCount === null
      ? null
      : sessionCount === 1
        ? "You're signed in on this device only."
        : `You're signed in on ${sessionCount} devices or browsers.`;

  return (
    <Card>
      <AccountCardHeader
        title="Signed-in devices"
        description="Lost a phone or signed in on a shared computer? Sign out everywhere at once."
      />
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {sessionCount !== null && sessionCount > 1 ? (
            <>
              You&apos;re signed in on{" "}
              <span className="font-mono text-foreground tabular">{sessionCount}</span>{" "}
              devices or browsers.
            </>
          ) : (
            devices
          )}
        </p>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (!isSigningOut) setOpen(next);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out everywhere
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl font-normal">
                Sign out everywhere?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Every device and browser signed in to your account will be signed out,
                including this one. You can sign in again straight away.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSigningOut}>Stay signed in</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSignOutEverywhere}
                disabled={isSigningOut}
                className={buttonVariants({ variant: "default" })}
              >
                {isSigningOut && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isSigningOut ? "Signing out..." : "Sign out everywhere"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
