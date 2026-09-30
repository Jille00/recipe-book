import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // STYLE_GUIDE 04 inputs: 48px, white on porcelain, 1.5px pewter edge (--input,
        // 4.00:1 on white), Delft focus ring.
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-card border-input h-12 w-full min-w-0 rounded-lg border-[1.5px] px-4 py-2 text-base transition-[color,border-color,box-shadow] duration-(--duration-fast) ease-out outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary/15 dark:focus-visible:ring-ring/40",
        // Error: danger border and halo
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/10 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
