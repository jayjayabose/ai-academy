# Rails Patterns

The Rails half of `core/playbook/`: framework-specific operational patterns that have no
portable statement. Nothing in core/ companions this file.

Operational patterns for agents working in a Rails codebase. Project-specific facts
(commands, layout, gates) live in @.claude/orchestration/meta/project-profile.md — this
file is about Rails itself.

---

## Establish the project's shape first

Rails projects are not interchangeable. Before writing code, determine:

| Question | Why it changes your work |
| --- | --- |
| App, engine, or plain gem? | An engine has no bootable app of its own; specs run against `spec/dummy`. `bin/rails s` may not exist. |
| Autoloaded (`app/`) or `require`d (`lib/`)? | `lib/` is often *not* eager-loaded. A class there may need an explicit `require`. |
| API-only or full-stack? | Decides whether Gate 5 is curl or a browser, and whether views/ViewComponents are in scope. |
| Is there an `Appraisals` matrix? | "Specs pass" means across dependency versions, not just your Gemfile. |
| `schema.rb` or `structure.sql`? | Determines whether migrations can be squashed and how merge conflicts resolve. |
| Are there data migrations separate from schema migrations (`db/data`)? | Schema and data changes deploy on different tracks. |

Read `CLAUDE.md`, `CONTRIBUTING.md` and `docs/` before assuming any convention. A mature
Rails app has strong local opinions that override generic Rails advice.

---

## Where code goes

Rails' defaults cover controllers, models, jobs, mailers and views. Everything else is a
local convention — follow the one already in the repo rather than importing your own.

Commonly present, and what each usually means:

- `app/services/` — a single operation with side effects. One public method, often `.call`.
- `app/forms/` — validation and coercion for input that isn't one model (multi-model forms,
  API payloads). Includes `ActiveModel::Model`.
- `app/serializers/` — outbound shape. If `active_model_serializers` or `jsonapi-serializer`
  is present, do not hand-roll `to_json` alongside it.
- `app/components/` — ViewComponent. A component with a `.rb` and a sibling template; specs
  live in `spec/components`.
- `app/validators/` — custom `ActiveModel::Validator` subclasses, reused across models.
- `app/interfaces/`, `app/filters/`, `app/lib/` — local inventions. Read two existing files
  before adding a third.

**The fat-model/fat-controller question is already settled in the repo.** Find the closest
existing feature and mirror it. Introducing a service layer into a codebase that puts logic
in models is a refactor, not a feature — raise it, don't smuggle it.

---

## ActiveRecord

### Migrations

- **Migrations are append-only once merged.** Never edit an applied migration; write a new
  one. Editing one that's already run in another environment silently diverges schemas.
- **`schema.rb` is generated and checked in.** It is the single worst merge-conflict file in
  a Rails repo. Resolve conflicts by re-running `bin/rails db:migrate`, never by hand-editing
  the version line.
- **If `strong_migrations` is installed, it will block unsafe operations** — adding a NOT
  NULL column with a default on a large table, removing a column still referenced by
  running code, adding an index non-concurrently. The block is correct. The fix is the
  two-step migration it suggests, not `safety_assured`.
- **Removing a column is two deploys:** first stop referencing it (and `ignored_columns`),
  then drop it. Rails caches the column list at boot, so a one-step drop breaks the running
  process.
- **Data changes are not schema changes.** If the project has `db/data/` (data_migrate) or a
  rake task convention, put backfills there. Backfilling inside a schema migration couples a
  slow row-by-row operation to the deploy that holds the DDL lock.

### Queries

- **N+1 is the default failure mode.** Any `has_many` touched in a loop or a serializer
  needs `includes`/`preload`. Watch `log/development.log` during Gate 5; if `bullet` is
  installed, it will tell you.
- `find_by` returns nil, `find_by!` raises, `find` raises. Pick deliberately.
- `update_all` / `delete_all` skip validations, callbacks and timestamps. Sometimes that's
  the point; say so in a comment when it is.
