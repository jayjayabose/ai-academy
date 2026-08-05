# Architecture & conventions

Design rationale lives in `notes/day_01_infrastructure.md` (11 numbered Decisions + 11 numbered
Traps); the verification record is `notes/day_01_task0_verification.md`. Both are the source of
truth — read them before changing infrastructure.

## Layout
```
package.json            workspaces: ["apps/*", "packages/*"]   (single root npm install)
docker-compose.yml      postgres:16-alpine, healthcheck, host port 5433:5432
docker/initdb/01-create-test-db.sh   creates crm_test alongside crm_dev
.env.local(.template)   ONE root env file; .env.local gitignored, template committed
scripts/preflight.sh    node/docker/port/.env.local checks;  scripts/psql.sh -> db:psql
apps/api/src/
  config/workspace-env.ts   workspaceRoot() walks up to the dir holding .env.local.template
  config/env.validation.ts  Joi schema, fails at boot (DB_* required, OPENROUTER_API_KEY optional)
  database/database.module.ts  SequelizeModule.forRootAsync, synchronize:false, define.underscored
  database/migrate.ts          Umzug v3 CLI: up | down | status, target via MIGRATE_TARGET
  database/migrations/000-smoke.ts + smoke.model.ts   THROWAWAY
  health/                      GET /api/health (liveness), GET /api/health/db (real write+read)
  app.controller|service|.spec.ts, test/app.e2e-spec.ts   dead Nest scaffold, slated for deletion
```
Planned but not yet created: `apps/api/src/{leads,interactions}/`, `apps/web/` (Angular + dev proxy),
`packages/shared/` (**types-only**).

## Key conventions
- **Feature modules**, not layered folders (`src/leads/`, not `src/services/`) — chosen so parallel
  agents / Day 3 worktrees touch non-overlapping trees. Chapter 02's layered example paths are a
  deliberate deviation.
- **camelCase in TS/API, snake_case in Postgres**, via global `define: { underscored: true }`.
- **Migrations own the schema** (`synchronize: false`), including the *test* DB — `db:migrate:test`
  runs migrations against `crm_test` rather than syncing, so a bad migration fails CI.
- `setGlobalPrefix('api')` — everything is under `/api`; the Angular dev proxy will be one rule with
  `"ws": true` (pre-set for Day 3 WebSockets).
- Wire contract: plain resources, no envelope; `ValidationPipe({ whitelist, transform,
  forbidNonWhitelisted })` planned. `@Post()`→201, `@Patch(':id')` (not PUT), `@Delete(':id')`→204.
- Jest currently inline in `apps/api/package.json` (`rootDir: src`, `*.spec.ts`). Decision 9's
  `jest.config.ts` with `unit` + `integration` projects is not built yet.

## Scripts (root)
`setup` = preflight → `db:up` → `db:migrate` · `dev` = api watch only (web not wired) ·
`db:up|down|reset|psql|migrate|migrate:status|migrate:undo` · `test` = api unit tests.
Compose always needs `--env-file .env.local` (it only auto-loads `.env`).

## Traps worth internalising (full list in the notes)
- Always `npm i <pkg> -w apps/api`; a bare root install creates phantom deps.
- Raw `sequelize.query()` returns literal snake_case column names — **alias every column**. This
  already bit the health endpoint (`SHOW server_version` → `version` was `undefined`, silently
  dropped by JSON.stringify).
- Umzug's storage table name is derived from Sequelize `define`; pinned to `sequelize_meta`.
  Do not add `define` to the migrate.ts Sequelize instance.
- `packages/shared` must stay types-only — one `enum` or `as const` emits JS and adds build ordering.
- `forbidNonWhitelisted: true` will 400 an edit form that spreads a fetched entity (id/timestamps).
- Host Postgres 14 (Homebrew) owns 5432; Compose uses 5433. Don't stop the Homebrew instance.
