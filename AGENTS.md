# Repository Guidelines

## Project Structure & Module Organization

This is a Bun + React + TypeScript app. Most code lives in `src/`.

- `src/index.tsx`: app entry point and server/runtime bootstrap.
- `src/frontend.tsx`: frontend render setup.
- `src/components/`: UI components and shared hooks (`hooks.ts`).
- `src/router/`: route definitions and router components.
- `src/dataFetchers/`: API/data access helpers (for example `pokemon.ts`).
- `src/cache/`: cache-related logic.
- `src/assets/`: static assets (SVGs).
- `src/index.html`: Bun HTML entry used for client bundling.
- `src/index.css`: global app styles.

## Build, Test, and Development Commands

- `bun install`: install dependencies.
- `bun run update:codex`: update the global Codex CLI to latest.
- `bun run dev`: run local dev server with hot reload.
- `bun run dev:debug`: run with debugger attached (`--inspect-brk`).
- `bun run build`: build a production bundle into `dist/`.
- `bun run start:dist`: run the bundled server from `dist/index.js`.
- `bun run lint`: run `oxlint --fix` for lint checks and auto-fixes.
- `bun run fmt`: format code with `oxfmt`.
- `bun run clean`: remove `dist/`.
- `bun run tsgo`: type-check the project.

Before running `bun run build`, always run `bun run clean` first.
Always make sure you have the latest versions of files.

## Coding Style & Naming Conventions

- Use TypeScript with ES modules (`"type": "module"`).
- Prefer 2-space indentation and keep files formatted by `oxfmt`.
- Run `bun run lint` before opening a PR; it applies safe fixes.
- Components and route-level UI use PascalCase filenames (for example `PokemonList.tsx`).
- Utility and data modules use lowercase or camel-style names (for example `pokemon.ts`).
- Use native Bun and Web API's when implementing features.

## Database

- The project connects to local Postgres via `DATABASE_URL` in `.env`, and Bun auto-loads it for `bun run ...`.
- Raw SQL migrations are the source of truth (not Drizzle migrations). Use:
  - `bun run db:migrate` to apply pending `.sql` files in `migrations/`.
  - `bun run db:reset` to drop/recreate `public` and replay all migrations.
- Migration file naming convention is `NNNN_description.sql` (example: `0002_add_character_indexes.sql`).
- Migration runner uses Bun SQL `sql.file(...)` so one `.sql` file can contain multiple statements.
- Applied migrations are tracked in `schema_migrations` with a checksum; never edit an already-applied file, add a new one instead.
- If schema files are missing and you need table structure quickly, query Postgres metadata with `psql`:
  - Parse connection parts from `DATABASE_URL` and pass them to `psql` via `PGHOST`/`PGPORT`/`PGUSER`/`PGDATABASE`/`PGPASSWORD`.
  - Working command pattern:
    ```bash
    json=$(bun --env-file=.env -e 'const u=new URL(process.env.DATABASE_URL||""); console.log(JSON.stringify({host:u.hostname,port:u.port||"5432",db:u.pathname.replace(/^\\//,""),user:decodeURIComponent(u.username),pass:decodeURIComponent(u.password)}));')
    PGHOST=$(jq -r '.host' <<<"$json")
    PGPORT=$(jq -r '.port' <<<"$json")
    PGDATABASE=$(jq -r '.db' <<<"$json")
    PGUSER=$(jq -r '.user' <<<"$json")
    PGPASSWORD=$(jq -r '.pass' <<<"$json")
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='location_types' ORDER BY ordinal_position;"
    ```
  - Example query used: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='location_types' ORDER BY ordinal_position;`
  - In this Codex environment, `psql` access may require escalated permissions.

## Testing Guidelines

There is currently no dedicated automated test suite in this repository. Until one is added:

- Validate changes by running `bun run lint`, `bun run fmt`, `bun run tsgo`, and `bun run dev`.
- Smoke test key user flows in the browser, especially routing, cache behavior, and data fetching.
- If you add tests, colocate them near related code (for example `src/components/ComponentName.test.tsx`) and document the command in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects (for example: `Remove unused code`, `Refactor useEffect`).

- Keep commit titles concise, present tense, and action-first.
- Keep each commit focused on one logical change.
- PRs should include: summary of behavior changes, affected paths, manual test steps, and screenshots/GIFs for UI changes.
- Link related issues/tasks when applicable.
