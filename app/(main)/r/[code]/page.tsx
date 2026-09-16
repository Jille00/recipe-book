import { notFound, permanentRedirect } from "next/navigation";
import { resolveRecipeAddress } from "@/lib/db/queries/recipes";
import { recipePath } from "@/lib/recipe-url";

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /r/{key} without a slug.
 *
 * Handles a bare code (someone trimmed the link) plus the two older link
 * formats this address replaced: /r/{slug} for public recipes, which is what
 * the sitemap and every shared link used, and /r/{shareToken}. All of them are
 * sent to the recipe's one current address.
 */
export default async function ResolveRecipeAddress({ params }: Props) {
  const { code: key } = await params;
  const address = await resolveRecipeAddress(key);

  if (!address) {
    notFound();
  }

  permanentRedirect(recipePath(address));
}
