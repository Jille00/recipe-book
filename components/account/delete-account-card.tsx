"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUser } from "@/lib/auth-client";
import {
  authErrorMessage,
  DELETE_CONFIRMATION,
  firstInvalidField,
  validateDeleteAccount,
  type DeleteAccountField,
  type FieldErrors,
} from "@/lib/account-forms";
import { AccountCardHeader, AccountField, focusField, FormAlert } from "./account-field";

const FIELD_ORDER = ["password", "confirmation"] as const;

export function DeleteAccountCard() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors<DeleteAccountField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirmation("");
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    setFormError(null);

    const fieldErrors = validateDeleteAccount({ password, confirmation });
    setErrors(fieldErrors);
    const firstInvalid = firstInvalidField(FIELD_ORDER, fieldErrors);
    if (firstInvalid) {
      focusField(formRef.current, firstInvalid);
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteUser({ password });
      if (result.error) {
        const message = authErrorMessage(result.error, "Could not delete your account.");
        if (result.error.code === "INVALID_PASSWORD") {
          setErrors({ password: message });
          focusField(formRef.current, "password");
        } else {
          setFormError(message);
        }
        setIsDeleting(false);
        return;
      }

      toast.success("Your account has been deleted");
      // Stay "deleting" while the home page loads; the account is gone.
      router.push("/");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    // Danger zone: marked by a danger edge on the left and the danger colour
    // on its one button, not by a red card.
    <Card className="border-l-[3px] border-l-destructive/70">
      <AccountCardHeader
        eyebrow="Danger zone"
        title="Delete account"
        description="Permanently removes your account, recipes, photos, favorites, ratings, comments, collections and shopping list. This can't be undone."
      />
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Want a copy first? Download your data above.
        </p>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (isDeleting) return;
            setOpen(next);
            if (!next) reset();
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="shrink-0 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-2xl font-normal">
                  Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Your recipes, photos and everything else in your account will be removed for
                  good, and links to your recipes will stop working. Copies other people saved
                  of your recipes stay with them.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <FormAlert message={formError} />

              <AccountField
                id="password"
                label="Your password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={isDeleting}
                required
              />
              <AccountField
                id="confirmation"
                label={`Type ${DELETE_CONFIRMATION} to confirm`}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                error={errors.confirmation}
                disabled={isDeleting}
                required
              />

              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={isDeleting}>
                  Keep account
                </AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={isDeleting}>
                  {isDeleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {isDeleting ? "Deleting..." : "Delete account"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
