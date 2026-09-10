---
name: install-orchestration
description: Install the ai-academy orchestration slash commands (/orchestration, /handoff, /validate) into another project, then write the two files that describe that project and retarget the commands. Use when the user wants to set up, install, copy, port or bootstrap the orchestration tooling in a new or existing project.
argument-hint: "[path to target project] [--profile NAME] [--examples NAME|none] [--force] [--dry-run] [--with-backup]"
---

# Install orchestration tooling into a project

The knowledge base is split into a portable half and a stack-specific half, and the
installer's whole job is to keep them apart.

- **`orchestration/core/`** — 34 files, 9,715 lines, and **zero** occurrences of
  `nestjs|angular|sequelize|npm run|npx |typescript|tsconfig|jest|vitest|eslint|prisma|
  package.json|localhost:3000|postgres|docker`. Copied verbatim into every project. There
  is nothing in it to rewrite; that is a checkable property, not a claim.
- **`orchestration/examples/<stack>/`** — one stack's worked instances of that method.
  Installed only if it matches the target. `examples/node/` is 19 files, 3,553 lines.

So the install copies a lot and adapts almost nothing. What is left over is small and
sharply defined: **two files nobody but you can write.** That is the whole of phase 2.

It used to also include two files that named the source repo. Once the fork became the
source of truth, the course framing was stripped out of `orchestration/README.md` and
`commands/README.md` at the source instead of in every install, and those rows left the
manifest. What is left is irreducible: a profile and a mission are per-project by
definition, and no installer can write them for you.

The three command files used to be in that list — they hardcoded the source's npm gates.
They now defer to `meta/project-profile.md` instead, so they are copied verbatim like
everything else. Verified by grep against the install source, not assumed: `npm run|npm
test|npx ` and `nestjs|angular|typescript|eslint` both return nothing across
`commands/`.

## Principles

There are two goals, and both are load-bearing.

**Correctness.** Not "the files are copied" but **an install where every command runs, every
fact holds, and every claim is one this project can honour** — because the consumer is an
agent that will act on the text and cannot smell wrongness the way you can.

**Invisibility.** A common reason to install this is **personal use inside a team that has
not adopted it.** That only works if the install leaves *no git trace*: an
`orchestration/` tree appearing in someone's PR is a social event, not just noise. The
install must be adoptable by one person without becoming a team decision they did not ask
for.

These are ordered: each beats the ones below it when they conflict. Check a change against
them before shipping it.

**1. Truthfulness over completeness.** A documented gap beats a plausible guess. If no
examples pack exists for the target's stack, none is installed and the TODO says so — the
`examples/<stack>/…` pointers in core/ then point at nothing, which is a visible gap
rather than a wrong answer. An unfilled `{{placeholder}}` is worse than a wrong command,
because it looks filled in.

**2. Never destroy the irreplaceable.** The generic KB regenerates in one command;
`meta/project-profile.md`, `meta/project-mission.md` and the retargeted commands do not.
Hence the `author` tier that is never copied, and the staging/`.install-manifest`
reconcile. A stale file that is yours beats a fresh one that overwrote your work — you can
fix the first.

This is also why the two authored files live in `orchestration/meta/`, a sibling of
`core/`, and not inside it. **A file that differs in every project cannot live in a tree
whose entire value is being identical in every project.** Keeping them apart is what makes
`diff -r core/ <source>/core/` an empty diff, and that emptiness is the only proof that
core really is portable.

**3. A visible gap beats an invisible guess.** The installer performs no rewriting at all.
Where the source names its own repo — one `/course/` link and the course framing around it
in `orchestration/README.md`, two `.claude/curriculum/` lines in `COMMANDS.md` — the file
is copied unchanged and the verifier reports what it can see. Leaving `npm run typecheck`
in a sentence would be *correct* too: the check warns and a human decides. Converting it
to something Ruby-flavoured that nobody can run is not.

**4. Rewrite whole claims, not tokens.** A half-translated sentence is a *new* falsehood, not
a smaller one. This used to be advice for `substitutions.sed`, which produced three
adjacent lines mandating snake_case, forbidding snake_case, then giving camelCase
examples, and turned `npx tsc --noEmit` into `bundle exec tsc --noEmit`. **That file is
gone** — a portable core has nothing to substitute in. The principle now governs phase 2:
when you retarget `commands/validate.md`, replace the sentence, not the command inside it.

**5. Verify by executing, not by convention.** `project-profile.md` is filled from `ci.yml`
and the hook config with every command actually run — which is how it knows `bin/linter` is
red and `bin/rubocop` is the real gate. Corollary: **a check already red on a clean checkout
is not a gate**, because it teaches people to ignore gates.

