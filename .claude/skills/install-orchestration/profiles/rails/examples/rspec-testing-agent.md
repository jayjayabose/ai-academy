# RSpec Testing Infrastructure Agent — Task Specification

Companions `core/templates/agent-prompts/testing-infrastructure-agent.md`. This is that
template rewritten for RSpec.

> Template. Replace every `{{...}}` before handing this to an agent. Delete sections that
> don't apply — a prompt describing infrastructure the project already has wastes a session.

## Agent Identity

You are the testing infrastructure agent for {{PROJECT}}. You own the test harness itself,
not feature specs. When you are done, other agents must be able to write specs without
making any further infrastructure decisions.

## First: establish what already exists

**Do not scaffold over a working harness.** Before writing anything, report:

```bash
cat .rspec                                  # default flags — note any --tag ~exclusions
ls spec/ spec/support/ 2>/dev/null
cat spec/spec_helper.rb spec/rails_helper.rb 2>/dev/null
grep -E 'rspec|factory_bot|simplecov|parallel_tests|appraisal|capybara' Gemfile
ls bin/                                     # existing wrappers are the real commands
cat lefthook.yml .github/workflows/*.yml 2>/dev/null | grep -E 'run:|rspec|rubocop'
```

State plainly which of the following already exist and which you are adding. If the harness
is already complete, say so and stop — that is a successful outcome.

## Primary objectives

1. RSpec runnable via the project's wrapper, one command, from a clean checkout
2. Test database creation and schema load wired to a single command
3. Factories (or fixtures — **follow the repo**) for the core models
4. One passing isolated spec and one passing integration spec, as proof the harness works
5. Coverage reporting, if the project wants a threshold
6. Documented commands in `{{README or CONTRIBUTING}}`

## Technical requirements

### Harness

- `spec/rails_helper.rb` loads the Rails env; `spec/spec_helper.rb` stays framework-free
- `spec/support/**/*.rb` auto-required, and **explicitly ordered if any file depends on
  another**
- `config.infer_spec_type_from_file_location!` so `spec/requests` gets request helpers
- Transactional fixtures on by default; document how to opt out for `after_commit` specs
- Random order with a printed seed — order dependence must be reproducible, not hidden

### Database

- `bin/rails db:test:prepare` must be sufficient to go from clean checkout to runnable
- **If `parallel_tests` is used:** worker databases (`{{db}}_test1`, `_test2`, …) must all be
  prepared by one command. Provide `bin/{{setup_parallel_test}}` if it doesn't exist.
- Schema loaded from `{{schema.rb | structure.sql}}`, never by replaying every migration

### Factories

- One factory per core model, minimal valid attributes only
- Traits for meaningful variants; no factory that creates a whole object graph by default
- `build` in isolated specs, `create` only when persistence is under test
- A linting spec that instantiates every factory, so a stale factory fails fast

### Proof specs (write these, and make them pass)

1. **Isolated:** a model validation. Real object, no DB write, no doubles.
2. **Integration:** a request spec that POSTs, asserts the response, **and asserts the row
   in the database**. No doubles for anything in-app.

The second one is the point of the exercise. A harness that can only run isolated specs
hides exactly the bugs this methodology exists to catch.

### Time and money, if the project has them

- A time-freezing helper available to all specs, with automatic unfreeze
- `BigDecimal` comparison helper for money columns; float assertions are a defect

### CI

Mirror the gates in `{{.github/workflows/...}}`. CI is the authority on what must pass; the
local commands should be the same commands. If `Appraisals` is present, CI runs the matrix —
state that local green is one cell of it.

## Validation gates (all must pass before reporting complete)

Use the exact commands from @.claude/orchestration/meta/project-profile.md. Do not
substitute conventional-looking equivalents.

- [ ] Gate 1 — load check ({{bin/rails zeitwerk:check}}), or state that this project has none
- [ ] Gate 2 — {{bin/rubocop}}, read-only form, 0 offenses
- [ ] Gate 3 — {{bin/rspec}} green from a clean checkout, both proof specs passing
- [ ] Gate 4 — no stray processes, no stale `tmp/pids/server.pid`, no leaked test DBs
- [ ] Gate 5 — a second engineer can clone, run `{{setup}}`, run `{{bin/rspec}}`, and see green

## Deliverables

1. `.rspec`, `spec/spec_helper.rb`, `spec/rails_helper.rb`, `spec/support/**`
2. Factories for {{models}}
3. The two proof specs
4. Test-database setup command (and parallel-worker preparation if applicable)
5. Coverage config, if in scope
6. A short docs section: how to run one spec, the suite, and the suite in parallel
7. Session log per @.claude/orchestration/core/methodology/session-logging-system.md

## Explicitly out of scope

- Feature specs for {{features}} — other agents own those
- Migrations — the schema agent owns `db/`
- Changing existing specs to pass. **If an existing spec fails, report it. Do not edit it.**

## Success criteria

Not "tests are set up". Specifically:

- `{{bin/rspec}}` on a clean clone runs {{N}} examples, 0 failures, in under {{X}}s
- `{{bin/rspec spec/path/to/one_spec.rb}}` runs a single file
- The integration proof spec fails if you deliberately break the endpoint (verify this —
  a spec that can't fail isn't testing anything)
- `{{bin/rspec}}` twice with different seeds gives the same result
