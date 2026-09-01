---
name: install-orchestration
description: Install the ai-academy orchestration slash commands (/orchestration, /handoff, /validate) into another project, then adapt the knowledge base to that project's real stack, commands and conventions. Use when the user wants to set up, install, copy, port or bootstrap the orchestration tooling in a new or existing project.
argument-hint: "[path to target project] [--force] [--dry-run] [--with-backup]"
---

# Install orchestration tooling into a project

This is a **two-phase** job. Copying the files is the easy half.

The knowledge base was written against the source project's stack — Angular + NestJS +
Sequelize + PostgreSQL + npm workspaces. Roughly 4,000 of its 7,300 lines name that stack
directly: gate commands, ports, database names, ORM examples, test runners, commit-message
examples. Dropped into a Django or Go project unmodified, it instructs agents to run
`npm run type-check`, and an agent that can't run a gate reports a **false pass**.

So: phase 1 copies, phase 2 rewrites. **An install that stops after phase 1 is not done.**

## Phase 1 — copy

```bash
./detect-stack.sh /path/to/target                    # read the project's real facts first
./install.sh /path/to/target --profile rails --dry-run
./install.sh /path/to/target --profile rails
```

**Check for a matching profile before anything else** (`ls profiles/`). A profile is a
pre-adapted overlay for one stack; using it turns most of phase 2 into a verify pass. Omit
`--profile` only if no profile fits the target.

Confirm the target path with the user if they didn't give one — don't guess. With no path
argument both scripts use the current directory.

`install.sh` reads `manifest.tsv`, which classifies all 44 files into four tiers:

| Tier | Count | Phase 1 behaviour |
| --- | --- | --- |
| `generate` | 2 | **Not copied.** Wholly source-specific; you author them in phase 2. |
| `adapt` | 14 | Copied, then examples and commands rewritten in phase 2. |
| `adapt-light` | 22 | Copied, then commands/paths/framing fixed in phase 2. |
| `portable` | 5 | Copied verbatim. Done. |

It writes the worklist to `<target>/.claude/orchestration/ADAPTATION-TODO.md`, ordered by
priority, each entry naming what is project-specific in that file. Existing target files
are skipped rather than clobbered unless `--force`; report anything skipped.

`.claude/workspace/` is created **empty** (`.gitkeep` only) for the target's own features.

**`workspace/` contents are never copied — do not add them.** The source repo's workspace
holds finished artifacts for features built *there*: execution plans, agent prompts, agent
logs, screenshots (~1.3M in ai-academy, e.g. `workspace/ai-lead-summaries/`). That is
per-project history, not reusable methodology — copying it would plant another project's
decisions and screenshots in this one, and agents reading `workspace/` for prior-feature
context would learn the wrong project's history. The copy loops walk only `commands/*.md`
and `orchestration/**`, so `workspace/` cannot be picked up structurally; the exclusion is
also commented at the workspace step in `install.sh`.

## Phase 2 — adapt

Work `ADAPTATION-TODO.md` top-down. The priorities are dependency-ordered.

**Before editing anything:** run `./detect-stack.sh <target>` and read the output. Also read
the target's `CLAUDE.md`, `AGENTS.md` and `README.md` if present — they may already state
conventions the knowledge base should match rather than contradict.

**Take the gate commands from the target's hooks and CI, not from its scripts.** The
detection output has an "Enforced gates" section for exactly this. `lefthook.yml`,
`.husky/`, `.pre-commit-config.yaml` and `.github/workflows/*` record what the project
actually refuses to merge without; a `scripts` block or Rakefile records only what someone
once wrote down. Where they disagree, CI wins.

**Not every gate exists in every language.** Gate 1 is TypeScript compilation. Ruby, plain
JS and untyped Python have no equivalent, and detection says so explicitly. Do not
substitute a plausible-looking command — an agent that cannot run a gate reports a false
pass, which is worse than four honest gates.

### Priority 1 — the facts everything else cites

