# Day 1 — Task 0: Infrastructure Decisions

**Date:** 2026-08-03
**Scope:** `Infrastructure: NestJS + Sequelize + REST + PostgreSQL` (`course/guidebook/companion/day-1/day-1-build-requirements.md:19`)

Stack is mandated, not chosen: npm, NestJS, Sequelize, `@nestjs/platform-express` REST, PostgreSQL, Angular, Jest
(`day-1-build-requirements.md:73-96`). What follows are the decisions the course leaves open (`:108-114`).

---

## Decisions

| #   | Decision                     | Choice                                                                                      | Why                                                                                                        |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Repo layout                  | npm workspaces: `apps/api`, `apps/web`, `packages/shared`                                     | Root `npm install` satisfies the clone-and-run bar (`:224`); enables compiler-enforced shared types           |
| 2   | Postgres runtime             | Docker Compose (Postgres only); apps run natively                                             | `npm run setup` can be honest and self-contained; native apps keep HMR and debugging fast                     |
| 3   | Schema management            | Umzug v3 migrations; `synchronize: false`                                                     | Migrations are course-mandated, not optional; Umzug shares `.env` config instead of duplicating credentials   |
| 4   | Naming                        | camelCase in TS/API, snake_case columns, global `define: { underscored: true }`               | Both ecosystems idiomatic; global setting means no model can forget it                                        |
| 5   | Configuration                | One root `.env.local`, discrete DB vars, validated on boot                                    | Matches `README.md:141` so upstream rebases stay clean; one source of truth for app + Umzug + Compose         |
| 6   | Shared types                 | `packages/shared`, **types-only**, via tsconfig path mapping                                  | Types erase at compile time → nothing to build, no build ordering. Turns contract drift into a compile error  |
| 7   | Dev API access               | Angular dev proxy, `/api` global prefix, `"ws": true` set now                                 | Same-origin; pays off again for Day 3 WebSockets and Day 4 service-worker caching                             |
| 8   | Test database                | One container, `crm_dev` + `crm_test`; test schema built by **migrations**                    | Makes migrations load-bearing in CI rather than decorative                                                    |
| 9   | Jest layout                  | `apps/api/jest.config.ts` with `unit` + `integration` projects; unit is default               | The fast gate must not require Docker                                                                         |
| 10  | Module structure             | Feature modules (`src/leads/`, `src/interactions/`) + `src/database/`, `src/config/`          | Non-overlapping file trees for parallel agents (Day 1 `:64`, Day 3 worktrees); layered folders collide         |
| 11  | Wire contract                | Plain resources (no envelope); `ValidationPipe({ whitelist, transform, forbidNonWhitelisted })` | Least code, matches agent defaults; shared types make deferred pagination a compile error, not a silent break |
| 12  | Closed value sets            | `VARCHAR` + **named** `CHECK` constraint. Never native Postgres enum.                          | `db:undo` reversibility — Postgres has no `ALTER TYPE ... DROP VALUE`; undoing an enum addition takes 4 statements and fights Umzug's per-migration transaction. CHECK reverses in 2. Name it explicitly so `down` has a stable identifier to drop |

### Deliberate deviations from course material

- **`chapters/02-two-tier-testing.md:633-642`** specifies a test DB on port 5433 with `synchronize: true`.
  Rejected: a synchronize-built test schema never exercises the migrations, so a bad migration passes the whole
  suite and fails only on a fresh clone. Contradicts `chapters/01-orchestration-mindset.md:279`
  ("verify migrations applied to ALL databases"). Deviation is contained inside `setupTestDatabase()`.
- **`chapters/02-two-tier-testing.md:618,622`** uses layered paths (`src/services/`, `src/models/`).
  Rejected in favour of feature modules — see Decision 10. Cosmetic; affects spec file location only.
