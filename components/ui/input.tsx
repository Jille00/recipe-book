import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // STYLE_GUIDE 04 "Input Fields": 48px, cream, 1.5px border, 8px radius,
        // 16px side padding, DM Sans 16px. The border uses --input (taupe-600,
        // 3.71:1 on cream) instead of the guide's sand (1.56:1), which is too
        // faint to identify the field (WCAG 1.4.11).
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-background dark:bg-input/30 border-input h-12 w-full min-w-0 rounded-lg border-[1.5px] px-4 py-2 text-base transition-[color,border-color,box-shadow] duration-(--duration-fast) ease-out outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Focus: terracotta border + soft terracotta-100 halo. The border is
        // terracotta-500 (--ring, 4.06:1) rather than the guide's 400 (2.83:1)
        // so the focus indicator itself clears 3:1.
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-terracotta-100 dark:focus-visible:ring-ring/40",
        // Error: paprika border + paprika/10 halo
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/10 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
