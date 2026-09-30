import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  invalidBodyResponse,
  invalidIdResponse,
  isUuid,
  readJsonObject,
} from "@/lib/api-utils";
import {
  deleteShoppingListItem,
  updateShoppingListItem,
} from "@/lib/db/queries/shopping-list";
import {
  firstIssue,
  updateShoppingListItemSchema,
} from "@/lib/shopping-list/validation";

function notFound() {
  return NextResponse.json({ error: "Item not found" }, { status: 404 });
}

/** Tick an item or change its text: `{ checked?, text? }`. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("item");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (!body) return invalidBodyResponse();

    const parsed = updateShoppingListItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }

    // Scoped to the caller, so someone else's item is simply "not found".
    const item = await updateShoppingListItem(session.user.id, id, parsed.data);
    if (!item) return notFound();

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating shopping list item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("item");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deleteShoppingListItem(session.user.id, id);
    if (!deleted) return notFound();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping list item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
