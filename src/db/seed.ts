import { sql } from "bun";
import { resetDatabase } from "./reset";
import {
  affiliations,
  characterAffiliations,
  characterAliases,
  characterOccupations,
  characters,
  contracts,
  genders,
  locationTypes,
  locations,
  maps,
  occupations,
  relatives,
  relativeTypes,
  species,
  speciesAliases,
  statuses,
  type SeedModel,
  type SeedTableData,
} from "./seedData";

type SeedScalar = string | number | null;
type ResolvedSeedRow = Record<string, SeedScalar>;
type DbRow = Record<string, unknown>;

const camelToSnake = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const resolveModel = (model: SeedModel) => {
  const resolved: ResolvedSeedRow = {};

  for (const [key, value] of Object.entries(model)) {
    if (key === "id") {
      continue;
    }

    if (typeof value !== "function") {
      throw new Error(`Expected "${key}" to be a resolver function.`);
    }

    resolved[camelToSnake(key)] = value();
  }

  return resolved;
};

const findInsertedId = (insertedRows: DbRow[], resolvedRow: ResolvedSeedRow) => {
  const matched = insertedRows.find((row) =>
    Object.entries(resolvedRow).every(([key, value]) => row[key] === value),
  );
  const id = matched?.id;
  if (typeof id !== "number") {
    return null;
  }
  return id;
};

const seedTable = async (table: SeedTableData) => {
  if (table.data.length === 0) {
    return;
  }

  const resolvedRows = table.data.map(resolveModel);
  const insertedRows = await sql<DbRow[]>`
    INSERT INTO ${sql(table.table)} ${sql(resolvedRows)}
    RETURNING *
  `;

  table.data.forEach((model, index) => {
    const id = findInsertedId(insertedRows, resolvedRows[index]!);
    if (id === null) {
      throw new Error(
        `Unable to resolve inserted id for table "${table.table}" at row ${index + 1}.`,
      );
    }
    model.id = id;
  });

  console.log(`Seeded ${table.table}: ${table.data.length} rows`);
};

const tablesToSeed: SeedTableData[] = [
  statuses,
  locationTypes,
  genders,
  species,
  relativeTypes,
  affiliations,
  occupations,
  locations,
  speciesAliases,
  maps,
  characters,
  characterAliases,
  contracts,
  relatives,
  characterAffiliations,
  characterOccupations,
];

export async function runSeed() {
  await resetDatabase();

  for (const table of tablesToSeed) {
    await seedTable(table);
  }

  console.log("Database seeded successfully.");
}

if (import.meta.main) {
  try {
    await runSeed();
  } catch (error) {
    console.error("Database seed failed.", error);
    process.exit(1);
  }
}
