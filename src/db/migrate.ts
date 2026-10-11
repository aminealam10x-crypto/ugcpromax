import { config } from "dotenv";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { closeDatabase, getDatabase } from "./client";

config({ path: ".env.local" });
config();

async function main() {
  const database = await getDatabase();
  if ((process.env.DATABASE_DRIVER ?? "neon") === "neon") {
    // Local PGlite is migrated during initialization. Neon migrations are deliberate.
    await migrate(database as Parameters<typeof migrate>[0], { migrationsFolder: "drizzle" });
  }
  await closeDatabase();
  console.log("Database migrations applied.");
}

main().catch((error: unknown) => {
  // Driver messages can include connection strings. Keep credentials out of CLI logs.
  console.error(JSON.stringify({ event: "database_migration_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
  process.exitCode = 1;
});