**6. Encode each human-found defect as a check.** `verify-install.sh` exists to convert
experience into automation; every section in it started as something a person hit while
using the tool. Adding the check matters more than fixing the one instance. A corollary
found while adapting it to the split layout: **a check pointed at a directory that moved
reports "ok" about a tree it never looked in**, which is worse than no check. `$KB`
resolves `core/` if present so §4, §11 and §13 cannot go quietly inert.

**7. Do not plant another project's history.** `workspace/`, `meta/session-handoffs/` and
`core/meta/project-mission.md` are excluded: the source's decisions, blockers and reason
for existing all read as facts about the target. §3b catches the same class in link form —
`/course/guidebook/chapters/05-sub-agents.md` is a real file in ai-academy and nowhere
else, and an agent that follows it learns this project has a curriculum.

**8. Phase 1 alone is not done — but it is now most of the way.** Before the split, roughly
4,000 of 7,300 lines named the source stack and 33 files needed hand work. Measured against
the split KB in a throwaway Rails repo (`git init` + a `Gemfile`, `--profile rails`):
**2 worklist items, 1 verifier error, 2 warnings**, and no non-template residue at all.
Re-measure rather than quoting this: the numbers were 9/8/6, then 4/2/3, and each drop came
from fixing something at the source rather than in every install. A stale count here is the
same defect §11 of the verifier exists to catch.

**9. Every artifact must be ignorable, and the installer must prove it.** This is how the
invisibility goal is enforced rather than hoped for. Any new file the install writes —
`.install-manifest`, `*.new`, hooks in `settings.local.json` — widens the surface that has
to stay hidden, so the installer checks *every path it wrote* against `git check-ignore`
and reports what leaks. **Say "every path" and mean it:** the manifest does not list
itself and cannot list a `*.new`, so both were being skipped until the check was made to
enumerate them explicitly.

Checking one directory is not enough, and assuming is worse. `.claude/*` plus
`!.claude/commands/` is a widespread pattern: the negation re-exposes the three command
files while `.claude/orchestration` still reports as ignored. The installer used to check
only that directory and print "nothing you just installed is tracked" — false, in the most
common team configuration, and a violation of principle 1 by the tool itself.

### The tension this accepts, deliberately

Principles 1 and 3 cost completeness. A fresh install arrives with verifier errors, and
that is the *intended* state — the alternative is an installer guessing. **The KB is
designed to arrive visibly unfinished rather than invisibly wrong.** That is also why
`verify-install.sh` matters more than `install.sh`: the installer cannot finish the job, so
the verifier has to make the unfinished parts impossible to miss.

## Phase 1 — copy

**Pin the source to a branch first.** The split KB is not on every branch, and by default
the installer reads `../../` — whatever the ai-academy checkout happens to have right now.
That makes the install depend on a `git checkout` in a repo someone is working in, and it
is the same hazard that ruled out symlinking a shared `core/`: what gets installed must
not be changeable by unrelated work. Use a worktree, which is cheap and cannot be moved by
a checkout elsewhere:

```bash
cd /path/to/ai-academy
git worktree add /tmp/aia-src install-source/neutralised-core
export AI_ACADEMY_CLAUDE=/tmp/aia-src/.claude
```

`install-source/neutralised-core` is the install source: the core/examples split with the
source project's course framing stripped out of `core/`. It is deliberately not the branch
offered upstream — see § Profiles. Remove the worktree with
`git worktree remove /tmp/aia-src` when you are done.

