import { sql } from "bun";
import { runMigrations } from "./migrate";

export async function resetDatabase() {
  console.log("Dropping and recreating public schema...");
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO CURRENT_USER`;
  await sql`GRANT USAGE ON SCHEMA public TO PUBLIC`;

  console.log("Running migrations...");
  await runMigrations();
  console.log("Database reset complete.");
}

if (import.meta.main) {
  try {
    await resetDatabase();
  } catch (error) {
    console.error("Database reset failed.", error);
    process.exit(1);
  }
}
