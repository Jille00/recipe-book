import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCollection, getUserCollections } from "@/lib/db/queries/collections";
import { MAX_COLLECTIONS_PER_USER, parseCollectionName } from "@/lib/collections";
import {
  invalidBodyResponse,
  invalidIdResponse,
  isUuid,
  readJsonObject,
} from "@/lib/api-utils";

/**
 * The caller's collections with counts and cover photos. With
 * `?recipeId=`, each one also says whether it holds that recipe (for the
 * "Save to collection" picker). Collections are private, so this only ever
 * reads the caller's own and reveals nothing about the recipe itself.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipeId = new URL(request.url).searchParams.get("recipeId");
    if (recipeId !== null && !isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const collections = await getUserCollections(session.user.id, recipeId ?? undefined);
    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const result = await createCollection(session.user.id, parsed.name);
    if (!result.ok) {
      return NextResponse.json(
        { error: `You can have up to ${MAX_COLLECTIONS_PER_USER} collections` },
        { status: 409 }
      );
    }

    const { id, name, createdAt, updatedAt } = result.collection;
    return NextResponse.json(
      { id, name, createdAt, updatedAt, recipeCount: 0, coverImageUrl: null },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
