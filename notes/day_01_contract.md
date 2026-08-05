# Day 1 — Contract & Data Model

**Date:** 2026-08-05
**Design record:** [day_01_infrastructure.md](day_01_infrastructure.md) · **Task 0:** [day_01_task0_verification.md](day_01_task0_verification.md)
**Source of truth for types:** `packages/shared/src/index.d.ts`

Settled contract-first so the backend and frontend tracks can run in parallel. The course models
backend→frontend sequencing (`01-orchestration-mindset.md:257`), but its only stated reason is that
*"frontend imports the shared backend API types"* (`:255`) — types owned by the backend. **Decision 6
moved them to a peer workspace**, so that dependency doesn't exist here and the tracks are independent
once this document is agreed.

---

## 1. Screens

| Screen | Shows | Source |
| --- | --- | --- |
| Lead list | firstName+lastName · status · budget · location · propertyType · inquiryDate | `day-1-build-requirements.md:22` |
| Lead detail | everything, + interaction history | `:28` |
| Create form | `CreateLeadRequest` fields, validated | `:24` |
| Edit form | `UpdateLeadRequest` | `:25` |
| Log interaction | type · occurredAt · notes | `:27` |
| Delete confirm | — | `:26` |

Day 2 mutates two of these — score badge + score sorting on the list, summary + regenerate on the
detail (`:33-49`). Both are `Lead` fields, so they appear in list *and* detail with **no contract change**.

**List returns full `Lead` objects, not a projection.** 100 rows × ~250 B ≈ 25 KB; a projection saves
nothing measurable and costs a second type to keep in sync. Client-side search and sort become free.
*Revisit trigger:* Day 2's `summary` adds ~30 KB — that's when a projection starts to pay.

**Sorting is client-side, default `inquiryDate` desc.** `activityScore` doesn't exist until Day 2 (`:48`).

## 2. Data model

`gen_random_uuid()` is built into Postgres 16 — no extension needed.

### `leads`

| Column | Attribute | Type | Null |
| --- | --- | --- | --- |
| `id` | `id` | `UUID` PK `DEFAULT gen_random_uuid()` | no |
| `first_name` / `last_name` | `firstName` / `lastName` | `VARCHAR(100)` | no |
| `email` | `email` | `VARCHAR(255)`, indexed, **not unique** | no |
| `phone` | `phone` | `VARCHAR(30)` | yes |
| `status` | `status` | `VARCHAR(20)` + `leads_status_check`, **`DEFAULT 'active'`** | no |
| `budget` | `budget` | `INTEGER` (whole dollars) | yes |
| `location` | `location` | `VARCHAR(100)` | **yes** |
| `property_type` | `propertyType` | `VARCHAR(20)` + `leads_property_type_check` | **yes** |
| `bedrooms` | `bedrooms` | `INTEGER` | yes — **NULL for `land`** |
| `source` | `source` | `VARCHAR(30)`, unconstrained | yes |
| `inquiry_date` | `inquiryDate` | `DATE` **`DEFAULT CURRENT_DATE`** | no |
| `notes` | `notes` | `TEXT` | yes |
| `created_at` / `updated_at` | | `TIMESTAMPTZ` | no |

> **`location` and `property_type` are nullable on purpose.** An earlier draft had them `NOT NULL`.
> Reversed: at first contact a salesperson knows a name and a way to reach someone, rarely the target
> neighbourhood or property type. `NOT NULL` on fields routinely unknown at capture time is a modelling
> error — it would force the "Add Lead" form to demand information the user doesn't have. The CHECK
> constraint on `property_type` must therefore allow NULL (a CHECK passes on NULL by default, but state
> it explicitly in the migration so the intent is legible).

### `interactions`

| Column | Attribute | Type | Null |
| --- | --- | --- | --- |
| `id` | `id` | `UUID` PK `DEFAULT gen_random_uuid()` | no |
| `lead_id` | `leadId` | `UUID` FK → `leads(id)` **`ON DELETE CASCADE`** | no |
| `type` | `type` | `VARCHAR(20)` + `interactions_type_check` | no |
| `occurred_at` | `occurredAt` | `TIMESTAMPTZ` | no |
| `notes` | `notes` | `TEXT` | yes |
| `created_at` / `updated_at` | | `TIMESTAMPTZ` | no |

**Indexes:** `interactions(lead_id)` (every detail-page `include` uses it), `leads(email)`. Nothing else —
at 100 rows it would be speculative.

### Type choices and why

- **`budget` is `INTEGER`, not `NUMERIC`/`BIGINT`.** The `pg` driver returns both of those as
  **strings** to avoid precision loss, which would make `budget: number` compile everywhere and be
  wrong at runtime — `validation-gates.md:75` ("PostgreSQL returns strings not Dates") one column over.
  *Revisit trigger:* storing a real monetary amount (sale price, commission) → integer **cents**.
- **`inquiryDate` is `DATE`, `occurredAt` is `TIMESTAMPTZ`.** Rule: `DATE` for domain dates with no
  meaningful time, `TIMESTAMPTZ` for instants. Storing an inquiry date as a timestamp fabricates
  midnight UTC, which renders as **the previous day** in US timezones.
- **`email` is not unique.** Couples share an address; the same person can inquire twice. A unique
  constraint would abort the CSV import on data that isn't actually wrong.
  *Counter-argument on record:* dedupe-on-email is normal CRM behaviour and would give Day 2 a `23505`
  integration test mirroring the planned `23514` one.
- **`bedrooms` is NULL for `land`,** not 0. `0` claims a parcel has zero bedrooms and corrupts any
  future `AVG(bedrooms)`.
