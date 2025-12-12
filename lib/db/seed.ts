import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./index";
import { category } from "./schema";

const categories = [
  { name: "Breakfast", slug: "breakfast", description: "Morning meals and brunch recipes" },
  { name: "Lunch", slug: "lunch", description: "Midday meals and light dishes" },
  { name: "Dinner", slug: "dinner", description: "Evening meals and main courses" },
  { name: "Appetizers", slug: "appetizers", description: "Starters and small bites" },
  { name: "Soups & Stews", slug: "soups-stews", description: "Warm and comforting bowls" },
  { name: "Salads", slug: "salads", description: "Fresh and healthy salads" },
  { name: "Pasta", slug: "pasta", description: "Pasta and noodle dishes" },
  { name: "Meat", slug: "meat", description: "Beef, pork, and lamb dishes" },
  { name: "Poultry", slug: "poultry", description: "Chicken and turkey recipes" },
  { name: "Seafood", slug: "seafood", description: "Fish and shellfish dishes" },
  { name: "Vegetarian", slug: "vegetarian", description: "Meat-free recipes" },
  { name: "Vegan", slug: "vegan", description: "Plant-based recipes" },
  { name: "Desserts", slug: "desserts", description: "Sweet treats and baked goods" },
  { name: "Baking", slug: "baking", description: "Breads, pastries, and baked goods" },
  { name: "Drinks", slug: "drinks", description: "Beverages and cocktails" },
  { name: "Snacks", slug: "snacks", description: "Quick bites and finger foods" },
];

async function seed() {
  console.log("Seeding categories...");

  for (const cat of categories) {
    await db
      .insert(category)
      .values(cat)
      .onConflictDoNothing();
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
