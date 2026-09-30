import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remove = vi.fn(async (paths: string[]) => ({ error: null, paths }));
vi.mock("@/lib/supabase/storage", () => ({
  getStorageClient: () => ({ storage: { from: () => ({ remove }) } }),
}));

const { recipeImagePath, deleteRecipeImage } = await import("./recipe-images");

const BASE = "https://proj.supabase.co";
const PUBLIC = `${BASE}/storage/v1/object/public/recipe-images`;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
  remove.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("recipeImagePath", () => {
  it("returns the object path of a bucket URL", () => {
    expect(recipeImagePath(`${PUBLIC}/user-1/123-abc.jpg`)).toBe("user-1/123-abc.jpg");
    expect(recipeImagePath(`${PUBLIC}/user-1/a.jpg?width=400`)).toBe("user-1/a.jpg");
  });

  it.each([
    null,
    "",
    "https://example.com/storage/v1/object/public/recipe-images/user-1/a.jpg",
    `${BASE}/storage/v1/object/public/other-bucket/user-1/a.jpg`,
    `${PUBLIC}/user-1/../user-2/a.jpg`,
    `${PUBLIC}/user-1/%2E%2E/user-2/a.jpg`,
  ])("rejects %j", (url) => {
    expect(recipeImagePath(url)).toBeNull();
  });
});

describe("deleteRecipeImage", () => {
  it("removes an image in the owner's folder", async () => {
    await deleteRecipeImage(`${PUBLIC}/user-1/a.jpg`, "user-1");
    expect(remove).toHaveBeenCalledWith(["user-1/a.jpg"]);
  });

  it("never removes another user's image", async () => {
    await deleteRecipeImage(`${PUBLIC}/user-2/a.jpg`, "user-1");
    expect(remove).not.toHaveBeenCalled();
  });

  it("ignores URLs outside the bucket", async () => {
    await deleteRecipeImage("https://example.com/a.jpg", "user-1");
    expect(remove).not.toHaveBeenCalled();
  });
});
