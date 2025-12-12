import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecipesByUserId, createRecipe } from "@/lib/db/queries/recipes";
import { recipeSchema } from "@/lib/utils/validation";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recipes = await getRecipesByUserId(session.user.id);
    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = recipeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid recipe data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const recipe = await createRecipe(session.user.id, validation.data);
    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