1. **`meta/project-profile.md`** — start here. Copy `templates/project-profile.md` into the
   target and fill it in from detection output. This becomes the single source of truth;
   its header declares that it outranks any example elsewhere in the knowledge base. Get
   the gate commands exactly right — read them out of the project's actual scripts.

   **RUN every command and `ls` every path before you write it down.** This file is
   declared authoritative, so an unverified claim in it does more damage than the same
   claim anywhere else. Two failure modes, both observed in real installs:

   - **Copying an aspiration out of `CLAUDE.md` as if it were fact.** A repo's own
     `CLAUDE.md` may mandate `app/lib/<system>/docs/ai/README.md` when no such file exists
     anywhere, and may describe a shallower layout than the code has. Treat `CLAUDE.md`
     as a *claim to check*, not a source. Verify with `ls`/`find`; if a documented path is
     missing, write what is actually on disk and say the documented path does not exist.
   - **Writing the conventional command instead of the working one.** Commands that look
     obviously correct fail in real repos — a lint wrapper already red on `main`, a rake
     task that only exists under an `app:` namespace, a load check that isn't a valid task.
     Run it. Paste what you saw. If it fails on a clean checkout, say so and pick the
     command CI actually enforces.

   Anything you could not verify: mark it **NEEDS CONFIRMATION** rather than asserting it.
2. **`meta/project-mission.md`** — author fresh. The source version is about validating
   orchestration methodology for a course; none of it transfers. Ask the user what the
   project is for if the repo doesn't make it obvious.
3. **`methodology/validation-gates.md`** — the highest-value file in the set. All five gates
   must name commands that actually exist. Point them at `project-profile.md`.
4. **`methodology/environment-validation.md`** — retarget the setup and fresh-clone probes.
5. **`commands/orchestration.md`** — add `meta/project-profile.md` as the first entry in its
   MANDATORY read list. The command has a fixed list of 12 `@`-references and will never
   load the profile unless you put it there. Everything in phase 2 is wasted otherwise.
6. **`commands/validate.md`** — it hardcodes `npm run type-check`, `npm run lint` and
   `npm run dev` in its own validation phases. Retarget them.

### Priority 2 — rewrite the worked examples

Thirteen files whose *method* is portable but whose *examples* are not. Keep the reasoning,
replace the specifics. Two need structural decisions:

- `methodology/database-migration-strategy.md` — **delete it** if the target has no database.
- `playbook/nestjs-patterns.md` — rename to `<framework>-patterns.md` and author fresh, or
  delete if there's no dominant backend framework. Fix `playbook/README.md` to match.

### Priority 3 — light fixes

Twenty-two files needing command swaps, dead-link removal, and de-course-ifying —
including `commands/handoff.md`, whose pre-handoff checklist also hardcodes the npm gates. Also fix two
pre-existing bugs while you're in there — they're wrong in the source too:

- `meta/orchestration-handoff.md` and `meta/working-relationship.md` reference
  `.claude/methodology/...` and `.claude/meta/...`, missing the `orchestration/` path
  segment. Real paths are `.claude/orchestration/methodology/...`.
- `meta/orchestration-handoff.md` advertises 8 agent-prompt templates
  (`nestjs-service-agent.md`, `angular-component-agent.md`, …). Only two shipped. Replace
  that list with what's actually in `templates/agent-prompts/`.

### Working the list

Each priority-2 file is an independent rewrite, so they can be done in parallel — but only
spawn subagents for it if the user asks. Whether serial or parallel, every editor needs the
same two inputs: the detection output and the finished `project-profile.md`.

### Finishing

**Run the verifier.** Every defect class it checks was originally found by a human using
the tool, not by tooling — that is why it exists.

```bash
./verify-install.sh /path/to/target              # read-only
./verify-install.sh /path/to/target --run-gates   # also execute the non-stateful gates
```

It errors (exit 1) on things that actively mislead an agent: a missing or unfilled
`project-profile.md`, a profile that `commands/orchestration.md` never loads, stray
`{{markers}}` outside templates, dead cross-references, named-but-nonexistent template
files, conventions contradicting the profile, and a gate *count* disagreeing with it. It
warns on stale examples and on infrastructure the docs reference but the project lacks
(`docker-compose`, `.env.example`).

Later checks, each added because a human found the defect first:

| § | Catches |
| --- | --- |
| 9 | Bracketed prose sitting where a command belongs (`cd x && [no such gate here]`). Fence *language* decides — `[paste output]` in a ```markdown block is a log placeholder and fine; the same line in ```bash is a fake command. |
| 10 | Gate *names*, not just the count. A gate the profile correctly dropped surviving by name elsewhere, so an agent reports running a tool this project does not have. |
| 11 | A claimed count contradicting reality ("8 prompt templates" when 2 shipped). |
| 11b | A coverage floor contradicting the profile's. An agent that stops at 80% ships work CI rejects at 95%. |
| 12 | Concrete paths the profile asserts that do not exist. It is declared authoritative, so a wrong path there reads as verified fact. |
| 13 | `playbook/` files that duplicate `methodology/` rather than summarising it — the tree's own documented contract. |

