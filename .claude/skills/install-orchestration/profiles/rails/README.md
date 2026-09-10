# Rails profile

A profile is now two things and nothing else:

1. **`project-profile.md` / `project-mission.md`** — stack-shaped versions of the two
   files the installer cannot write for you, so you are filling in Rails-shaped blanks
   instead of generic ones.
2. **`examples/`** — a worked-instance pack, installed as
   `.claude/orchestration/examples/rails/`.

```bash
./install.sh /path/to/rails-project --profile rails
```

## What it no longer does, and why

It used to also run `substitutions.sed` (115 literal swaps across 36 files) and overlay
six rewritten copies of core files. Both existed because the knowledge base was written
in Node prose and had to be translated on the way in. `core/` has no stack token in it,
so there is nothing to translate — and with the translator gone, so is the defect class
it produced: a half-rewritten sentence such as "tsconfig.json compiles project:
`bin/rails zeitwerk:check` returns 0 errors", which reads as deliberate and is nonsense.

The six overlay files were not deleted. They are the Rails pack, which is where
stack-specific writing belongs now.

## What it still does NOT do

**It does not know your project.** `meta/project-profile.md` arrives as a Rails-shaped
template full of `{{placeholders}}`, and filling it is the whole of phase 2. An unfilled
placeholder that reaches an agent becomes a fabricated command, which is worse than an
obviously-wrong Node one.

## Design notes

- **Gate 1 is not a type check.** Ruby has no static type gate. The pack's
  `validation-gates-examples.md` makes it a zeitwerk/eager-load check and says explicitly
  that substituting a plausible command is worse than running four honest gates.
- **Lint gates are read-only.** `bin/linter --fix` and `rubocop -a` mutate the tree; a gate
  that edits code to pass isn't a gate.
- **CI outranks scripts.** `lefthook.yml` and `.github/workflows/*` record what the project
  actually enforces. The profile template tells you to source gate commands from there.
- **Rails' parallel-agent hazards are shared *files*, not shared types:** `db/schema.rb`,
  `config/routes.rb`, `config/locales/*.yml`, `Gemfile`. `agent-specs-library-examples.md`
  assigns ownership of each.

## Adding a stack

Mirror this directory: `project-profile.md`, optionally `project-mission.md`, optionally
`examples/`. `install.sh --profile <name>` picks it up with no code change. If you only
have the worked examples and no profile template, contribute the pack upstream to
`.claude/orchestration/examples/<stack>/` instead — the installer picks a pack up from
there by detected stack, with no profile at all.