- **Scopes must return relations**, so they stay chainable. A scope returning an Array is a
  latent bug.
- Money is `decimal`, never `float`. Comparisons and sums on `float` columns will drift.

### Callbacks

Prefer an explicit call in a service over an `after_save` callback. Callbacks fire in specs,
in seeds, in `rails c`, and in unrelated features that happen to save the record — which is
exactly why cross-agent work breaks on them.

---

## Background jobs

- **Jobs must be idempotent.** Sidekiq retries on failure; at-least-once is the contract.
  A job that charges a card or sends an email needs a guard.
- **Pass IDs, not objects.** Serializing an AR object into the queue captures stale
  attributes and breaks on deploy. `perform_later(policy.id)`, then reload inside.
- **The job may run before the transaction commits.** Enqueue after commit
  (`after_commit`), or the job will look up a row that isn't there yet.
- **Specs:** assert the job was enqueued (`have_enqueued_job`) in request specs, and test
  the job's behaviour separately with `perform_now`. Don't do both in one example.

---

## RSpec

- **`spec/requests` over `spec/controllers`.** Request specs go through routing, middleware
  and serialization; controller specs stub all three.
- **`let` is lazy, `let!` and `before` are eager.** A `let` that is never referenced never
  runs — a common cause of "the spec passes but the record doesn't exist".
- **Factories over fixtures for new code**, but follow the repo. `build` when you don't need
  persistence; `create` costs a DB round trip per call and dominates suite time.
- **Order dependence hides in shared state.** Class-level memoization, `Rails.cache`, and
  `Timecop`/`freeze_time` without an unfreeze all leak between examples. If a spec passes
  alone and fails in the suite, that's the cause — not a flake.
- **Time:** never assert on `Time.now`. Freeze it. Date-boundary bugs are the single most
  common "works locally, fails in CI" class.
- **Don't stub the thing you're testing.** Stubbing `Policy#save` in a spec about saving
  policies tests the stub.

---

## Coordination between parallel agents

Rails' implicit coupling makes some conflicts specific to it. Lock these *before* agents
start:

| Shared surface | Lock it by |
| --- | --- |
| Migration filenames | Assign each agent a timestamp range, or serialize migrations through one agent. Two agents generating migrations produce two `schema.rb` versions and a guaranteed conflict. |
| `schema.rb` | Only one agent runs migrations per feature. Others rebase. |
| Attribute naming | Rails is `snake_case` in the DB and Ruby. If a JSON API exposes `camelCase`, the serializer owns that translation — write down which layer converts, or two agents will each do it. |
| Routes file | `config/routes.rb` is a single file every agent wants to edit. Assign one owner, or pre-write the routes as infrastructure before parallel work starts. |
| Locale files | Same problem as routes. `config/locales/*.yml` conflicts constantly. |
| Autoload paths | An agent moving a file between `app/` and `lib/` changes constant resolution for everyone. |
| `Gemfile` / `Gemfile.lock` | One agent adds gems. `Gemfile.lock` conflicts are painful; resolve by re-running `bundle install`, not by hand. |

---

## Gotchas that cost the most time

- **Nothing loaded my new file.** The class name doesn't match the path. `bin/rails zeitwerk:check`.
- **It works in `rails c` but not in the request.** Eager loading in production vs lazy in
  development; or you're relying on a constant that's only loaded by another path.
- **The spec passes but the feature doesn't.** Transactional fixtures roll back what a real
  request would commit. Check whether the code depends on `after_commit`.
- **Strong parameters silently drop attributes.** No error — the value just isn't there.
  Check `permit` before debugging the model.
- **`nil` vs `""`.** A blank form field arrives as `""`, not `nil`. `presence` and
  `allow_nil` are not the same guard.
- **Timezones.** `Time.zone.now` vs `Time.now`, and `Date` columns that shift a day when
  the app's zone isn't UTC.
- **Counter caches and `touch:`** update rows you didn't expect, invalidating other agents'
  assumptions about `updated_at`.
