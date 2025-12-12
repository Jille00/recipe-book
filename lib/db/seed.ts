import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./index";
import { tag } from "./schema";

const tags = [
  { name: "Breakfast", slug: "breakfast" },
  { name: "Lunch", slug: "lunch" },
  { name: "Dinner", slug: "dinner" },
  { name: "Appetizers", slug: "appetizers" },
  { name: "Soups & Stews", slug: "soups-stews" },
  { name: "Salads", slug: "salads" },
  { name: "Pasta", slug: "pasta" },
  { name: "Meat", slug: "meat" },
  { name: "Poultry", slug: "poultry" },
  { name: "Seafood", slug: "seafood" },
  { name: "Vegetarian", slug: "vegetarian" },
  { name: "Vegan", slug: "vegan" },
  { name: "Desserts", slug: "desserts" },
  { name: "Baking", slug: "baking" },
  { name: "Drinks", slug: "drinks" },
  { name: "Snacks", slug: "snacks" },
];

async function seed() {
  console.log("Seeding tags...");
  for (const t of tags) {
    await db.insert(tag).values(t).onConflictDoNothing();
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
