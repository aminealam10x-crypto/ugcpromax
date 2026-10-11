import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type AppDatabase = NeonHttpDatabase<typeof schema> | PgliteDatabase<typeof schema>;

type DatabaseState = { database?: Promise<AppDatabase>; close?: () => Promise<void> };
const globalDatabase = globalThis as typeof globalThis & { ugcpromaxDatabase?: DatabaseState };
const state = (globalDatabase.ugcpromaxDatabase ??= {});

async function connectDatabase(): Promise<AppDatabase> {
  const driver = process.env.DATABASE_DRIVER ?? "neon";
  if (driver === "pglite") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PGlite is a development-only database. Configure Neon for production.");
    }
    const [{ PGlite }, { drizzle }, { migrate }, { resolve }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
      import("node:path"),
    ]);
    const client = new PGlite(resolve(process.env.LOCAL_DATABASE_PATH ?? ".local/database"));
    const database = drizzle(client, { schema });
    try {
      await migrate(database, { migrationsFolder: resolve("drizzle") });
    } catch (error) {
      await client.close();
      throw error;
    }
    state.close = () => client.close();
    return database;
  }
  if (driver !== "neon") {
    throw new Error("DATABASE_DRIVER must be neon or pglite.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Set DATABASE_DRIVER=pglite for explicit local development.");
  }
  const [{ neon }, { drizzle }] = await Promise.all([
    import("@neondatabase/serverless"),
    import("drizzle-orm/neon-http"),
  ]);
  return drizzle(neon(connectionString), { schema });
}

/** Lazy initialization keeps builds independent of credentials and shares local files across hot reloads. */
export function getDatabase(): Promise<AppDatabase> {
  if (!state.database) {
    state.database = connectDatabase().catch((error: unknown) => {
      state.database = undefined;
      throw error;
    });
  }
  return state.database;
}

/** Migration scripts can flush and release local data before exiting. */
export async function closeDatabase(): Promise<void> {
  await state.database;
  await state.close?.();
  state.database = undefined;
  state.close = undefined;
}
