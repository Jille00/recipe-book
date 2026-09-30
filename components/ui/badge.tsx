import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-[0.02em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-primary-foreground [a&]:hover:bg-destructive-hover focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // STYLE_GUIDE 04 difficulty badges: tinted background, dark text
        // (success = Easy, warning = Medium, danger = Hard). All >= 4.5:1.
        // Dark: a low tint with the lighter shade as text (STYLE_GUIDE 07),
        // checked in lib/color-contrast.test.ts.
        success:
          "border-transparent bg-sage-100 text-sage-700 [a&]:hover:bg-sage-200 dark:bg-sage-400/15 dark:text-sage-300 dark:[a&]:hover:bg-sage-400/25",
        warning:
          "border-transparent bg-amber/15 text-amber-700 [a&]:hover:bg-amber/25 dark:text-amber-300",
        danger:
          "border-transparent bg-paprika/10 text-paprika-700 [a&]:hover:bg-paprika/15 dark:bg-paprika/20 dark:text-paprika-300 dark:[a&]:hover:bg-paprika/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
