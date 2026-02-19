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

## Coding Style & Naming Conventions

- Use TypeScript with ES modules (`"type": "module"`).
- Prefer 2-space indentation and keep files formatted by `oxfmt`.
- Run `bun run lint` before opening a PR; it applies safe fixes.
- Components and route-level UI use PascalCase filenames (for example `PokemonList.tsx`).
- Utility and data modules use lowercase or camel-style names (for example `pokemon.ts`).
- Use native Bun and Web API's when implementing features.

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
