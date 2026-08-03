# Day 1 — Task 0: Infrastructure Setup — verification record

**Date:** 2026-08-03
**Requirement:** `day-1-build-requirements.md:120-129` — NestJS initialized · PostgreSQL connected via
Sequelize · REST API server running · basic project structure
**Design record:** [day_01_infrastructure.md](day_01_infrastructure.md)

Status: **all four requirements met and verified.** Decisions 6, 7 (Angular half), 9 and 11 were
deliberately out of scope — see *Deferred* below.

---

## What was built

```
.nvmrc                                  22
package.json                            workspaces + setup/dev/db:* scripts
docker-compose.yml                      postgres:16-alpine, healthcheck, 5433:5432
docker/initdb/01-create-test-db.sh      creates crm_test alongside crm_dev
.env.local.template                     committed; .env.local gitignored
scripts/preflight.sh                    node / docker / port / .env.local checks
scripts/psql.sh                         db:psql helper
apps/api/src/
  config/workspace-env.ts               walks up to workspace root for .env.local (Trap #4)
  config/env.validation.ts              Joi schema, fails at boot
  database/database.module.ts           forRootAsync, synchronize:false, define.underscored
  database/migrate.ts                   Umzug CLI: up | down | status
  database/migrations/000-smoke.ts      THROWAWAY
  database/smoke.model.ts               THROWAWAY
  health/                               GET /api/health, GET /api/health/db
  main.ts                               setGlobalPrefix('api')
```

## Verification results

| # | Check | Result |
| --- | --- | --- |
| 1 | Single root `npm install`; deps hoisted | ✅ 488 packages at root, 1 nested, **one** lockfile |
| 2 | Compose healthy; `crm_dev` **and** `crm_test` exist | ✅ initdb log: `created database crm_test` |
| 3 | `db:migrate` applies; `:status` reports | ✅ `crm_dev: 1 migrations up, 0 pending` |
| 4 | `db:migrate:undo` reverses | ✅ `0 migrations up, 1 pending` |
| 5 | Test DB schema built by **migrations**, not sync | ✅ `applied 1 migration(s) to crm_test` |
| 6 | Columns snake_case while model attrs camelCase | ✅ `\d _smoke` → `label`, `created_at`, `updated_at` |
| 7 | **Negative:** invalid env fails at boot, clearly | ✅ `Config validation error: "DB_PORT" must be a number`, exit 1 |
| 8 | REST server up behind `/api` prefix | ✅ `/api/health` 200 · `/api/health/db` 200 · `/health` **404** |
| 9 | Real DB write+read round-trip through the API | ✅ `{"connected":true,"serverVersion":"16.14","smoke":{"insertedId":2,"rowCount":2}}` |
| 10 | `db:reset` full cycle (`down -v` → up → initdb → migrate) | ✅ both databases recreated, migration reapplied |

Postgres server version in use: **16.14**. Node: **v22.23.2**. npm: **10.9.8**.

## Two defects found by running it (both now fixed)

1. **Umzug bookkeeping table silently renamed.** `define: { underscored: true }` on the migration
   runner's Sequelize instance turned `SequelizeMeta` into `sequelize_meta`. Latent hazard: removing
   `define` later would make Umzug see an empty history and re-run every migration. Now pinned via
   `SequelizeStorage({ tableName: 'sequelize_meta' })`, and the misleading `define` removed —
   QueryInterface never applied it anyway. → recorded as **Trap #11**.
2. **Trap #6 hit for real.** `SHOW server_version` returns a `server_version` column; the code read
   `version`, got `undefined`, and `JSON.stringify` dropped the field with no error. Fixed with an
   explicit `AS version` alias.

Neither was predicted by the design pass. Both were cheap here and would have been expensive later.

## Deliberately deferred (not required by Task 0)

| Decision | Why deferred |
| --- | --- |
| 6 — `packages/shared` | No consumer until Angular exists |
| 7 — Angular + dev proxy | Feature 2A. `setGlobalPrefix('api')` is already in place for it |
| 9 — Jest unit/integration split | Testing is its own line item (`day-1-build-requirements.md:29`) |
| 11 — `ValidationPipe` / DTOs | No DTOs until the data model is designed |

## Outstanding

- [ ] **Delete Nest scaffold leftovers** — unreferenced since `AppModule` was rewritten, harmless but untidy:
      `apps/api/src/app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`, and `apps/api/test/`
      (its e2e spec asserts a `GET /` route that no longer exists).
- [ ] **Revert and delete the smoke scaffolding** when migration 001 lands:
      `npm run db:migrate:undo`, then remove `database/migrations/000-smoke.ts`, `database/smoke.model.ts`,
      and the `smoke` block from `health.service.ts`.
- [ ] **`.gitignore` root-anchored globs** (`/dist/`, `/coverage`, …) still won't ignore `apps/api/dist`.
- [ ] Nothing is committed yet — this is all untracked working tree.

## Next

The data model (Lead + Interaction) and migration 001. It blocks CSV import, and Question 12
(*how the seed script boots* — Nest standalone context vs bare ts-node) is still open.
