# Database Migration Strategy (ActiveRecord)

Companions `core/methodology/database-migration-strategy.md`, which states the rules.
This is those rules as ActiveRecord commands.

**Purpose:** Keep schema changes safe when several agents work in parallel and deploys are
rolling.

Project-specific commands live in @.claude/orchestration/meta/project-profile.md.

---

## The two rules that prevent most incidents

1. **A migration is append-only once merged.** Never edit an applied migration. Write a new
   one. Editing one that already ran elsewhere leaves two environments with the same
   `schema_migrations` row and different actual schemas — and nothing will tell you.
2. **Schema changes and data changes deploy on different tracks.** A DDL migration should be
   fast and lock-light. Backfilling a million rows inside it holds a lock for the length of
   the backfill.

---

## Generating migrations

```bash
bin/rails g migration AddStatusToPolicies status:string
bin/rails db:migrate
bin/rails db:migrate:status        # what's applied vs pending
bin/rails db:rollback STEP=1       # only if it hasn't been merged
```

Always write `change` reversibly, or implement `up`/`down` explicitly. An irreversible
migration blocks `db:rollback` for everyone, including CI.

---

## `schema.rb` (or `structure.sql`)

Generated, checked in, and the most conflict-prone file in the repo.

- **Resolve conflicts by re-running `bin/rails db:migrate`**, never by editing the version
  line by hand. Hand-editing produces a schema that matches neither branch.
- **The `define(version:)` line must equal the newest applied migration.** If it doesn't,
  someone hand-resolved a conflict.
- `structure.sql` (used when the schema needs SQL features `schema.rb` can't express —
  triggers, partial indexes, extensions) conflicts even more readily. Same rule.

**Parallel-agent implication:** only one agent per feature runs migrations. Others rebase
onto its `schema.rb`. Two agents generating migrations independently guarantees a conflict
and often a lost migration.

---

## If `strong_migrations` is installed

It blocks operations that are unsafe against a live table. **The block is correct.** The fix
is the multi-step migration it suggests — not `safety_assured { ... }`. Reaching for
`safety_assured` is a decision to accept downtime; make it explicitly, with a comment
saying why it's safe here.

Common blocks and the real fix:

| Blocked | Why | Fix |
| --- | --- | --- |
| Add column with default to a big table | Rewrites every row (older PG) | Add column, backfill in batches, then set default |
| Add `NOT NULL` | Full table scan under lock | Add a check constraint `NOT VALID`, validate, then set |
| Remove a column | Running code still SELECTs it | `ignored_columns` + deploy, *then* drop |
| Rename a column | Old and new code disagree mid-deploy | Add new, dual-write, backfill, switch reads, drop old |
| Add an index | Locks writes | `add_index ..., algorithm: :concurrently` (in `disable_ddl_transaction!`) |
| Change a column type | Rewrites and locks | New column, backfill, swap |

---

## Multi-deploy changes (the pattern to internalise)

Rails caches the column list at boot, so during a rolling deploy old and new code run
against the same schema simultaneously. Anything that removes or renames must be split.

**Removing a column — two deploys:**

1. Deploy 1: stop referencing it everywhere, add `self.ignored_columns += ["old_col"]`.
2. Deploy 2: `remove_column`, drop the `ignored_columns` line.

**Renaming a column — four steps:** add new → write both → backfill → read new → drop old.
There is no safe one-step rename on a table with traffic.

---

## Data migrations / backfills

Keep them out of schema migrations.

- If the project has **`data_migrate`** (`db/data/`), that's the home:
  `bin/rails g data_migration backfill_policy_status`, `bin/rails data:migrate`.
- Otherwise use a rake task in `lib/tasks/` or a one-off script, and say in the PR how it
  gets run.

Backfills must be **batched and idempotent**:

```ruby
Policy.where(status: nil).in_batches(of: 1_000) do |batch|
  batch.update_all(status: "active")
end
```

`update_all` skips validations and callbacks — usually what you want in a backfill, and
worth a comment saying so. Re-running the task must be harmless; assume it will be re-run.

---

## Test database

A green suite against a stale schema proves nothing.

```bash
bin/rails db:test:prepare
```

With **`parallel_tests`**, each worker has its own database (`myapp_test1`, `myapp_test2`,
…). After a schema change, prepare all of them — the project usually has a `bin/` script
for this (`bin/setup_parallel_test` or similar). Preparing only the primary gives you a
suite that passes on worker 1 and fails everywhere else.

---

## Engines

Migrations live in the engine's `db/migrate/` and are installed into the host app:

```bash
bin/rails <engine_name>:install:migrations
```

The host app owns `schema.rb`; the engine does not. Specs run against `spec/dummy`, so
`spec/dummy/db/schema.rb` is what your local specs actually see. If the project has a
`lib/tasks/install/migrations.rake`-style task, read it — the install path is often
customised.

---

## Before claiming a migration is done

- [ ] `bin/rails db:migrate` clean, `db:migrate:status` shows no pending
- [ ] `bin/rails db:rollback STEP=1` works, then re-migrate (reversibility proven, not assumed)
- [ ] `schema.rb` diff contains only your change and one version bump
- [ ] Test DBs prepared, including all parallel workers
- [ ] Backfill, if any, lives outside the schema migration and is batched + idempotent
- [ ] If `strong_migrations` complained, the change was restructured rather than force-approved
- [ ] Column removals/renames split across deploys