Three rules it follows that any addition must keep:

- **A check must not flag the correct fix.** §5 originally grepped for the mere *presence*
  of `camelCase`, so the right correction — "NO camelCase: never `leadId`" — was reported
  as a camelCase mandate forever. Match at line level and exclude negations; §10 needs the
  same treatment for the same reason. A check that stays red after the proper fix teaches
  people to ignore the verifier, which is the failure §8 already warns about for gates.
  Anchor negation words (`[Nn]o` unanchored also matches `--noEmit` and eats real hits).

- **Never mutate the project.** `--run-gates` refuses anything matching
  `db:|migrat|purge|reset|drop|seed|prepare|--fix|--autocorrect`. A "verification" that runs
  `db:test:prepare` can destroy local work.
- **Distinguish "cannot verify" from "gate is red."** If the output shows an unreachable
  database or a missing binary, that is a warning about the environment, not a failing gate.
  A verifier that emits false reds is worse than no verifier.

Then also grep by hand — run from the target:

```bash
grep -rEil 'nestjs|sequelize|angular|npm run|postgres|new_crm|localhost:3000' \
  .claude/orchestration/ .claude/commands/
```

Every hit should be either a deliberate reference to the target's own stack or in a
`portable` file. Then confirm each gate command in `project-profile.md` actually runs, and
delete `ADAPTATION-TODO.md`.

**Also check for contradictions between the profile and the base files.** Substitution is
per-phrase, so a convention stated 30 different ways survives in the 29 phrasings you
didn't anticipate. The base knowledge base mandates `camelCase` for API fields in ~30
places; a Rails profile that declares `snake_case` in the profile leaves an agent to obey
whichever file it reads first. Grep the convention itself, not the phrasing you fixed:

```bash
grep -rn 'camelCase\|snake_case' .claude/orchestration/ | grep -v project-profile
```

`install.sh` also prints an **unfilled-marker report** per file at the end of every install.
Files flagged `MUST FIX` are not templates — a `{{...}}` or `$DB_NAME` there reads as a
real value. Do not consider phase 2 done while any remain.

## Also tell the user

- **`/handoff` may collide** with an existing `handoff` skill or command in `~/.claude/`.
  Project commands normally win, but flag it.
- **`.claude/workspace/`** fills with per-feature artifacts and screenshots. Ask whether
  they want it gitignored.

## Keeping an install local-only (personal workflow, shared repo)

Default assumption for a work repo: the user does **not** want to commit this. Ask before
touching a tracked `.gitignore` — that is itself a team-visible change.

Use the **global** ignore (`git config --global core.excludesFile`, often `~/.gitignore`):

```
.claude/orchestration/
.claude/workspace/
.claude/commands/orchestration.md
.claude/commands/handoff.md
.claude/commands/validate.md
```

**File-level patterns for the commands are not optional.** Many repos already carry
`.claude/*` plus `!.claude/commands/` so the team can share project commands. A *directory*
pattern in the global file loses to that negation; a *file* pattern does not, because
`!.claude/commands/` has a trailing slash and therefore only ever matches the directory.
Verify per repo rather than trusting precedence:

```bash
git check-ignore -v .claude/commands/orchestration.md
```

`.git/info/exclude` works identically and is per-repo; prefer the global file when the user
installs into several projects.

**Do not install `commands/README.md`.** `README.md` is too generic a name to put in a
global ignore — it would hide a real project file. Install the command documentation as
`orchestration/COMMANDS.md`, which `.claude/*` already covers.

**`git clean -xfd` deletes exactly this.** Ignored files are its target, and phase-2 work is
hand-authored and not regenerable. `install.sh` now detects the situation itself:

```bash
git -C "$TARGET" check-ignore -q .claude/orchestration
```

- **Tracked** → git already provides durability. The installer says so and does nothing. Do
  not add a second mechanism; it is redundant noise.
- **Ignored** → the installer reports that nothing is tracked, and names the ignore rule.
  Re-run with `--with-backup` to act on it.

`--with-backup` sets up, all opt-in:

