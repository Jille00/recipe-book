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

  // Configure for the Supabase pooler:
  // - prepare: false - required for Transaction/Session pool mode
  // - max: in session mode (port 5432) every client connection holds a real
  //   database connection for its lifetime, and each serverless instance opens
  //   its own, so one per instance. The transaction pooler (port 6543) only
  //   lends a connection for the length of a transaction, so a few per
  //   instance are safe and let Promise.all queries actually run in parallel.
  const client = postgres(connectionString, {
    prepare: false,
    max: poolSize(connectionString),
  });
  dbInstance = drizzle(client, { schema });

  return dbInstance;
}

export function poolSize(connectionString: string): number {
  const override = Number(process.env.DATABASE_POOL_MAX);
  if (Number.isInteger(override) && override > 0) return override;
  try {
    return new URL(connectionString).port === "6543" ? 5 : 1;
  } catch {
    return 1;
  }
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