- **`occurredAt`, not `date`.** `analytics-dashboard.md:178` calls it `interaction.date`, but that
  bonus module is written against TypeORM (`Repository`, `createQueryBuilder`) and isn't authoritative.

## 3. Wire contract

Lives in `packages/shared/src/index.d.ts`. **Authored as `.d.ts` deliberately** — a declaration file
cannot contain runtime code, so Trap #7 is enforced by the file format rather than by discipline, and
declaration files emit nothing so importing them doesn't reshape `apps/api/dist/`. Both verified below.

Serialization rules (`success-criteria.md:574`): ids are UUID strings · timestamps are ISO 8601
strings · dates are `YYYY-MM-DD` strings · **never `Date`** · camelCase throughout (`:575`).

Types: `LeadStatus` `PropertyType` `InteractionType` · `Lead` `Interaction` `LeadDetail` ·
`CreateLeadRequest` `UpdateLeadRequest` `CreateInteractionRequest` · `ApiError`.

### Required on create

Only **`firstName`, `lastName`, `email`** — identity plus one reliable contact key. Everything else is
optional, and every optional field maps to a nullable column, so the request shape and the schema
cannot disagree.

`email` rather than "email or phone": a cross-field rule is expressible in `class-validator`
(`@ValidateIf`) but **not** in a types-only contract, and every seed row has an email.

### Defaults live in the database, not the DTO

`status → 'active'` · `inquiry_date → CURRENT_DATE` · `occurred_at → now()`

Sequelize omits `undefined` attributes from the INSERT, so the DB default applies. Crucially this also
covers the **CSV importer**, which bypasses DTOs entirely — a DTO default would only protect the HTTP path.

### PATCH semantics

`UpdateLeadRequest = Partial<CreateLeadRequest>`, so `{ budget: null }` clears and `{}` leaves alone.
**That distinction survives only if every optional DTO property carries `@IsOptional()`**, which permits
`null` and `undefined`. Omit it and clearing a field silently becomes impossible.

### Validation rules

Both sides implement these; the frontend enforcing the same rules avoids pointless round trips and
Trap #9 400s.

| Field | Rule |
| --- | --- |
| `firstName`, `lastName` | trim, 1–100 |
| `email` | valid format, ≤255, **normalised to lowercase on write** |
| `phone` | ≤30, **no format regex** — international formats vary; a regex mostly rejects valid numbers |
| `status` | `@IsIn(LEAD_STATUSES)` |
| `budget` | integer, 0 – 100,000,000 (ceiling catches typos well below `INTEGER`'s 2.1B limit) |
| `location` | ≤100, nullable |
| `propertyType` | `@IsIn(PROPERTY_TYPES)`, nullable |
| `bedrooms` | integer, 0–20, nullable |
| `source` | ≤30, nullable |
| `inquiryDate` | `YYYY-MM-DD` |
| `notes` | ≤2000 |
| `occurredAt` | ISO 8601 datetime |

**Deliberately no compile-enforced bridge for these**, unlike the union types. The asymmetry is
principled: union drift is *silent and semantic* (a status the DB rejects, a dropdown missing an
option), whereas max-length drift is *visible and benign* (a 400 that names the problem). Only the
first justifies machinery.

**Deferred:** rejecting a future `inquiryDate`. It would catch a typo'd year, but `@MaxDate` expects a
`Date` and the contract carries strings — disproportionate for Day 1.

## 4. Endpoints

```
GET    /api/leads                        -> Lead[]
GET    /api/leads/:id                    -> LeadDetail      (interactions embedded)
POST   /api/leads                        -> 201 Lead
PATCH  /api/leads/:id                    -> 200 Lead
DELETE /api/leads/:id                    -> 204             (cascades interactions)
POST   /api/leads/:leadId/interactions   -> 201 Interaction
```

**Interaction is a composed resource with independent identity.** Lifecycle-dependent on Lead (hence
`ON DELETE CASCADE`), but *not* access-dependent — `analytics-dashboard.md:21,172-182` charts
interactions across all leads with no `leadId` filter. So: nest where the parent is semantically
required (creation), flat for identity when those endpoints arrive.

Deferred, with triggers:
- `GET /api/leads/:leadId/interactions` — when Day 4 wants independent list refresh (`day-4-mobile-app.md:215`)
- `GET /api/interactions?since=` — if the analytics bonus module is attempted
- `PATCH|DELETE /api/interactions/:id` — no requirement anywhere yet

## 5. Verified, not assumed

| Check | Result |
| --- | --- |
| Workspaces link `@ai-academy/shared` and `@ai-academy/api` | ✅ symlinks in `node_modules/@ai-academy/` |
| `nest build` succeeds with the cross-workspace type import | ✅ |
| `dist/` layout stays flat (`dist/main.js`, not `dist/apps/api/src/main.js`) | ✅ the `.d.ts` choice paying off |
| Exhaustiveness bridge rejects an omitted union member | ✅ dropping `'lost'` → `TS2344: Type '"lost"' does not satisfy the constraint 'never'` |
| `satisfies` alone would have missed it | ✅ the 4-element array satisfied `readonly LeadStatus[]` without complaint |

That last pair is the whole justification for the `Exclude` half of the bridge, and it's now
demonstrated rather than argued.

## Next

1. Migration `001-create-leads-and-interactions` — revert and delete `000-smoke` first
   (`npm run db:migrate:undo`), plus `database/smoke.model.ts` and the `smoke` block in `health.service.ts`.
2. CSV import (Feature 1). **Question 12 is still open:** does the seed script boot via a NestJS
   standalone application context (reusing ConfigModule + models + services) or a bare ts-node script?
   Recommendation on record: standalone context with a slim `SeedModule`.
3. Frontend track can start now against `packages/shared` — typed fixtures, not a stub server.
