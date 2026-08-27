# Validation Gates (Mandatory for All Features)

**Purpose:** Define when a feature is truly "complete" vs "loads but broken"

**Status:** MANDATORY - all gates must pass before claiming "COMPLETE"

**Stack:** Ruby / Rails. Commands below are defaults; the authoritative per-project
commands live in @.claude/orchestration/meta/project-profile.md. Where this file and the
profile disagree, **the profile wins** — it was filled in from the project's own CI.

---

## Where gate commands come from

In a Rails project the gates are usually already written down, in this order of authority:

1. **CI** — `.github/workflows/*.yml`. This is what the project refuses to merge without.
2. **Git hooks** — `lefthook.yml`, `.husky/`, `.pre-commit-config.yaml`.
3. **`bin/` wrappers** — `bin/rubocop`, `bin/rspec`, `bin/linter`. Projects wrap tools to
   pin flags; call the wrapper, not the bare gem, or you lose the flags.
4. **`rake -T`** — for project-specific tasks.

Never infer a command from convention. `bundle exec rspec` and `bin/rspec -p` are not
interchangeable if the second one shards across cores against pre-built parallel databases.

---

## Gate 1: Load / boot check

**There is no static type checker in Ruby.** If you came here from a TypeScript version of
this methodology, Gate 1 was `tsc --noEmit`. It has no equivalent. Do not substitute a
plausible command — an agent that cannot run a gate reports a false pass, which is worse
than one fewer honest gate.

What Ruby *can* check statically is that everything loads and resolves:

```bash
bin/rails zeitwerk:check      # every file defines the constant its path implies
bin/rails runner 'Rails.application.eager_load!'   # force-load all app code
```

**Required:** 0 errors

**Why:** Ruby resolves constants at call time, so a typo'd class name or a file in the
wrong directory raises `NameError` in production rather than at build time. Eager-loading
turns that into a fast, deterministic check.

**Common issues caught:**

- Class/module name doesn't match its file path (`app/services/foo_bar.rb` → `FooBar`)
- Missing `require` for a non-autoloaded dependency
- Circular constant references
- Code moved between `app/` and `lib/` without updating autoload paths

**If the project has Sorbet (`sorbet/` + `srb` in the Gemfile) or RBS (`sig/` + `steep`),
use that instead** — it is a real type gate:

```bash
bundle exec srb tc          # Sorbet
bundle exec steep check     # RBS
```

**Engines:** `zeitwerk:check` needs a host app. In an engine, run it through the dummy app
(`cd spec/dummy && bin/rails zeitwerk:check`) or drop this gate and say so in the profile.

---

## Gate 2: RuboCop / Standard

```bash
bin/rubocop          # or bin/standardrb
```

**Required:** 0 offenses

**Do not run the auto-fixing form as the gate.** `bin/rubocop -a`, `bin/linter --fix` and
friends mutate the working tree; a gate that edits code to make itself pass is not a gate.
Auto-fix while developing, then run the read-only form to verify.

**`.rubocop_todo.yml` is a debt ledger, not a pass.** If the project has one, check that
your change didn't grow it. Some projects enforce this — look for a
`check_for_rubocop_todos`-style script in `bin/` and run it if present.

**Common issues caught:**

- Unused variables, unreachable code
- Method/class length and complexity limits
- Style inconsistency across agents working in parallel
- `Rails/` cops: `find_by` vs `where.first`, missing `dependent:` on associations,
  `pluck` vs `map`, unsafe `update_all`

---

## Gate 3: Specs Passing

```bash
bin/rspec            # or bin/rspec -p to shard across cores (parallel_tests)
```

**Required:** All examples passing, 0 failures. Pending is not passing.

### Two-tier strategy (BOTH required)

**Unit / isolated specs (doubles allowed):**

- `spec/models`, `spec/services`, `spec/forms`, `spec/serializers`
- Fast, no HTTP, minimal DB
- Example: "`Policy#cancellable?` is false once `cancelled_at` is set"

**Integration specs (NO doubles for the thing under test):**

- `spec/requests` (preferred over `spec/controllers`), `spec/jobs`, `spec/system`
- Real database, real serialization, real routing
- Example: "`POST /policies` persists the row, then `GET /policies/:id` returns it with
  `status: \"active\"`"

