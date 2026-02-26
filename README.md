# bun-react-template

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run the production bundle:

```bash
bun run start:dist
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Database migrations

- Migrations live in `migrations/`.
- Migration filenames must follow `NNNN_description.sql` (example: `0002_add_maps_seed.sql`).
- Apply pending migrations:

```bash
bun run db:migrate
```

- Reset the database and replay all migrations:

```bash
bun run db:reset
```

- Reset, migrate, and seed:

```bash
bun run db:seed
```

The migration runner tracks applied files in `schema_migrations` with a checksum. If an applied file is edited, `db:migrate` fails; create a new migration file instead.
