"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { AccountCardHeader } from "./account-field";

const FALLBACK_NAME = "kookboek-export.json";

/** The file name from a Content-Disposition header, if it has a simple one. */
function fileNameFrom(header: string | null): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? FALLBACK_NAME;
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 401) return "Your session has expired. Please sign in again.";
  try {
    const data = await response.json();
    if (typeof data?.error === "string" && data.error) return data.error;
  } catch {
    // Not JSON; use the generic message.
  }
  return "Could not export your data. Please try again.";
}

export function ExportDataCard() {
  const [isExporting, setIsExporting] = useState(false);

  // Fetched rather than linked, so a rate limit or error shows as a message
  // instead of being saved as a file.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" });
      if (!response.ok) throw new Error(await errorMessage(response));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFrom(response.headers.get("Content-Disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the download before freeing it.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("Your data export is downloading");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export your data. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <AccountCardHeader
        title="Export your data"
        description="Download a JSON file with your profile, recipes, favorites, ratings, comments, collections and shopping list."
      />
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Photos are linked by address, not included in the file.
        </p>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {isExporting ? "Preparing..." : "Download my data"}
        </Button>
      </CardContent>
    </Card>
  );
}
