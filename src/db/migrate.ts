import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join, resolve } from "node:path";
import { sql } from "bun";

const MIGRATIONS_DIR = resolve(process.cwd(), "migrations");
const MIGRATION_FILENAME_RE = /^\d{4}_[a-z0-9_]+\.sql$/;

type AppliedMigration = {
  filename: string;
  checksum: string;
};

function getChecksum(contents: string) {
  return createHash("sha256").update(contents).digest("hex");
}

async function ensureMigrationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function getMigrationFiles() {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(MIGRATIONS_DIR, { encoding: "utf8", withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    }
    throw error;
  }

  const sqlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".sql"));

  const invalidFiles = sqlFiles.filter((entry) => !MIGRATION_FILENAME_RE.test(entry.name));
  if (invalidFiles.length > 0) {
    const names = invalidFiles.map((entry) => entry.name).join(", ");
    throw new Error(
      `Invalid migration filename(s): ${names}. Expected pattern NNNN_description.sql`,
    );
  }

  return sqlFiles.map((entry) => entry.name).sort();
}

async function getAppliedMigrations() {
  const rows = await sql<AppliedMigration[]>`
    SELECT filename, checksum
    FROM schema_migrations
  `;
  return new Map(rows.map((row) => [row.filename, row.checksum]));
}

export async function runMigrations() {
  await ensureMigrationTable();

  const migrationFiles = await getMigrationFiles();
  const appliedMigrations = await getAppliedMigrations();

  if (migrationFiles.length === 0) {
    console.log("No migration files found.");
    return;
  }

  for (const filename of migrationFiles) {
    const fullPath = join(MIGRATIONS_DIR, filename);
    const contents = await readFile(fullPath, "utf8");
    const checksum = getChecksum(contents);
    const appliedChecksum = appliedMigrations.get(filename);

    if (appliedChecksum) {
      if (appliedChecksum !== checksum) {
        throw new Error(
          `Applied migration changed: ${filename}. Create a new migration instead of editing applied files.`,
        );
      }
      console.log(`Skipping already applied migration: ${filename}`);
      continue;
    }

    console.log(`Applying migration: ${filename}`);
    await sql.transaction(async (tx) => {
      await tx.file(fullPath);
      await tx`
        INSERT INTO schema_migrations (filename, checksum)
        VALUES (${filename}, ${checksum})
      `;
    });
    console.log(`Applied migration: ${filename}`);
  }
}

if (import.meta.main) {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Migration run failed.", error);
    process.exit(1);
  }
}