**Why both:** doubles encode your belief about a collaborator. Integration specs test the
collaborator. Bugs live in the gap — `nil` vs `""` from the DB, `BigDecimal` vs `Float` in
money columns, timezone drift on `Date` columns, JSON keys stringified after a round trip.

### Rails-specific spec gate notes

- **Prepare the test database first.** A green run against a stale schema is meaningless:
  `bin/rails db:test:prepare`.
- **`--tag ~something` in `.rspec` means specs are being excluded by default.** Read
  `.rspec` before claiming the suite passed. Excluded contract/pact specs still have to run
  somewhere — usually a separate CI job.
- **`parallel_tests`:** the databases are per-worker (`..._test1`, `..._test2`). If you
  changed the schema, re-prepare all of them, not just the primary.
- **Appraisal:** if `Appraisals` exists, "the suite passes" means *across the dependency
  matrix*. Passing on your local Gemfile proves one cell of it. CI runs the rest.
- **Coverage:** if SimpleCov is configured with a minimum, coverage failure fails the gate
  even when every example is green.

---

## Gate 4: Process and Resource Cleanup

```bash
lsof -i :3000                  # Puma / rails server
lsof -i :6379                  # Redis (Sidekiq)
lsof -i :5432                  # PostgreSQL
ls tmp/pids/                   # stale server.pid blocks the next boot
ps aux | grep -E 'puma|sidekiq|spring' | grep -v grep
```

**Required:** No stray processes, no stale pidfile, no leaked test databases

**Why:** parallel agent sessions each start servers and workers. Rails specifically leaves
`tmp/pids/server.pid` behind on a hard kill, and the next `bin/rails s` refuses to start.

**Fix if needed:**

```bash
kill <PID>
pkill -f puma
pkill -f sidekiq
bin/spring stop                # if spring is in use
rm -f tmp/pids/server.pid
```

**Also check:** background jobs enqueued during manual testing. A Sidekiq job left in the
queue will run against the next session's database. Clear the queue or run inline.

---

## Gate 5: Manual Verification

**CRITICAL:** green specs ≠ feature actually working.

### Web-facing changes

```bash
bin/rails s
# open http://localhost:3000/<the specific path you built>
```

Verify in a real browser (Playwright MCP if available): the page renders, the form
submits, the record changes, the flash appears, and a reload shows the persisted state.
Check `log/development.log` for N+1 queries and swallowed exceptions while you do it.

### API-only changes

```bash
curl -i -X POST http://localhost:3000/policies \
  -H 'Content-Type: application/json' \
  -d '{"policy":{"...":"..."}}'
```

Assert on status, headers, and body shape — not just 200.

### Engines and gems (no bootable app of your own)

```bash
bin/rails c                    # or: cd spec/dummy && bin/rails s
```

Exercise the object graph in the console against real data, or boot the dummy host app.
State in the profile which one this project uses.

### Background jobs

```bash
bundle exec sidekiq            # then trigger the job and watch it drain
```

Verify the job runs, is idempotent on retry, and doesn't depend on request-cycle state.

---

## Session Log Documentation (MANDATORY)

```markdown
## Pre-Completion Validation Results

### Gate 1: Load check
[paste `bin/rails zeitwerk:check` output, or state that this project has no type/load gate and why]

### Gate 2: RuboCop
[paste `bin/rubocop` output — the read-only form]

### Gate 3: Specs
[paste `bin/rspec` summary line, plus which tags were excluded by .rspec]

### Gate 4: Process cleanup
[paste lsof / ps output showing nothing stray]

### Gate 5: Manual verification
[what you did, what you observed — specific, not "it works"]
```

---

## Failure Handling

A failing gate is not a reason to narrow the claim. Fix it, or report the feature as
incomplete with the failing output pasted in. "Specs pass except one unrelated flake" is a
finding to investigate, not a pass — on Rails, "unrelated flake" is very often leaked state
between examples, a missing `freeze_time`, or an order-dependent spec that a different
`--seed` will expose.

---

## Quick Reference

- [ ] Gate 1: Load check — `zeitwerk:check` / eager load clean (or explicitly N/A)
- [ ] Gate 2: RuboCop — 0 offenses, read-only form, `.rubocop_todo.yml` no larger
- [ ] Gate 3: Specs — all green, test DB prepared, know which tags were skipped
- [ ] Gate 4: Cleanup — no stray puma/sidekiq, no stale pidfile, queues drained
- [ ] Gate 5: Manual — specific observed outcome in browser, curl, or console
