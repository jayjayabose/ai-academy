# Current state & next steps (as of commit 9da44d6, branch day_01)

## Done and verified
Task 0 infrastructure: single root install · Compose healthy with `crm_dev` + `crm_test` ·
migrate up/down/status · test DB built by migrations · snake_case columns over camelCase attrs ·
invalid env fails at boot · `/api/health` 200, `/health` 404 · real DB round-trip through
`/api/health/db` · `db:reset` full cycle. Postgres 16.14, Node v22.23.2, npm 10.9.8.

## Outstanding cleanup (tracked in notes/day_01_task0_verification.md)
- [ ] Delete dead Nest scaffold: `apps/api/src/app.controller.ts`, `app.service.ts`,
      `app.controller.spec.ts`, `apps/api/test/` (its e2e spec asserts a `GET /` that no longer exists).
- [ ] When migration 001 lands: `db:migrate:undo`, then delete `migrations/000-smoke.ts`,
      `database/smoke.model.ts`, the `models: [Smoke]` entry, and the `smoke` block in health.service.
- [ ] `.gitignore` globs are root-anchored (`/dist/`, `/coverage`) so `apps/api/dist` is NOT ignored —
      switch to `**/` globs to match `.dockerignore`. (`apps/api/dist/` currently exists on disk.)
- [ ] `seed-leads.csv` referenced by the requirements doc does not exist; `.gitignore` ignores
      `/data/*.csv`, so decide committed vs generated.
- [ ] `.claude/orchestration/playbook/nestjs-patterns.md` is a placeholder stub.

## Next work item
**Lead + Interaction models and migration 001** — blocks CSV import (Feature 1), which blocks the
dashboard. Open question carried forward: how the seed script boots (Nest standalone application
context vs bare ts-node).

## Deferred with triggers
`packages/shared` (no consumer until Angular exists) · Angular + dev proxy (Feature 2A) ·
Jest unit/integration split · `ValidationPipe`/DTOs (no DTOs until the data model exists) ·
OpenAPI type generation (Day 2+) · response envelope/pagination (revisit if Day 2's score-sorted
dashboard needs it).
