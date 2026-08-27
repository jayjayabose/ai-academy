# Agent Specs Library (Rails)

**Purpose:** Agent role definitions for a Rails codebase, with the coordination risk of each
stated up front.

Project commands and layout: @.claude/orchestration/meta/project-profile.md
Rails conventions: @.claude/orchestration/playbook/rails-patterns.md

---

## Why Rails changes the risk calculus

In a typed polyglot repo, agents are separated by language boundaries. In Rails they all
edit the same Ruby, and several files are **global singletons every agent wants to touch**:

| File | Consequence of two agents editing it |
| --- | --- |
| `db/schema.rb` | Guaranteed conflict; hand-resolution corrupts the schema |
| `db/migrate/*` | Two independent timestamps, one lost migration |
| `config/routes.rb` | Constant conflicts; easy to resolve, constant friction |
| `config/locales/*.yml` | Same |
| `Gemfile` / `Gemfile.lock` | Painful lock conflicts |
| Any `app/models/*.rb` shared by two features | Callback and validation collisions |

**Therefore: migrations and routes are infrastructure, not feature work.** Do them in a
Task 0 before parallel agents start, or assign exactly one owner.

---

## Low-coordination roles (safe to parallelise)

### 1. Migration & Schema Agent — run FIRST, alone

**Owns:** `db/migrate/`, `db/schema.rb`, model-level column concerns, `db/data/` backfills.

**Objectives**
- Write the migration(s) for the whole feature set, not just one agent's slice
- Prove reversibility: migrate, rollback one step, migrate again
- Keep backfills out of schema migrations (batched, idempotent, `db/data/` or a rake task)
- Prepare all test databases, including parallel workers

**Must not:** write controllers, services or specs for the features. Its job is the schema.

**Coordination:** none, *because it runs alone before everything else*. Parallelising this
role is the single most common cause of a broken `schema.rb`.

**Gates:** Gate 1 (load), Gate 2 (rubocop), plus `db:migrate:status` clean and a proven
rollback. See @.claude/orchestration/methodology/database-migration-strategy.md.

---

### 2. Model & Domain Logic Agent

**Owns:** one model or a tight cluster, plus its validators and `spec/models`.

**Objectives**
- Validations, associations (with explicit `dependent:`), scopes returning relations
- Domain predicates and query methods
- Isolated specs covering each validation and edge case

**Must not:** add migrations (that's role 1), or add `after_save` callbacks that other
features will trigger — prefer an explicit call from a service.

**Coordination:** low if it owns the model file exclusively. **High the moment two agents
share a model** — assign one owner per file and route other agents' needs through it.

---

### 3. Service / Operation Agent

**Owns:** one class in `app/services` (or the repo's equivalent) and its spec.

**Objectives**
- One public entry point; explicit inputs; a documented return contract (result object,
  raise, or boolean — match the repo)
- Transaction boundaries stated deliberately
- Isolated spec with doubles only for genuinely external services

**Must not:** reach into controllers or views.

**Coordination:** low. This is the safest role to parallelise, which is why service-shaped
work is the best way to decompose a Rails feature.

---

### 4. Request / Controller Agent

**Owns:** one controller, its strong parameters, and `spec/requests`.

**Objectives**
- Routes (**coordinate — see below**), actions, strong params, status codes
- Serialization through the project's existing serializer layer, not hand-rolled `to_json`
- Request specs asserting status, body shape, and the database effect

**Must not:** put domain logic in the controller; call the service.

**Coordination:** **medium — `config/routes.rb` is shared.** Either pre-write all routes in
Task 0, or nominate one agent to own the file and have others hand it their route lines.

---

### 5. Background Job Agent

**Owns:** one job class and `spec/jobs`.

**Objectives**
- Idempotent `perform` (retries are at-least-once)
- Arguments are IDs, never AR objects
- Enqueued `after_commit`, not mid-transaction
- Spec for behaviour with `perform_now`; enqueue asserted separately in request specs

**Coordination:** low, unless it shares a queue configuration file.

---

### 6. View / ViewComponent Agent

**Owns:** components under `app/components` (or views), their templates, `spec/components`.

**Objectives**
- Render with real data; no N+1 introduced in the template
- Locale keys added to `config/locales` (**shared file — coordinate**)
- Component spec asserting rendered output

**Coordination:** low for components, medium for locales and shared partials.

---

## High-coordination work (needs an explicit contract first)

### 7. API Contract Work

Two agents on either side of an HTTP boundary will diverge unless the contract is written
down **before** either starts.

Lock, in writing, in the execution plan:

- **Casing at the boundary.** Rails is `snake_case` end to end; if the API exposes
  `camelCase`, name the single layer that converts (serializer) and forbid the other side
  from converting too. Double-conversion is the classic parallel-agent bug.
- **Nesting and envelope.** Bare object, `{data: ...}`, or JSON:API — the serializer gem
  already decides this. Read it; don't invent.
- **Nullability and types over the wire.** `decimal` serializes as a JSON string in many
  setups. Decide and state it.
- **Error shape.** Status code plus body for validation failure, not found, and forbidden.
- **Timestamps.** ISO 8601 UTC, and which fields are exposed.

**Verification is the point:** a contract nobody checks is a comment. One side writes a
request spec asserting the literal expected payload; the other asserts against the same
fixture.

### 8. Cross-cutting Refactors

Renaming a model, moving code between `app/` and `lib/`, changing autoload paths, or
touching `ApplicationRecord`/`ApplicationController` affects every other agent's working
tree. **Never parallel.** Serialize it, land it, then fan out.

---

## Decomposing a Rails feature — the default shape

```
Task 0 (alone):     Migration & Schema Agent + routes + any new gems
                    ↓ (barrier — everyone rebases on schema.rb)
Parallel:           Model Agent · Service Agent · Job Agent · Component Agent
                    ↓
Task N (alone):     Request/Controller Agent wires it together, integration specs
```

The barrier after Task 0 is not optional. Agents that start before the schema lands will
write specs against columns that don't exist yet and burn the session debugging it.

---

## Every agent prompt must include

- The exact gate commands from @.claude/orchestration/meta/project-profile.md
- Which files it **exclusively owns**, and the named shared files it must not touch
- Session logging requirement (@.claude/orchestration/methodology/session-logging-system.md)
- Specific success criteria — "`GET /policies/:id` returns 200 with `status: \"active\"`",
  not "the endpoint works"
- The integration step: who wires this in, and where. "Created but never routed" is the
  most common false completion in Rails.
