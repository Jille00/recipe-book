"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Print the recipe as shown: the print styles in app/globals.css strip the
 * page down to title, times, the scaled ingredients and the steps.
 */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print
    </Button>
  );
}
