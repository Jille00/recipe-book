import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

// STYLE_GUIDE 04 (Button): pills in Sofia Sans Bold, sm 40 / default 48 / lg 56px.
// The main action is the filled aubergine pill (the default variant).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[18px] shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Main action: aubergine, white text. Night: butter with night text.
        default: "bg-cta text-cta-foreground hover:bg-cta-hover",
        destructive:
          "bg-destructive text-white hover:bg-destructive-hover focus-visible:ring-destructive dark:text-primary-foreground",
        // Everything else a page offers: the same pill, drawn in outline.
        outline:
          "border-2 border-foreground text-foreground hover:bg-foreground hover:text-background",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-border",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline decoration-2 underline-offset-4 hover:text-primary-hover",
        // On a block of a recipe's colour (inside a .recipe-* scope).
        "on-recipe":
          "bg-on-recipe text-recipe hover:opacity-90 focus-visible:ring-on-recipe focus-visible:ring-offset-recipe",
        "on-recipe-outline":
          "border-2 border-on-recipe text-on-recipe hover:bg-on-recipe hover:text-recipe focus-visible:ring-on-recipe focus-visible:ring-offset-recipe",
      },
      size: {
        default: "h-12 px-6 text-base has-[>svg]:px-5",
        sm: "h-10 gap-1.5 px-4 text-[15px] has-[>svg]:px-3.5",
        lg: "h-14 px-8 text-lg has-[>svg]:px-7",
        // Icon buttons: every size clears the 44px touch target but icon-sm
        icon: "size-12",
        "icon-sm": "size-10",
        "icon-lg": "size-14",
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
