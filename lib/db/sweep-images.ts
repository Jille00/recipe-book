/**
 * Lists (and with --delete, removes) photos in the recipe-images bucket that no
 * recipe uses: uploads from a form that was never saved, regenerated AI images.
 * Only files older than a day are touched, so a form someone is filling in
 * right now keeps its photo.
 *
 *   npm run images:sweep            # report only
 *   npm run images:sweep -- --delete
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { isNotNull } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "./index";
import { recipe } from "./schema";

const BUCKET = "recipe-images";
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;

async function main() {
  const shouldDelete = process.argv.includes("--delete");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");

  const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET);
  const prefix = `${url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;

  const rows = await db.select({ imageUrl: recipe.imageUrl }).from(recipe).where(isNotNull(recipe.imageUrl));
  const inUse = new Set(
    rows
      .map((r) => r.imageUrl!)
      .filter((u) => u.startsWith(prefix))
      .map((u) => decodeURIComponent(u.slice(prefix.length).split(/[?#]/)[0]))
  );

  const list = async (path: string) => {
    const all = [];
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await storage.list(path, { limit: PAGE, offset });
      if (error) throw error;
      all.push(...data);
      if (data.length < PAGE) return all;
    }
  };

  const cutoff = Date.now() - MIN_AGE_MS;
  const orphans: string[] = [];
  for (const folder of await list("")) {
    // Folders come back without an id; files at the root aren't ours to judge.
    if (folder.id) continue;
    for (const file of await list(folder.name)) {
      const path = `${folder.name}/${file.name}`;
      const created = Date.parse(file.created_at ?? "");
      if (!file.id || inUse.has(path) || !(created < cutoff)) continue;
      orphans.push(path);
    }
  }

  console.log(`${inUse.size} photos in use, ${orphans.length} unused and older than a day.`);
  for (const path of orphans) console.log(`  ${path}`);

  if (shouldDelete && orphans.length > 0) {
    for (let i = 0; i < orphans.length; i += 100) {
      const { error } = await storage.remove(orphans.slice(i, i + 100));
      if (error) throw error;
    }
    console.log(`Deleted ${orphans.length} files.`);
  } else if (orphans.length > 0) {
    console.log("Run again with --delete to remove them.");
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
