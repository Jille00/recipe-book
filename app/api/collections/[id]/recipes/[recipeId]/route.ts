import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { removeRecipeFromCollection } from "@/lib/db/queries/collections";
import { invalidIdResponse, isUuid } from "@/lib/api-utils";

/**
 * Removes a recipe from one of the caller's collections. No access check on
 * the recipe: taking something out must keep working after it goes private.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  try {
    const { id, recipeId } = await params;
    if (!isUuid(id)) return invalidIdResponse("collection");
    if (!isUuid(recipeId)) return invalidIdResponse("recipe");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const owned = await removeRecipeFromCollection(id, session.user.id, recipeId);
    if (!owned) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing recipe from collection:", error);
    return NextResponse.json(
      { error: "Failed to remove recipe from collection" },
      { status: 500 }
    );
  }
}
