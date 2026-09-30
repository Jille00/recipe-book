"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Print the recipe as shown: the print styles in app/globals.css strip the
 * page down to title, times, the scaled ingredients and the steps.
 */
export function printRecipe() {
  window.print();
}

export function PrintButton({ className }: { className?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={printRecipe} className={className}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print
    </Button>
  );
}