- **`.claude/orchestration/methodology/database-migration-strategy.md` mandates a two-track pattern**
  (`:15`) — a destructive `src/db/schema.sql` with `DROP TABLE`, plus additive `scripts/migrations/*.sql`
  applied by hand. **Declined; we stay single-track on Umzug.** Its root cause (`:11` — "no distinction
  between initial schema setup vs incremental migrations") is the absence of a migration framework;
  Umzug supplies exactly that, with an applied-migrations ledger in `sequelize_meta`. Adopting both
  would require maintaining `schema.sql` *and* a migration for every change (`:137-138`) — two
  representations of one schema, guaranteed to drift. **We already satisfy the document's stated goal:**
  `:189` wants `db:migrate` safe by default and destruction behind `db:reset`, which is our contract
  exactly. Adopted *from* it: the `XXX-description` migration naming (`:99`) and the header-comment
  template (`:245`).

### Value-set representation (Decision 12 detail)

The runtime/compile-time seam, because D6 forbids runtime values in `packages/shared` while
`class-validator`'s `@IsIn()` and the Angular dropdown both require a runtime array:

```ts
// apps/api/src/leads/lead-status.ts — and a second copy in apps/web
import type { LeadStatus } from '@crm/shared';

export const LEAD_STATUSES = ['active','contacted','qualified','closed','lost'] as const
  satisfies readonly LeadStatus[];                 // no extras

type Assert<T extends never> = T;
type _Exhaustive = Assert<Exclude<LeadStatus, (typeof LEAD_STATUSES)[number]>>;   // no omissions
```

**`satisfies` alone is not enough** — a *subset* passes it silently. The `Exclude` assertion catches
omissions in the other direction. Both halves are required. Two copies (api + web) because `apps/web`
cannot import from `apps/api`; this is the concrete price of D6 staying types-only.

Nothing links either array to the hand-written migration SQL — that seam is irreducible, and is closed
by an integration test instead (see follow-ups).

| Field | Values | Constrained? | Source |
| --- | --- | --- | --- |
| `Lead.status` | `active` `contacted` `qualified` `closed` `lost` | CHECK | `:147` "active, contacted, closed, etc." |
| `Interaction.type` | `call` `email` `meeting` `note` | CHECK | `day-4-mobile-app.md:212` — "**Select** interaction type (call, email, meeting, note)" |
| `Lead.source` | referral, website, zillow, open-house, social-media, cold-call, walk-in | **No** — plain `VARCHAR` | Day 2 field, no Day 1 consumer, likeliest to churn |

---

## Target layout

```
ai-academy/
├── package.json              # workspaces: ["apps/*", "packages/*"]
├── docker-compose.yml        # postgres:16, init script creates crm_dev + crm_test
├── .env.local.template       # committed;  .env.local is gitignored
├── data/seed-leads.csv
├── apps/
│   ├── api/                  # NestJS
│   │   ├── src/{config,database,leads,interactions}/
│   │   ├── migrations/       # Umzug, TypeScript
│   │   └── jest.config.ts    # projects: unit | integration
│   └── web/                  # Angular  (+ proxy.conf.json)
├── packages/shared/          # types only — no enums, no consts, no classes
└── course/                   # untouched (rebased from upstream)
```

## Script contract

Target from `day-1-build-requirements.md:224` — `git clone → npm install → npm run setup → npm run dev`.

| Script                  | Does                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `setup`                 | preflight `docker info` → `compose --env-file .env.local up -d` → `db:migrate` → `db:seed` |
| `dev`                   | api + web concurrently                                            |
| `db:migrate` / `:status` / `:undo` / `:test` | Umzug, target DB parameterised via `MIGRATE_TARGET` |
| `db:up` / `db:down`     | Compose lifecycle with `--env-file .env.local --wait`              |
| `db:reset`              | `down -v` → `up` → `migrate`. Required by `testing-standards.md:47` (setup/seed/reset) |
| `db:psql`               | psql into the container without remembering the non-default port   |
| `db:seed`               | CSV import, 50–100 leads with 2–5 interactions each *(Feature 1)*  |
| `test`                  | unit only — **no Docker required**                                 |
| `test:integration`      | migrates `crm_test`, then integration project                      |

**Environment pins (discovered at preflight, 2026-08-03):**

- **Node 22** (`.nvmrc`, `engines: >=22.22.3`). Node 18 was installed and is a hard blocker:
  `@nestjs/core@11` requires `>= 20`, `@angular/core` requires `^22.22.3 || ^24.15.0 || >=26.0.0`.
  Node 22 is the only line satisfying both. Node 18 also went EOL April 2025.
- **Host port 5433, not 5432.** A Homebrew `postgresql@14` owns 5432 on this machine with unrelated
  work databases. Compose maps `5433:5432`; `DB_PORT=5433`. Do not stop the Homebrew instance.

---

## Known traps (surfaced during design; handle explicitly, don't rediscover)

1. **Phantom dependencies.** npm hoists to root. Always `npm i <pkg> -w apps/api`, never a bare root install —
   otherwise it resolves locally and breaks in Docker.
2. **TypeScript version tug-of-war.** Angular hard-errors outside its supported TS range; Nest is permissive.
   Pin `typescript` in both workspace manifests and treat the pin as load-bearing. Same for `rxjs`, `zone.js`.
   **CONFIRMED at track-enablement:** Angular 22 requires `typescript ~6.0.2`; `apps/api` is on `^5.7.3`.
   npm hoisted **5.9.3** to the root (satisfying the API) and **nested 6.0.3** under `apps/web`. Both apps
   build. This only works because each manifest declares its own pin — a single root-level `typescript`
   would have broken one of them. Do not "tidy up" the duplication.
3. **Compose ignores `.env.local`.** It auto-loads `.env` only. `npm run setup` must pass `--env-file .env.local`
   or Postgres silently starts with empty credentials.
4. **`envFilePath` and cwd.** `npm run -w apps/api` sets cwd to `apps/api`; resolve the env path from the
   workspace root, not relatively.
5. **`underscored: true` renames more than you think** — FKs (`leadId` → `lead_id`) and timestamps
   (`createdAt` → `created_at`). Migration 001 must use snake_case or the models won't find their columns.
6. **Raw `sequelize.query()` returns snake_case keys.** Model finders alias correctly (even with `raw: true`),
   literal queries do not. Relevant when Day 2 adds a score-sorted dashboard query.
7. **`packages/shared` must stay types-only.** One TS `enum` or `as const` emits runtime JS and you inherit build
   ordering. Status values are union types: `'active' | 'contacted' | 'closed'`.
8. **Jest `projects` config.** `moduleNameMapper` and `transform` go *per project*, not top-level, or the
   `@test/helpers` alias (`chapters/02-two-tier-testing.md:623`) silently fails to resolve.
9. **`forbidNonWhitelisted: true` will 400 the edit form.** Angular must build PATCH payloads from the shared
   `UpdateLeadRequest` type, not by spreading the fetched entity (which carries `id`, `createdAt`, `updatedAt`).
10. **Proxy `"ws": true`.** Set now. Without it Day 3's WebSocket upgrade fails through the proxy with an
    unhelpful error.
11. **Umzug's bookkeeping table name is derived, not fixed.** *(Found in practice, Task 0.)* Passing
    `define: { underscored: true }` to the Sequelize instance in `migrate.ts` silently renamed
    `SequelizeMeta` → `sequelize_meta`. Removing `define` later would make Umzug find no history and
    **re-run every migration**. Now pinned: `new SequelizeStorage({ sequelize, tableName: 'sequelize_meta' })`.
    Note `define` was doing nothing useful there anyway — QueryInterface never applies it (see Trap #5).

> **Trap #6 confirmed in practice.** The first `/api/health/db` implementation read `version` from
> `SHOW server_version`, whose actual column is `server_version`. The field came back `undefined` and
> `JSON.stringify` dropped it from the response — no error anywhere. Fixed with an explicit
> `SELECT current_setting('server_version') AS version`. This is the exact failure mode the trap predicts,
> and it cost a round trip to notice. Alias every raw-query column.

---

## Repo gaps to fix

- [x] **`.env.local.template`** — authored in Task 0. (`.gitignore:29-32` already handles it:
      `.env.*` ignored, `!.env*.template` un-ignored. Was miscited as `:36-39`.)
- [x] **`seed-leads.csv`** — generated and committed at the **repo root**, not `data/`. `.gitignore:53` ignores
      `/data/*.csv`, so a seed file under `data/` would not be committed and a fresh clone would seed nothing.
      Root also matches `day-1-build-requirements.md:142` ("in the project root"). **This supersedes the
      `data/seed-leads.csv` entry in the Target layout above.** Regenerate with
      `node scripts/generate-seed-leads.mjs [count] [outfile]` — deterministic, so re-running never churns the diff.
- [x] **`.gitignore` root-anchored globs** — fixed. `/dist/`, `/build/`, `/out/`, `/coverage`, `/.jest-cache`,
      `/test-results` are now `**/`-prefixed, matching `.dockerignore`. Verified: `apps/api/dist/main.js`,
      `apps/web/dist` and `packages/shared/dist` all match `.gitignore:13`.
- [ ] **`.claude/orchestration/playbook/nestjs-patterns.md` is a stub** — every code block is a `[Content: ...]`
      placeholder. Fill it with the conventions above so agents read our structure instead of inferring one
      from chapter 02's layered example paths. Specifically it must carry: the feature-module layout (D10),
      the single-track Umzug convention (so agents don't generate `schema.sql` from the MANDATORY doc),
      and the `satisfies` + `Exclude` exhaustiveness bridge under "DTO & Validation Patterns".
- [ ] **Add the SQLSTATE `23514` integration test to the Day 1 test plan.** Runs against `crm_test`
      (schema built by migrations, per D8): iterate `LEAD_STATUSES` — every value must insert; then one
      bogus value must fail with `check_violation`. This is the only thing linking the TypeScript union
      to the migration's SQL, and it fails loudly on a fresh clone if someone adds a union member without
      a migration — the same failure mode that motivated rejecting `synchronize: true`.

## Deferred — with triggers

- **OpenAPI/Swagger type generation** — revisit Day 2+ once the contract stabilises. Composes fine with Decision 6.
- **Response envelope / pagination** — revisit if the Day 2 score-sorted dashboard needs it. Shared types make
  this a compile error, not a silent break.
- **Frontend testing** — not required Day 1 (`:92-96` scopes Jest to backend services and utilities).
  Note when it lands: **Angular 22 ships Vitest, not Karma/Jasmine** (`@angular/build:unit-test`,
  `vitest ^4`, `jsdom`). So the stack is Jest on the backend and Vitest on the frontend — deliberately
  not unified, since forcing Jest onto Angular 22 means fighting its default builder.
- **Lookup table + FK for `status`** — instead of a CHECK constraint. Trigger: when statuses become
  user-configurable, or need metadata (display label, sort order, badge colour). **Not yet fired** —
  Day 2's colour-coded badges key on `activityScore`, not `status` (`day-1-build-requirements.md:47`).

## Conventions already settled by the playbook (adopted, not debated)

`nestjs-patterns.md:50,60,66` — `@Post()` → 201, `@Patch(':id')` (not PUT), `@Delete(':id')` → 204;
`CreateXDto` with class-validator and `UpdateXDto = PartialType(CreateXDto)`; nested routes as
`@Controller('leads/:leadId/interactions')`.
