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

### Deliberate deviations from course material

- **`chapters/02-two-tier-testing.md:633-642`** specifies a test DB on port 5433 with `synchronize: true`.
  Rejected: a synchronize-built test schema never exercises the migrations, so a bad migration passes the whole
  suite and fails only on a fresh clone. Contradicts `chapters/01-orchestration-mindset.md:279`
  ("verify migrations applied to ALL databases"). Deviation is contained inside `setupTestDatabase()`.
- **`chapters/02-two-tier-testing.md:618,622`** uses layered paths (`src/services/`, `src/models/`).
  Rejected in favour of feature modules — see Decision 10. Cosmetic; affects spec file location only.

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
| `db:migrate` / `:status` / `:undo` | Umzug, target DB parameterised                         |
| `db:seed`               | CSV import, 50–100 leads with 2–5 interactions each                |
| `test`                  | unit only — **no Docker required**                                 |
| `test:integration`      | migrates `crm_test`, then integration project                      |

---

## Known traps (surfaced during design; handle explicitly, don't rediscover)

1. **Phantom dependencies.** npm hoists to root. Always `npm i <pkg> -w apps/api`, never a bare root install —
   otherwise it resolves locally and breaks in Docker.
2. **TypeScript version tug-of-war.** Angular hard-errors outside its supported TS range; Nest is permissive.
   Pin `typescript` in both workspace manifests and treat the pin as load-bearing. Same for `rxjs`, `zone.js`.
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

---

## Repo gaps to fix

- [ ] **`.env.local.template` does not exist** — `README.md:141` tells you to copy it. Author it.
      (`.gitignore:36-39` already handles it: `.env.*` ignored, `!.env*.template` un-ignored.)
- [ ] **`seed-leads.csv` does not exist** — `day-1-build-requirements.md:142` links it "in the project root".
      Note `.gitignore` ignores `/data/*.csv`, so decide whether the seed file is committed or generated.
- [ ] **`.gitignore:7-16` is root-anchored** (`/dist/`, `/build/`, `/out/`, `/coverage`, `/test-results`) and will
      not ignore `apps/api/dist`. Change to `**/` globs to match `.dockerignore`, which already uses them.
- [ ] **`.claude/orchestration/playbook/nestjs-patterns.md` is a stub** — every code block is a `[Content: ...]`
      placeholder. Fill it with the conventions above so agents read our structure instead of inferring one
      from chapter 02's layered example paths.

## Deferred — with triggers

- **OpenAPI/Swagger type generation** — revisit Day 2+ once the contract stabilises. Composes fine with Decision 6.
- **Response envelope / pagination** — revisit if the Day 2 score-sorted dashboard needs it. Shared types make
  this a compile error, not a silent break.
- **Frontend Jest** — not required Day 1 (`:92-96` scopes Jest to backend services and utilities).

## Conventions already settled by the playbook (adopted, not debated)

`nestjs-patterns.md:50,60,66` — `@Post()` → 201, `@Patch(':id')` (not PUT), `@Delete(':id')` → 204;
`CreateXDto` with class-validator and `UpdateXDto = PartialType(CreateXDto)`; nested routes as
`@Controller('leads/:leadId/interactions')`.
