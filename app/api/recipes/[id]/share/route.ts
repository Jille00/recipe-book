import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateRecipeShareToken, revokeRecipeShareToken } from "@/lib/db/queries/recipes";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shareToken = await generateRecipeShareToken(id, session.user.id);

    if (!shareToken) {
      return NextResponse.json(
        { error: "Recipe not found or you don't have permission" },
        { status: 404 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${shareToken}`;
    return NextResponse.json({ shareToken, shareUrl });
  } catch (error) {
    console.error("Error generating share token:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
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
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const revoked = await revokeRecipeShareToken(id, session.user.id);

    if (!revoked) {
      return NextResponse.json(
        { error: "Recipe not found or you don't have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking share token:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}
