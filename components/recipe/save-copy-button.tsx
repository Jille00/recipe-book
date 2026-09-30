"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui";
import { withRecipeCode } from "./recipe-api";

interface SaveCopyButtonProps {
  recipeId: string;
  /** Proves access to an unlisted recipe. */
  code: string;
  isAuthenticated: boolean;
}

/**
 * "Save a copy" of someone else's recipe: creates a private recipe for the
 * viewer and opens it in the editor so they can make it their own.
 */
export function SaveCopyButton({ recipeId, code, isAuthenticated }: SaveCopyButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCopying, setIsCopying] = useState(false);
  const inFlightRef = useRef(false);

  const goToLogin = () =>
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);

  const handleCopy = async () => {
    if (!isAuthenticated) {
      goToLogin();
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsCopying(true);

    try {
      const res = await fetch(withRecipeCode(`/api/recipes/${recipeId}/copy`, code), {
        method: "POST",
      });
      if (res.status === 401) {
        goToLogin();
        inFlightRef.current = false;
        setIsCopying(false);
        return;
      }

      let data: { editPath?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Not JSON; handled below.
      }
      if (!res.ok || !data.editPath) {
        throw new Error(data.error || "Couldn't save a copy");
      }

      toast.success("Copy saved to your recipes. Make it your own!");
      // Stay busy while the editor loads, so a second click can't make a
      // second copy.
      router.push(data.editPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save a copy");
      inFlightRef.current = false;
      setIsCopying(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} isLoading={isCopying}>
      {!isCopying && <Copy className="h-4 w-4" aria-hidden="true" />}
      {isCopying ? "Saving copy..." : "Save a copy"}
    </Button>
  );
}
