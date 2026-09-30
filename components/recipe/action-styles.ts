/**
 * The recipe page's action row stays on one line at 375px: below `sm` its
 * secondary buttons collapse to 44px icon buttons. Pair `compactButtonClass`
 * on the button with `compactLabelClass` on its text, which stays as the
 * accessible name.
 */
export const compactButtonClass =
  "max-sm:size-11 max-sm:gap-0 max-sm:px-0 max-sm:has-[>svg]:px-0";

export const compactLabelClass = "max-sm:sr-only";
