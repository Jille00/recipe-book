import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Please set it in your .env file."
    );
  }

  // Configure for Supabase pooler:
  // - prepare: false - required for Transaction/Session pool mode
  // - max: 1 - limit connections for serverless (Supabase Session mode has strict limits)
  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
  });
  dbInstance = drizzle(client, { schema });

  return dbInstance;
}

// Export a proxy that lazily initializes the db connection
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    const instance = getDb();
    const value = instance[prop as keyof typeof instance];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export * from "./schema";
