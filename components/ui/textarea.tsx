import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Matches Input (STYLE_GUIDE 04 "Input Fields"); see input.tsx.
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-background dark:bg-input/30 border-input flex field-sizing-content min-h-24 w-full rounded-lg border-[1.5px] px-4 py-3 text-base transition-[color,border-color,box-shadow] duration-(--duration-fast) ease-out outline-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-terracotta-100 dark:focus-visible:ring-ring/40",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/10 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
