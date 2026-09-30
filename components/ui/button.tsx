import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

// STYLE_GUIDE 04 (Button): Hanken Grotesk 600, sm 36 / default 44 / lg 52px.
// Oranje is spent on one thing only: the main action (the default variant).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold tracking-[0.02em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Main action: oranje, white text (4.78:1), uppercase. Night: bright
        // oranje with night text (7.82:1).
        default:
          "bg-cta text-cta-foreground uppercase tracking-[0.06em] hover:bg-cta-hover",
        destructive:
          "bg-destructive text-white hover:bg-destructive-hover focus-visible:ring-destructive dark:text-night",
        // Everything else a page offers: a glazed-edge button in ink.
        outline:
          "border-[1.5px] border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent dark:border-input",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-glaze-line dark:hover:bg-night-line",
        // Guide "Ghost": muted text, darker on hover
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-11 px-6 text-sm has-[>svg]:px-5",
        sm: "h-9 gap-1.5 px-4 text-[13px] has-[>svg]:px-3",
        lg: "h-13 px-8 text-[15px] has-[>svg]:px-6",
        // Icon buttons: default is the 44px minimum touch target
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
