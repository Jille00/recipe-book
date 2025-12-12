import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addFavorite, removeFavorite, isFavorited } from "@/lib/db/queries/favorites";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorited = await isFavorited(session.user.id, recipeId);
    return NextResponse.json({ isFavorited: favorited });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      { error: "Failed to check favorite status" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await addFavorite(session.user.id, recipeId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to add favorite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isFavorited: true });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await removeFavorite(session.user.id, recipeId);
    return NextResponse.json({ success: true, isFavorited: false });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
