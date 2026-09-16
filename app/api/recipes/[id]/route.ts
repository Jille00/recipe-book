import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecipeById, updateRecipe, deleteRecipe } from "@/lib/db/queries/recipes";
import { recipeUpdateSchema } from "@/lib/utils/validation";
import { invalidIdResponse, isUuid } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipe = await getRecipeById(id);

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const isOwner = recipe.userId === session.user.id;

    // Check if user owns the recipe or if it's public
    if (!isOwner && !recipe.isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only the owner or, for a public recipe, anyone reaches this point, so the
    // recipe's code (its address) is safe to return to both.
    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input against the partial update schema: fields that are not
    // sent must stay untouched (a full schema with defaults would, for
    // example, silently unpublish the recipe).
    const validationResult = recipeUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const recipe = await updateRecipe(id, session.user.id, validationResult.data);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found or you don't have permission to edit it" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
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

    if (!isUuid(id)) {
      return invalidIdResponse("recipe");
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deleteRecipe(id, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Recipe not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
