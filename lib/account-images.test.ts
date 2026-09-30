import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real modules open a database pool and a storage client on use; the
// tests inject their own instead.
vi.mock("@/lib/db", () => ({ db: {}, recipe: {} }));
vi.mock("@/lib/supabase/storage", () => ({ getStorageClient: () => ({}) }));

const { imagesSafeToDelete, listFolder, removeUserImages } = await import("./account-images");
type ImageBucket = import("./account-images").ImageBucket;

const BASE = "https://proj.supabase.co";
const PUBLIC = `${BASE}/storage/v1/object/public/recipe-images`;

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE));
afterEach(() => vi.unstubAllEnvs());

/** An in-memory bucket holding `files` (full paths), listing like Supabase. */
function fakeBucket(files: string[], { pageSize }: { pageSize?: number } = {}) {
  const removed: string[][] = [];
  const bucket: ImageBucket = {
    async list(folder, { limit, offset }) {
      const size = pageSize ?? limit;
      const children = new Map<string, boolean>(); // name -> isFile
      for (const file of files) {
        if (!file.startsWith(`${folder}/`)) continue;
        const rest = file.slice(folder.length + 1);
        const [name, ...deeper] = rest.split("/");
        children.set(name, deeper.length === 0);
      }
      const entries = [...children].map(([name, isFile]) => ({
        name,
        id: isFile ? `id-${name}` : null,
      }));
      return { data: entries.slice(offset, offset + Math.min(size, limit)), error: null };
    },
    async remove(paths) {
      removed.push(paths);
      return { error: null };
    },
  };
  return { bucket, removed };
}

describe("imagesSafeToDelete", () => {
  it("keeps photos another user's recipe still shows", () => {
    expect(
      imagesSafeToDelete(
        "u1",
        ["u1/a.jpg", "u1/b.jpg", "u1/c.jpg"],
        [`${PUBLIC}/u1/b.jpg`, `${PUBLIC}/u1/c.jpg?width=400`]
      )
    ).toEqual(["u1/a.jpg"]);
  });

  it("never returns a path outside the user's folder", () => {
    expect(imagesSafeToDelete("u1", ["u2/a.jpg", "u1/a.jpg", "u10/a.jpg"], [])).toEqual([
      "u1/a.jpg",
    ]);
  });

  it("ignores URLs that aren't bucket photos", () => {
    expect(imagesSafeToDelete("u1", ["u1/a.jpg"], ["https://example.com/u1/a.jpg"])).toEqual([
      "u1/a.jpg",
    ]);
  });
});

describe("listFolder", () => {
  it("pages through large folders", async () => {
    const files = Array.from({ length: 2500 }, (_, i) => `u1/${i}.jpg`);
    const { bucket } = fakeBucket(files);
    const list = vi.spyOn(bucket, "list");
    expect(await listFolder(bucket, "u1")).toHaveLength(2500);
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("walks into subfolders", async () => {
    const { bucket } = fakeBucket(["u1/a.jpg", "u1/old/b.jpg", "u1/old/deeper/c.jpg"]);
    expect((await listFolder(bucket, "u1")).sort()).toEqual([
      "u1/a.jpg",
      "u1/old/b.jpg",
      "u1/old/deeper/c.jpg",
    ]);
  });

  it("throws when storage reports an error", async () => {
    const bucket: ImageBucket = {
      list: async () => ({ data: null, error: new Error("down") }),
      remove: async () => ({ error: null }),
    };
    await expect(listFolder(bucket, "u1")).rejects.toThrow("down");
  });
});

describe("removeUserImages", () => {
  it("removes the user's photos in batches, skipping shared ones", async () => {
    const files = [
      ...Array.from({ length: 150 }, (_, i) => `u1/${i}.jpg`),
      "u2/theirs.jpg",
    ];
    const { bucket, removed } = fakeBucket(files);
    const findImageUrlsUsedByOthers = vi.fn(async () => [`${PUBLIC}/u1/7.jpg`]);

    const result = await removeUserImages("u1", { bucket, findImageUrlsUsedByOthers });

    expect(findImageUrlsUsedByOthers).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ removed: 149, kept: 1 });
    expect(removed.map((batch) => batch.length)).toEqual([100, 49]);
    const all = removed.flat();
    expect(all).not.toContain("u1/7.jpg");
    expect(all).not.toContain("u2/theirs.jpg");
  });

  it("does nothing when the user has no photos", async () => {
    const { bucket, removed } = fakeBucket(["u2/theirs.jpg"]);
    const findImageUrlsUsedByOthers = vi.fn(async () => []);
    expect(await removeUserImages("u1", { bucket, findImageUrlsUsedByOthers })).toEqual({
      removed: 0,
      kept: 0,
    });
    expect(removed).toEqual([]);
    expect(findImageUrlsUsedByOthers).not.toHaveBeenCalled();
  });

  it("throws when a removal fails, so the account is not deleted", async () => {
    const { bucket } = fakeBucket(["u1/a.jpg"]);
    bucket.remove = async () => ({ error: new Error("storage down") });
    await expect(
      removeUserImages("u1", { bucket, findImageUrlsUsedByOthers: async () => [] })
    ).rejects.toThrow("storage down");
  });

  it.each(["", "a/b", ".."])("refuses the user id %j", async (userId) => {
    const { bucket } = fakeBucket([]);
    await expect(
      removeUserImages(userId, { bucket, findImageUrlsUsedByOthers: async () => [] })
    ).rejects.toThrow("Invalid user id");
  });
});