1. `~/.claude/orchestration-installs/<project>/` as a **git repo** — every sync is a commit,
   so `git log`/`git diff`/rollback all work. Not date-stamped copies: on a per-change
   trigger those multiply and need a pruning policy. The working tree stays a plain
   directory, so `cp -R` restore instructions keep working.
2. `sync-install-backup.sh` copied to `~/.claude/orchestration-installs/`.
3. Three hooks in the target's **`.claude/settings.local.json`** — gitignored by convention,
   and the `.local.` name keeps it personal if `.claude/` is ever un-ignored.

**Why three hooks and not just the obvious one.** `PostToolUse` on `Write|Edit` is the
precise event and is *not sufficient*: edits driven through Bash (a `sed` run, a python
heredoc, `install.sh` itself) never fire it, nor do edits made outside Claude Code. Measured,
not assumed — a 51-edit KB correction pass done via python heredocs fired it zero times.
`SessionStart` and `SessionEnd` close that hole. The script commits only on a real content
difference, so the overlap costs nothing.

**Health guard.** The script refuses to mirror a damaged install over a **non-empty** backup,
in two cases: the source has fewer than 30 files, or the backup holds
`meta/project-profile.md` and the source no longer does. A first run has nothing to lose and
proceeds, which matters because `project-profile.md` does not exist until phase 2 or a
profile supplies it. Net effect: `git clean -xfd` produces a loud alert naming the restore
command, not a silently emptied backup.

**Not backed up: `.claude/workspace/`.** Per-repo scratch — execution plans, agent logs,
retrospectives. Different lifetime from install state. Say so rather than leaving it implicit.
- **Re-running** is safe and idempotent. Phase-2 edits are protected — a re-run skips
  modified files unless `--force`, which would discard the adaptation work.
- **A pre-existing `.claude/`** in the target is left alone; the installer only adds files.
  Detection lists what's already there so you can spot commands that overlap with these.

## Profiles

`profiles/<name>/` holds a stack's pre-adapted knowledge base. `--profile <name>` applies it
after the base copy, in four steps:

1. **`substitutions.sed`** — literal command/tool swaps across every `adapt` and
   `adapt-light` file (`npm run lint` → `bin/rubocop`, Jest → RSpec, …).
2. **`files/`** — files rewritten wholesale for the stack, overlaid on the copy.
3. **`remove.txt`** — deletes base files the profile supersedes under another name, so two
   contradictory versions never coexist.
4. **`manifest-overrides.tsv`** — retiers the worklist so `ADAPTATION-TODO.md` shows only
   what the profile could not do.

**`rails` exists today.** It closes 6 worklist items outright — validation gates,
ActiveRecord migration strategy, Rails agent roles, RSpec standards, a Rails patterns
playbook, an RSpec testing-agent template — and pre-swaps commands in 32 more files. Nine
priority-2 items remain, because substitution fixes *commands* and not *prose*: a file can
end up reading "tsconfig.json compiles project: `bin/rails zeitwerk:check` returns 0
errors". Confident-sounding nonsense is the failure mode to watch for, which is why those
files stay on the list and why the residue check greps for `tsconfig`/`typescript` too.

**A profile still doesn't know the project.** `meta/project-profile.md` and
`meta/project-mission.md` arrive as stack-shaped templates full of `{{placeholders}}`.
Filling them is priority 1. **An unfilled `{{placeholder}}` reaching an agent is worse than
an obviously-wrong Node command** — it looks filled in.

To add a stack, mirror `profiles/rails/`. `--profile <name>` picks it up with no code change.

### Gotcha for profile authors

**BSD sed (macOS) does not support `\b`.** A rule like `s|\bJest\b|RSpec|g` silently
matches nothing — no error, no output, just a no-op. Use unanchored patterns for names
distinctive enough to be safe, and always verify a new rule fires:

```bash
printf 'NestJS and Jest\n' | sed -f profiles/<name>/substitutions.sed
```

## Non-Node targets

The knowledge base is Node/TypeScript prose, so phase 2 is heavier the further the target
sits from that. Detection covers Node, Ruby/Rails, Python, Go and Rust, and reports project
*shape* as well as stack — Rails engine vs app, `spec/dummy`, appraisal version matrices,
`db/data` data migrations — because those change what the gates mean, not just their names.

If most targets share a stack, it is worth adapting the knowledge base **once** into a
reusable overlay under `profiles/<stack>/` here rather than re-doing 35 files per install.
Raise that with the user; don't build it unasked.
