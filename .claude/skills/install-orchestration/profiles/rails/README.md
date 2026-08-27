# Rails profile

Pre-adapts the orchestration knowledge base for Ruby/Rails, so installing into a Rails
project doesn't mean rewriting 35 files by hand every time.

```bash
./install.sh /path/to/rails-project --profile rails
```

## What it does, in order

1. **Base copy** — the normal install.
2. **Mechanical substitutions** (`substitutions.sed`) applied to every `adapt` and
   `adapt-light` file: `npm run lint` → `bin/rubocop`, `npm test` → `bin/rspec`, Jest → RSpec,
   Sequelize → ActiveRecord, and so on. High-confidence literal swaps only.
3. **Overlay** (`files/`) — six files fully rewritten for Rails, plus two Rails-shaped
   templates.
4. **Removal** (`remove.txt`) — deletes base files this profile supersedes under a different
   name, so two contradictory versions never coexist.
5. **Retiering** (`manifest-overrides.tsv`) — the generated `ADAPTATION-TODO.md` reflects what
   the profile already handled.

## What it does NOT do

**It does not know your project.** `meta/project-profile.md` and `meta/project-mission.md`
arrive as Rails-shaped templates full of `{{placeholders}}`, and filling them is still
priority 1. An unfilled placeholder that reaches an agent becomes a fabricated command,
which is worse than an obviously-wrong Node one.

Substitutions swap *commands*, not *prose*. Files like `success-criteria.md` will have
correct commands inside examples that still describe an Angular feature. That's why they
stay on the worklist.

## Design notes

- **Gate 1 is not a type check.** Ruby has no static type gate. The profile's
  `validation-gates.md` makes Gate 1 a zeitwerk/eager-load check and says explicitly that
  substituting a plausible command is worse than running four honest gates.
- **Lint gates are read-only.** `bin/linter --fix` and `rubocop -a` mutate the tree; a gate
  that edits code to pass isn't a gate.
- **CI outranks scripts.** `lefthook.yml` and `.github/workflows/*` record what the project
  actually enforces. The profile tells you to source gate commands from there first.
- **Rails' parallel-agent hazards are shared *files*, not shared types:** `db/schema.rb`,
  `config/routes.rb`, `config/locales/*.yml`, `Gemfile`. The agent-specs library assigns
  ownership of each.

## Extending

To add another stack, mirror this directory: `substitutions.sed`, `files/`, `remove.txt`,
`manifest-overrides.tsv`, `README.md`. `install.sh --profile <name>` picks it up with no
code change.
