# ai-academy — personal fork

A fork of [charltonaustin/ai-academy](https://github.com/charltonaustin/ai-academy), refactored
so the orchestration knowledge base can be installed into unrelated projects.

Upstream is a 5-day course that teaches AI agent orchestration by building a CRM. Its knowledge
base is excellent and entangled with the course's own Node/Angular stack. This fork separates
the two: a portable **`core/`** that names no technology, plus per-stack **`examples/`** packs,
and a skill that installs them into any repository.

The upstream maintainer reviewed this work and chose not to merge it, so **this fork is the
source of truth.** Upstream remains a tracked remote; see *Pulling upstream changes*.

---

## The arrangement

One clone, two working directories, and any number of unrelated product repos.

```
ONE CLONE: ~/Documents/kin/repos/ai-academy        (all branches and history live here)
│
├── worktree: ai-academy/          branch: course
│     Following the course. apps/api + apps/web + course/guidebook, and the
│     original flat knowledge base the course material actually describes.
│     Nothing installs into or out of this.
│
└── worktree: ai-academy-main/     branch: main          ← THE TOOLBOX
      The refactored knowledge base and the install skill. You edit the method
      here. You do not build product here.
                  │
                  │   ./install.sh <target>
                  ▼
   SEPARATE REPOSITORIES, where the work actually happens:
      intake-system · dot-com · product-api · administered-policies
      each gets its own copy of core/, the three commands, and a stack pack
```

`ai-academy-main/.git` is a file, not a directory — it points back into the one clone. Branches,
commits and remotes are shared; two folders, one repository.

**Product development never happens in either worktree.** The toolbox is where the method
lives; the product repos are where it gets used, and improvements flow back (see *Promoting a
learning*).

---

## Following the course

The course lives on the `course` branch, checked out at `~/Documents/kin/repos/ai-academy`.

```bash
cd ~/Documents/kin/repos/ai-academy
git branch --show-current        # course
open course/guidebook/           # start at companion/day-1/tools-setup.md
```

That branch deliberately keeps the **original flat knowledge base** — `.claude/orchestration/`
with `playbook/`, `methodology/`, `templates/` at the top level, no `core/`. The guidebook
references those paths, so the material matches the tree. `apps/api` and `apps/web` are there
with `node_modules` already installed.

**Do not install the refactored KB into the course worktree** unless you want the material to
stop matching what you see. Having one place where the original structure survives is useful
for comparison.

---

## Installing into a new project

Run everything from the toolbox. There is no `AI_ACADEMY_CLAUDE` to set — the skill finds its
own checkout.

```bash
cd ~/Documents/kin/repos/ai-academy-main/.claude/skills/install-orchestration

./detect-stack.sh /path/to/target       # read the project's real facts FIRST
./install.sh /path/to/target --profile rails --dry-run
./install.sh /path/to/target --profile rails --with-backup
./verify-install.sh /path/to/target
```

**Before you run it, check the install will stay invisible.** Most installs are personal and
should leave no git trace. Probe a *nested* path — a directory pattern does not match a
directory that does not exist yet, so probing the bare directory lies:

```bash
git -C /path/to/target check-ignore -v .claude/orchestration/README.md
git -C /path/to/target check-ignore -v .claude/settings.local.json
```

These belong in your global ignore (`git config --global core.excludesFile`):

```
.claude/orchestration/
.claude/workspace/
.claude/settings.local.json
.claude/commands/orchestration.md
.claude/commands/handoff.md
.claude/commands/validate.md
```

The file-level command patterns are not optional: many repos carry `.claude/*` plus
`!.claude/commands/`, and a directory pattern loses to that negation while a file pattern
does not.

### Then phase 2 — the two files nobody else can write

A fresh install arrives **deliberately unfinished**: 2 worklist items, 1 verifier error. That
is the intended state, not a failure. The worklist is at
`<target>/.claude/orchestration/ADAPTATION-TODO.md`.

1. **`meta/project-profile.md`** — the authoritative record of this project. **Run every
   command and `ls` every path before writing it down.** Take gate commands from CI and hooks,
   not from a scripts block; where they disagree, CI wins. Mark anything unverified
   `NEEDS CONFIRMATION` rather than asserting it.
2. **`meta/project-mission.md`** — what the project is for. Ask if the repo does not say.

Delete `ADAPTATION-TODO.md` when both are done, then re-run `verify-install.sh`. Expect
0 errors; remaining warnings are usually stale examples worth reading but not blocking.

---

## Promoting a learning back to main

The point of the arrangement. You improve the method while doing real work in a product repo;
that improvement should reach every other project rather than staying where it was written.

**1. Ask what diverged.** `promote.sh` reports; it never writes.

```bash
cd ~/Documents/kin/repos/ai-academy-main/.claude/skills/install-orchestration
./promote.sh /path/to/project [/path/to/another ...]
```

It reads the install manifest, walks the tree for files the manifest never recorded,
compares each one against the **current** source, applies the path mapping for the one file
install.sh renames (`orchestration/COMMANDS.md` comes from `commands/README.md`), sorts
everything into the tiers below, and runs the portability gate on `core/` candidates. Output
is one of:

| Line | Meaning |
| --- | --- |
| `PROMOTE` | a real candidate — read the diff and decide |
| `BLOCKED` | a `core/` candidate that names a stack or the project; belongs in `examples/<stack>/` |
| `deleted` | removed locally; decide deliberately rather than promoting a deletion by accident |
| `already in the source` | **this install is behind.** Re-run `install.sh`, do not promote |
| `per-project file(s) ignored` | profile, mission, workspace, session handoffs — never promotable |
| `SKIPPED` | no manifest, so divergence cannot be computed. Says so rather than reporting "clean" |

The distinction that matters most is `PROMOTE` versus `already in the source`. A file the
project changed *and* the source already has is not a learning waiting to move — it is an
install that has fallen behind, and the fix runs the other way.

**2. Classify every changed file. This is a judgement call, not a script.**

| Path | Promotable? |
| --- | --- |
| `orchestration/core/**` | **Yes, if it passes the portability gate** below |
| `orchestration/examples/<stack>/**` | Yes, to that pack only |
| `commands/*.md` | Yes — these are meant to be byte-identical everywhere |
| `orchestration/meta/project-*.md` | **Never.** Per-project by definition |
| `workspace/**` | **Never.** That project's own history |

**An over-eager promotion is worse than none.** Push one project's specifics into `core/` and
every project inherits a wrong fact. `core/`'s entire value is being identical *and correct*
everywhere.

**3. Run the portability gate before committing anything to `core/`:**

```bash
cd ~/Documents/kin/repos/ai-academy-main
grep -rliE 'nestjs|angular|sequelize|npm run|npx |typescript|tsconfig|jest|vitest|eslint|prisma|package\.json|localhost:3000|postgres|docker' \
  .claude/orchestration/core --include='*.md'     # must return nothing
grep -rliE 'dot-com|intake-system|packwerk|subsystem' \
  .claude/orchestration/core .claude/commands --include='*.md'   # must return nothing
```

Also check the file is actually reachable — an orphan in `core/` is dead weight:

```bash
grep -rn 'your-new-file' .claude/orchestration/core --include='*.md'
```

**4. Commit to `main` and push.** Staging needs care: `.claude/orchestration/` is globally
ignored, so new files need `-f`, and **`git add -f .claude/orchestration` has swept in
contamination before.** Stage explicit paths only:

```bash
git add -f .claude/orchestration/core/methodology/your-file.md
git diff --cached --name-status     # every entry must be intended
git commit && git push fork main
```

**5. Fan out.** Re-run the install in the other projects (below).

Not every lesson shows up as a file diff. "A gate must be read-only" was rediscovered in three
projects before anyone wrote it down — the signal was noticing *I have written this before*,
which no tool will surface for you.

---

## Updating an existing install

```bash
cd ~/Documents/kin/repos/ai-academy-main/.claude/skills/install-orchestration
./install.sh /path/to/target --profile rails
```

Re-running is safe. Every file lands in one of four states:

| State | Meaning |
| --- | --- |
| already current | byte-identical to a pristine install — untouched |
| updated | matches the hash we last wrote, so you never edited it — overwritten |
| **kept local** | you edited it — **yours is kept**, the new version lands as `<file>.new` |
| new | did not exist before — installed |

Then reconcile deliberately:

```bash
find /path/to/target/.claude -name '*.new'
```

Diff each one. Your `project-profile.md` and `project-mission.md` should always be **kept
local** — discard those `.new` templates. For copied files you had hand-edited, the new version
is usually better, and taking it keeps the file byte-identical to source so future updates
apply cleanly instead of forking a `.new` every time.

`--force` overrides all of this and discards your versions. It is almost never what you want.

---

## Backups

An install is gitignored, which means `git clean -xfd` destroys it — including the two authored
files, which are not regenerable. `--with-backup` sets up a git-versioned mirror at
`~/.claude/orchestration-installs/<project>/` plus three hooks that keep it current.

```bash
git -C ~/.claude/orchestration-installs/<project> log --oneline
bash ~/.claude/orchestration-installs/sync-install-backup.sh /path/to/target <project>
```

Backed up: `orchestration/`, the three commands, and `settings.local.json` (the hooks file is
gitignored too, and without it the mirror silently stops updating). Not backed up:
`workspace/`, which is per-repo scratch with a different lifetime.

Restore:

```bash
B=~/.claude/orchestration-installs/<project>; D=/path/to/target/.claude
cp -R "$B/orchestration" "$B/commands" "$D/" && cp "$B/settings.local.json" "$D/"
```

---

## Pulling upstream changes

Upstream is dormant but not dead — it shipped nine commits in a day in August. `main` is a
clean descendant of `upstream/main`, so merges should be straightforward.

```bash
cd ~/Documents/kin/repos/ai-academy-main
git fetch upstream
git log --oneline main..upstream/main      # what they have that we do not
git merge upstream/main
```

**Fetch before assessing.** A stale local `upstream/main` has twice produced confident,
wrong conclusions here — once "the repo is dormant" when it had just shipped a burst, and once
a PR description asking the maintainer to fix something they had already fixed.

---

## Branches

| Branch | What it is |
| --- | --- |
| **`main`** | The toolbox: refactored KB + install skill. Tracks `fork/main`. |
| **`course`** | The course: `apps/` + guidebook + the original flat KB. At `f13576f`. |
| `latest` | `course` plus the superseded first-generation skill commits. Archive. |
| `archive/origin-main` | Older parallel copy of the app work. Archive. |
| `day_01`, `day_02` | Earlier course snapshots. Archive. |
| `refactor/decouple-methodology-from-stack` | Was upstream PR #3 (closed). History. |
| `refactor/core-examples-split` | Was fork PR #1 (closed). History. |
| `install-source/*` | Superseded staging branches, now folded into `main`. History. |
| `skill/simplify-for-core-examples` | Superseded; its content is in `main`. History. |

All are pushed to the `fork` remote. Only `main` and `course` are used day to day.

**Remotes:** `fork` = `jayjayabose/ai-academy` (push here), `upstream` =
`charltonaustin/ai-academy` (read only). `origin` points at a non-fork copy and is redundant.

---

## Principles worth knowing before editing anything

`.claude/skills/install-orchestration/SKILL.md` states them in full. The two that decide most
arguments:

- **Truthfulness over completeness.** A documented gap beats a plausible guess. An unfilled
  `{{placeholder}}` is worse than a wrong command, because it looks filled in.
- **Never destroy the irreplaceable.** The generic KB regenerates in one command;
  `project-profile.md`, `project-mission.md` and your retargeted commands do not.

And the rule this fork keeps relearning: **a check must not flag correct text.** A verifier that
stays red after the proper fix teaches people to ignore it.
