import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Matches Input (STYLE_GUIDE 04 fields); see input.tsx.
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-card border-input flex field-sizing-content min-h-24 w-full rounded-xl border-[1.5px] px-4 py-3 text-[17px] transition-[color,border-color,box-shadow] duration-(--duration-fast) ease-out outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary/15 dark:focus-visible:ring-ring/40",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/10 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
