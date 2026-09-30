import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteCollection,
  getCollection,
  getCollectionRecipes,
  renameCollection,
} from "@/lib/db/queries/collections";
import { parseCollectionName } from "@/lib/collections";
import {
  invalidBodyResponse,
  invalidIdResponse,
  isUuid,
  readJsonObject,
} from "@/lib/api-utils";

// Someone else's collection answers exactly like a missing one: collections
// are private, so their ids must not be confirmable.
const notFound = () =>
  NextResponse.json({ error: "Collection not found" }, { status: 404 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("collection");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const found = await getCollection(id, session.user.id);
    if (!found) return notFound();

    const recipes = await getCollectionRecipes(id, session.user.id);
    return NextResponse.json({ ...found, recipes });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("collection");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    if (!body) return invalidBodyResponse();

    const parsed = parseCollectionName(body.name);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const renamed = await renameCollection(id, session.user.id, parsed.name);
    if (!renamed) return notFound();

    return NextResponse.json(renamed);
  } catch (error) {
    console.error("Error renaming collection:", error);
    return NextResponse.json({ error: "Failed to rename collection" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return invalidIdResponse("collection");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only the grouping goes; the recipes in it are untouched.
    const deleted = await deleteCollection(id, session.user.id);
    if (!deleted) return notFound();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
