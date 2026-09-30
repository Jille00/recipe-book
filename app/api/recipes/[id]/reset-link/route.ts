import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resetRecipeCode } from "@/lib/db/queries/recipes";
import { invalidIdResponse, isUuid } from "@/lib/api-utils";

/**
 * Gives a recipe a new code, so every link handed out so far stops working.
 * The code is the only thing standing between a link-only recipe and the
 * world, and a recipe that used to be public has had its code in the sitemap
 * and on /browse.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("recipe");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = await resetRecipeCode(id, session.user.id);
    if (!address) {
      return NextResponse.json(
        { error: "Recipe not found or you don't have permission to change it" },
        { status: 404 }
      );
    }

    return NextResponse.json(address);
  } catch (error) {
    console.error("Error resetting recipe link:", error);
    return NextResponse.json({ error: "Failed to reset the link" }, { status: 500 });
  }
}
