# Testing Standards (RSpec / Rails)

Companions `core/playbook/testing-standards.md`. This is that checklist with RSpec
commands in it.

Quick operational checklist. Full reasoning:
@.claude/orchestration/core/methodology/testing-as-infrastructure.md
Project commands: @.claude/orchestration/meta/project-profile.md

---

## Before you run anything

- [ ] Read `.rspec`. **Default `--tag ~foo` flags mean specs are being excluded**, and a
      green run does not include them. Know what you skipped.
- [ ] `bin/rails db:test:prepare` — a pass against a stale schema is meaningless.
- [ ] Use the project's wrapper (`bin/rspec`) not the bare gem; wrappers pin flags.
- [ ] If `parallel_tests` is in use, prepare every worker database, not just the first.

## Which kind of spec

| Testing | Directory | Doubles |
| --- | --- | --- |
| A model's own behaviour | `spec/models` | Only for external services |
| One operation with side effects | `spec/services` | Only for external services |
| An HTTP endpoint end to end | `spec/requests` | None for anything in-app |
| A background job's behaviour | `spec/jobs` | Only for external services |
| A ViewComponent's render | `spec/components` | Rarely |
| A full user journey | `spec/system` | None |

**Prefer `spec/requests` to `spec/controllers`.** Controller specs stub routing,
middleware and serialization — the three layers most likely to be wrong.

## Two tiers, both required

- **Isolated specs** — fast, doubles allowed for collaborators you don't own.
- **Integration specs** — no doubles for in-app code. Real DB, real routing, real
  serialization.

A double encodes your *belief* about a collaborator. Integration specs test the
collaborator. Every bug that survives a green suite lives in that gap.

## Rails-specific rules

- [ ] **Freeze time.** Never assert against `Time.now`. Unfreeze after.
- [ ] **`let` is lazy.** A `let` nobody references never runs. Use `let!` when the record
      must exist.
- [ ] **`build` unless you need persistence.** `create` is a DB round trip; it dominates
      suite runtime.
- [ ] **Don't stub the subject.** Stubbing `#save` in a spec about saving tests the stub.
- [ ] **Assert on the database, not just the response**, for anything that writes.
- [ ] **Jobs:** assert *enqueued* in request specs; test *behaviour* with `perform_now` in
      job specs. Not both in one example.
- [ ] **`after_commit` doesn't fire** under transactional fixtures. If the feature relies on
      it, the spec needs `use_transactional_fixtures = false` or an explicit commit.
- [ ] **Money:** `decimal`, and compare with `eq BigDecimal("1.10")`, never a float literal.

## Order dependence is not flakiness

If a spec passes alone and fails in the suite, it is leaked state — not luck. Usual
suspects: class-level memoization (`@@` or `||=` on the class), `Rails.cache`, frozen time
never unfrozen, a global config mutated in a `before` with no `after`, records created
outside a transaction.

Reproduce it: `bin/rspec --seed <the failing seed>`. Fix the leak, don't reorder.

## Coverage

If SimpleCov has a minimum, **coverage failure fails the gate** even with every example
green. Check whether the project measures *line* or *branch* coverage — some repos have a
`bin/` script for the branch check.

## Definition of done

- [ ] New behaviour has both an isolated and an integration spec
- [ ] Ran the full suite, not just your file
- [ ] Know which tags `.rspec` excluded and where those specs run instead
- [ ] Ran once with a different `--seed`
- [ ] If `Appraisals` exists: passing locally is one cell of the matrix; CI runs the rest
- [ ] Coverage threshold still met
- [ ] No `focus:`/`fit`/`fdescribe` and no `:skip` left behind
