import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getRecipeComments,
  createComment,
  getCommentCount,
  MAX_COMMENT_LENGTH,
} from "@/lib/db/queries/comments";
import { getRecipeById } from "@/lib/db/queries/recipes";
import {
  canReadRecipe,
  invalidIdResponse,
  isUuid,
  parsePaginationParam,
} from "@/lib/api-utils";

const MAX_COMMENT_PAGE_SIZE = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    // Comments inherit the visibility of their recipe: private recipes must
    // not expose commenter names/avatars to anyone but the owner.
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // A share link is the only proof a non-owner holds for a private recipe,
    // and the page itself is rendered from it, so accept it here too.
    const { searchParams } = new URL(request.url);
    const presentedToken = searchParams.get("shareToken");

    if (!canReadRecipe(recipe, session?.user?.id, presentedToken)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = parsePaginationParam(searchParams.get("limit"), {
      fallback: 10,
      min: 1,
      max: MAX_COMMENT_PAGE_SIZE,
    });
    const offset = parsePaginationParam(searchParams.get("offset"), {
      fallback: 0,
      min: 0,
      max: 100_000,
    });

    const result = await getRecipeComments(recipeId, { limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;

    if (!isUuid(recipeId)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if recipe exists and is public
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Users can comment on public recipes or their own recipes
    if (!recipe.isPublic && recipe.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cannot comment on private recipes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (content.trim().length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    const comment = await createComment(session.user.id, recipeId, content);
    const total = await getCommentCount(recipeId);

    return NextResponse.json({
      success: true,
      comment,
      total,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
