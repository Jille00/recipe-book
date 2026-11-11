import { cn } from "@/lib/utils";
import { recipeColourClass, type RecipeColour } from "@/lib/recipe-colour";

interface ColourProps {
  /** Stable seed, normally the recipe's share code. */
  seed: string;
  /** Tag names or slugs; the most specific recognised one picks the colour. */
  tags?: readonly string[] | null;
  /** The colour the cook picked, when there is one: it wins over the tags. */
  colour?: string | null;
  className?: string;
}

/**
 * A block of the recipe's colour that fills its box (STYLE_GUIDE 06): the
 * cover of a recipe without a photo. Children sit on the colour in the text
 * colour that reads on it. Without children it is decoration and is left out
 * of print.
 */
export function ColourBlock({
  seed,
  tags,
  colour,
  className,
  children,
}: ColourProps & { children?: React.ReactNode }) {
  return (
    <div
      data-recipe-cover={children ? undefined : ""}
      aria-hidden={children ? undefined : true}
      className={cn(recipeColourClass(seed, tags, colour), "h-full w-full bg-recipe text-on-recipe", className)}
    >
      {children}
    </div>
  );
}

/** A small square of the colour: tag pills, list rows, empty states. */
export function ColourSwatch({ seed, tags, colour, className }: ColourProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(recipeColourClass(seed, tags, colour), "block shrink-0 rounded-lg bg-recipe", className)}
    />
  );
}

/** A dot of the colour, e.g. which recipe a shopping-list line is for. */
export function ColourDot({ seed, tags, colour, className }: ColourProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(recipeColourClass(seed, tags, colour), "block size-3 shrink-0 rounded-full bg-recipe", className)}
    />
  );
}

/**
 * Stripes of several recipes' colours side by side: a collection's cover.
 * With no recipes it is an empty leek-soft block.
 */
export function ColourStripes({
  colours,
  className,
}: {
  colours: readonly RecipeColour[];
  className?: string;
}) {
  return (
    <div data-recipe-cover="" aria-hidden="true" className={cn("flex h-full w-full bg-muted", className)}>
      {colours.map((colour, index) => (
        <span key={index} className={cn(`recipe-${colour}`, "flex-1 bg-recipe")} />
      ))}
    </div>
  );
}