The installer prints the source's branch and commit on every run, and warns when the
source tree has uncommitted or untracked files under `orchestration/` or `commands/`
(untracked files there are exactly how another project's session notes get copied in).
If it cannot find `orchestration/core/` it refuses and prints the worktree commands.

```bash
./detect-stack.sh /path/to/target                    # read the project's real facts first
./install.sh /path/to/target --profile rails --dry-run
./install.sh /path/to/target --profile rails
```

Confirm the target path with the user if they didn't give one — don't guess. With no path
argument both scripts use the current directory.

**Check for a matching profile first** (`ls profiles/`). A profile is now two things and
nothing else: a stack-shaped `project-profile.md` (and optionally `project-mission.md`) so
you fill in Rails-shaped blanks rather than generic ones, and an `examples/` pack.

Everything the installer touches lands in one of three buckets:

| Bucket | Count | Behaviour |
| --- | --- | --- |
| copied verbatim | 48 | `core/`, the READMEs, the three commands, one examples pack |
| `author` | 2 | **Not copied.** `meta/project-profile.md`, `meta/project-mission.md`. |
| `retarget` | 0 | Nothing in the copied tree names another project any more. |

48 is the count with a 7-file pack (`--profile rails`); 41 with no pack, 60 with
`examples/node/`. `install.sh --dry-run` prints the real number for the run you are about
to do — read that instead of trusting this row.

`manifest.tsv` lists **only** the `author` and `retarget` rows — the residue. Anything not
in it is copied, because after the split there is nothing left to classify. The worklist
goes to `<target>/.claude/orchestration/ADAPTATION-TODO.md`.

**Which examples pack.** By default the installer picks the pack matching the target's
detected stack, and installs none if there isn't one — that is a normal state, not a
failure, because `core/` is complete alone. Override with `--examples <name>` or
`--examples none`. Installing the *wrong* pack is the failure the split exists to prevent:
20 files of Node commands in a Rails repo read as instructions, not illustrations, and
`verify-install.sh` §6 warns when an installed pack does not match the stack.

`.claude/workspace/` is created **empty** (`.gitkeep` only) for the target's own features.

**`workspace/` contents are never copied — do not add them.** The source repo's workspace
holds finished artifacts for features built *there*: execution plans, agent prompts, agent
logs, screenshots (~1.3M in ai-academy). That is per-project history, not reusable
methodology — copying it would plant another project's decisions in this one, and agents
reading `workspace/` for prior-feature context would learn the wrong project's history.
The copy loops walk only `commands/*.md` and `orchestration/**`, so `workspace/` cannot be
picked up structurally; the exclusion is also commented at the workspace step in
`install.sh`. `meta/session-handoffs/` is excluded for the same reason.

## Phase 2 — the two things

Work `ADAPTATION-TODO.md` top-down. **Before editing anything:** run
`./detect-stack.sh <target>` and read the output. Also read the target's `CLAUDE.md`,
`AGENTS.md` and `README.md` if present — they may already state conventions the knowledge
base should match rather than contradict.

**Take the gate commands from the target's hooks and CI, not from its scripts.** The
detection output has an "Enforced gates" section for exactly this. `lefthook.yml`,
`.husky/`, `.pre-commit-config.yaml` and `.github/workflows/*` record what the project
actually refuses to merge without; a `scripts` block or Rakefile records only what someone
once wrote down. Where they disagree, CI wins.

**Not every gate exists in every language.** Gate 1 is a static type or compile check.
Ruby, plain JS and untyped Python have no equivalent, and detection says so explicitly. Do
not substitute a plausible-looking command — an agent that cannot run a gate reports a
false pass. `core/methodology/validation-gates.md` handles this properly: **keep the gate
in the table and record that this project has no command for it.** Deleting the row makes
the absence invisible in the log; deleting it *and* leaving the other files saying "5
gates" makes the KB contradict itself.

### 1. `meta/project-profile.md` — start here

Everything else defers to it. Fill it from detection output.

**RUN every command and `ls` every path before you write it down.** This file is declared
authoritative, so an unverified claim in it does more damage than the same claim anywhere
else. Two failure modes, both observed in real installs:

- **Copying an aspiration out of `CLAUDE.md` as if it were fact.** A repo's own `CLAUDE.md`
  may mandate `app/lib/<system>/docs/ai/README.md` when no such file exists anywhere, and
  may describe a shallower layout than the code has. Treat `CLAUDE.md` as a *claim to
  check*, not a source. Verify with `ls`/`find`; if a documented path is missing, write
  what is actually on disk and say the documented path does not exist.
- **Writing the conventional command instead of the working one.** Commands that look
  obviously correct fail in real repos — a lint wrapper already red on `main`, a rake task
  that only exists under an `app:` namespace, a load check that isn't a valid task. Run it.
  Paste what you saw. If it fails on a clean checkout, say so and pick the command CI
  actually enforces.

Anything you could not verify: mark it **NEEDS CONFIRMATION** rather than asserting it.

### 2. `meta/project-mission.md` — author fresh

The template is a skeleton of questions, not a draft. The upstream version is about
validating orchestration methodology for a course; none of it transfers. Ask the user what
the project is for if the repo doesn't make it obvious.

### What used to be items 3 and 4

`orchestration/README.md` and `COMMANDS.md` carried the source project's course framing —
a `/course/guidebook/…` link, three lines of prose, and two `.claude/curriculum/` references.
Every install fixed the same lines by hand, and the prose ones were invisible to
`verify-install.sh` §3b and to the residue grep because there is no slash after "course".

**Stripped at the source instead.** If you find framing like this again, fix it in the
knowledge base rather than in the install: a defect in a copied tree is a defect in every
copy of it, and the ones no check can see are exactly the ones that survive install after
install.

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
| 3b | Root-absolute paths that resolve only in the source repo (`/course/guidebook/...`). §3 followed `.claude/orchestration/*.md` refs and never saw these. |
| 9 | Bracketed prose sitting where a command belongs (`cd x && [no such gate here]`). Fence *language* decides — `[paste output]` in a ```markdown block is a log placeholder and fine; the same line in ```bash is a fake command. |
| 10 | Gate *names*, not just the count. A gate the profile correctly dropped surviving by name elsewhere, so an agent reports running a tool this project does not have. |
| 11 | A claimed count contradicting reality ("8 prompt templates" when 2 shipped). |
| 11b | A coverage floor contradicting the profile's. An agent that stops at 80% ships work CI rejects at 95%. |
| 12 | Concrete paths the profile asserts that do not exist. It is declared authoritative, so a wrong path there reads as verified fact. |
| 13 | `playbook/` files that duplicate `methodology/` rather than summarising it — the tree's own documented contract. |

Four rules it follows that any addition must keep:

- **A check must not flag the correct fix.** §5 originally grepped for the mere *presence*
  of `camelCase`, so the right correction — "NO camelCase: never `leadId`" — was reported
  as a camelCase mandate forever. Match at line level and exclude negations. Anchor
  negation words (`[Nn]o` unanchored also matches `--noEmit` and eats real hits). Three
  more instances of the same trap surfaced against the split KB: §2 flagged `{{ message() }}`
  and `${{ secrets.X }}` in a worked example, which are Angular and GitHub Actions syntax
  and correct as written; §6 flagged an examples pack for naming the stack it is *for*; and
  §10 flagged `bundle exec srb tc` on a line whose own prose said "if the project has
  Sorbet". A check that stays red after the proper fix teaches people to ignore the
  verifier, which is the failure §8 already warns about for gates.
- **A check must not go inert.** Anything naming a subdirectory goes through `$KB`, which
  resolves `core/` when it exists. A check silently inspecting an empty glob prints `ok`.
- **Never mutate the project.** `--run-gates` refuses anything matching
  `db:|migrat|purge|reset|drop|seed|prepare|--fix|--autocorrect`. A "verification" that runs
  `db:test:prepare` can destroy local work.
- **Distinguish "cannot verify" from "gate is red."** If the output shows an unreachable
  database or a missing binary, that is a warning about the environment, not a failing gate.
  A verifier that emits false reds is worse than no verifier.

Then also grep by hand — run from the target:

```bash
grep -rEin 'npm run|nestjs|angular|sequelize|course/|curriculum|\{\{' \
  .claude/orchestration/ .claude/commands/ | grep -v orchestration/examples/
```

Every hit should be either a deliberate reference to the target's own stack or in the
installed examples pack. Then confirm each gate command in `project-profile.md` actually
runs, and delete `ADAPTATION-TODO.md`.

**Contradictions between the profile and the base files** are now rare but not zero.
`core/` still mandates `camelCase` for shared API fields in three places — an upstream
leak of a stack convention into the portable tree — so a Rails profile declaring
`snake_case` leaves an agent to obey whichever file it reads first. §5 catches it; grep the
convention itself, not the phrasing you fixed:

```bash
grep -rn 'camelCase\|snake_case' .claude/orchestration/ | grep -v project-profile
```

`install.sh` also prints an **unfilled-marker report** per file at the end of every install.
Files flagged `MUST FIX` are not templates — a `{{...}}` or `$DB_NAME` there reads as a
real value. Do not consider phase 2 done while any remain. Padded braces (`{{ x }}`) and
`${{ ... }}` are excluded: measured across the whole KB, every one of ours is unpadded and
both padded occurrences are foreign template syntax inside worked examples.

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
global ignore — it would hide a real project file. The installer lands the command
documentation as `orchestration/COMMANDS.md`, which `.claude/*` already covers.

**`git clean -xfd` deletes exactly this.** Ignored files are its target, and phase-2 work is
hand-authored and not regenerable. `install.sh` detects the situation itself:

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
3. Three hooks in the target's **`.claude/settings.local.json`**. The `.local.` name keeps
   it personal if `.claude/` is ever un-ignored — but **do not assume it is ignored.**
   Measured in `intake-system`: a repo with no `.claude` rules of its own does **not**
   ignore it, and the global patterns for `orchestration/`, `commands/` and `workspace/`
   do not cover it either. Writing it there puts an untracked file in `git status` and
   undoes the invisibility goal. `install.sh`'s git-trace check reports the leak, but the
   fix belongs in the ignore file *before* the run:

   ```bash
   git -C <target> check-ignore -v .claude/settings.local.json   # check FIRST
   ```

   Add `.claude/settings.local.json` to the same global ignore as the rest.

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
command, not a silently emptied backup. Verified against the split KB: deleting `core/`
leaves 17 files and the sync aborts, naming the 51-file backup.

**Backed up: `orchestration/`, the three commands, and `settings.local.json`.** That last
one is not obvious and was missed at first. The hooks file is gitignored like everything
else, so `git clean -xfd` deletes it too — and it is what *drives* the backup. Restoring the
knowledge base while leaving the hooks dead looks like a full recovery, and from then on the
mirror is silently never updated again. It is copied if present and **never deleted from the
backup** when the source lacks one: that state is either a deliberate opt-out or the exact
disaster this exists for, and keeping the copy is right either way. It holds absolute paths,
so it restores to the same location and needs regenerating anywhere else.

**Not backed up: `.claude/workspace/`.** Per-repo scratch — execution plans, agent logs,
retrospectives. Different lifetime from install state. Say so rather than leaving it implicit.

- **Re-running is safe.** The installer builds the complete expected install in a staging
  directory first, then reconciles it file by file against the target. Nothing is touched
  until every phase has succeeded, and each file lands in one of four states:

  | State | Meaning | Action |
  | --- | --- | --- |
  | new | not in the target | installed |
  | already current | byte-identical to what a pristine install produces | nothing |
  | updated | matches the hash we last wrote, so you never edited it | overwritten |
  | **kept local** | differs from what we last wrote — you adapted it | **yours kept; the new version lands as `<file>.new`** |

  `--force` overrides all of it and discards your version.

  Provenance lives in `orchestration/.install-manifest` (sha256 per file, as the installer
  last wrote it). An install that predates the manifest seeds itself: any file still
  byte-identical to pristine output is provably untouched and gets recorded; everything
  else is treated as localised and protected.

  After a re-run, review what it held back:

  ```bash
  find .claude -name '*.new'
  ```

- **A pre-existing `.claude/`** in the target is left alone; the installer only adds files.
  Detection lists what's already there so you can spot commands that overlap with these.

## Profiles

`profiles/<name>/` is a stack's *starting shapes*, not a translation layer:

- **`project-profile.md`**, and optionally **`project-mission.md`** — the two authored
  files, pre-shaped for the stack, so you are filling Rails-shaped blanks rather than
  generic ones. Still full of `{{placeholders}}`; filling them is the job.
- **`examples/`** — a worked-instance pack, installed as
  `.claude/orchestration/examples/<name>/`.

**`rails` exists today.** It ships six worked-instance files (Rails validation gates
including the honest "Ruby has no type gate" reasoning, ActiveRecord migration strategy,
Rails agent roles with the shared-file ownership table, an RSpec standards checklist, a
Rails patterns file, an RSpec testing-agent prompt) plus a Rails-shaped profile template.

**What a profile no longer does.** It used to run `substitutions.sed` — 115 literal
command swaps across 36 files — and overlay six rewritten copies of core files. Both
existed only because the knowledge base was Node prose that had to be translated on the way
in. `core/` has no stack token in it, so there is nothing to translate. **Deleting the
translator deletes the whole class of half-translated-claim bugs with it**: "tsconfig.json
compiles project: `bin/rails zeitwerk:check` returns 0 errors" cannot be produced by an
installer that does not edit text. The six overlay files were not deleted — they became the
Rails pack, which is where stack-specific writing belongs now.

To add a stack, mirror `profiles/rails/`. `--profile <name>` picks it up with no code
change. If you have only worked examples and no profile template, contribute the pack
upstream as `.claude/orchestration/examples/<stack>/` instead — the installer finds a pack
there by detected stack with no profile at all, and it then benefits every install rather
than only the ones that remember the flag.

## Non-Node targets

Detection covers Node, Ruby/Rails, Python, Go and Rust, and reports project *shape* as
well as stack — Rails engine vs app, `spec/dummy`, appraisal version matrices, `db/data`
data migrations — because those change what the gates mean, not just their names. Read it
before filling in `project-profile.md`.

The old advice here was that phase 2 gets heavier the further the target sits from Node,
and that with several same-stack targets it is worth building a profile. **The first half
is no longer true** — core/ is equally correct for all of them, and the residue is the same
four items regardless of stack. The second half is: if you install into several projects in
one stack, write the examples pack once. A pack is worth more than a profile, because it
travels with the knowledge base instead of with this skill.
