# Day 1 — Session Review

**Date:** 2026-08-07
**Scope reviewed:** the whole Day 1 working session, commits `1ba756e` → `b08e355`
**Standard applied:** an experienced senior software engineer, ~5 years. Honest, not kind — requested.

Companion docs: [day_01_infrastructure.md](day_01_infrastructure.md) ·
[day_01_contract.md](day_01_contract.md) · [day_01_task0_verification.md](day_01_task0_verification.md)

---

## 1. Nature of the interactions — where this lands

**Competent as an orchestrator. Advanced beginner as an engineer in the room.** Against a five-year
senior: **at or above bar on governance, clearly below bar on technical engagement.**

Those two halves came apart sharply, and the split is the most useful finding here.

### The governance half was genuinely good

Asked whether parallel subagents were *advisable* rather than just launching them. Asked to read the
subagent prompt before it ran. Reset scope to Task 0 when the session was sprawling. Asked "have we
finished the contract session?" instead of assuming. Insisted on proving the infrastructure before
building on it, and on clicking through the frontend personally rather than trusting a report.

Plenty of seniors skip all of that.

### The engineering half was thin

Across eleven design questions, the answer was **"proceed with recommendation: A" eleven times.**
Never once B. Never an option not on the list. Never "I've been burned by npm workspaces, let's not."
Tradeoffs were requested twice out of eleven.

A five-year senior has scar tissue and opinions, and would have fought on at least the monorepo layout
or the migration tooling — not because the recommendation was wrong, but because those choices encode
preferences you only form by having been hurt by them.

The self-diagnosis in `my_notes.md` is accurate and unusually honest:

> *"I am having a lot of detailed discussions where my understanding is 75%."*

Corroborating evidence: **"explain: migration 001 on both DBs"** was asked roughly twenty turns after
approving Decision 8, which is that mechanism.

### The pattern worth seeing

**Engagement rose as abstraction fell.** Eleven abstract architecture decisions were rubber-stamped.
But once things got concrete, two of the best interventions of the session appeared:

- *"is it conventional for `db:seed` to truncate? should that be a separate step?"*
- *"from a REST perspective, are interactions a true sub-resource of lead?"*

Both caught real errors. Both changed the design. The capability is there — it just wasn't applied
upstream, where it would have been worth the most.

---

## 2. How Day 1's intended learning got circumvented

`day-1-build-requirements.md:187` says to watch for *"friction between backend and frontend (types,
field names)."* **That friction is the curriculum.** Day 1 is engineered to produce a specific pain so
that Day 2's methodology lands as relief.

`packages/shared` with compile-enforced types made that pain **structurally impossible** on the first
morning. From `my_notes.md`:

> *"I skipped dual track database migrations because we had setup so as to avoid the problem that it
> solved."*

Correct — and the same is true of the type contract. Day 1's lesson was solved before it was
experienced.

Four more:

1. **No backtracking, because nothing was built to back out of.** `:196` lists *"times when you have to
   backtrack or fix integration issues."* Thirteen decisions and a full contract session preceded any
   feature code.
2. **The multi-instance wall was never hit.** `:64` invites multiple Claude Code instances precisely so
   coordination problems surface. The hazards (concurrent `npm install`, lockfile races) were
   identified and pre-empted in conversation. Read about, not met.
3. **Day 1 was not completed.** The bar at `:219-224` is CRUD functional in a browser, CSV import, unit
   tests, clone-and-run. Delivered: infrastructure, data model, and a **fixture-backed** frontend. No
   CSV import, no controllers, no backend tests, and no real request has ever crossed the proxy.
4. **No code written, no bug debugged.** All five real defects — the silently-`undefined` JSON field,
   Umzug's renamed bookkeeping table, `{status: null}` reaching a `NOT NULL` column, the UTC-default
   date, and `NOT NULL` on fields unknown at first contact — were found by the assistant or the
   subagent.

**The deepest cost:** this repository is full of good judgment that was not exercised. Asked "why Umzug
over sequelize-cli," `day_01_infrastructure.md` answers beautifully. The open question is whether its
owner can.

---

## 3. Three to keep, three to drop

### Keep

1. **Reviewing agent prompts before they run.** Nothing was caught this time, but the habit is why the
   subagent *reported* contract defects instead of quietly editing `packages/shared` to make its own
   code compile. That single instruction preserved the entire Decision 6 guarantee.
2. **Domain questions over tool questions.** The two best moments came from knowing REST resource
   modelling and seed-script convention — not from knowing anything about Claude Code. That is the
   leverage point. The model has read more documentation; it has not worked at your company.
3. **Importing outside review.** Bringing in an externally-produced analysis document was the most
   sophisticated move of the session. It caught the `satisfies`-alone-is-insufficient subtlety that
   would otherwise have shipped wrong. Using a second context to attack the first is what Day 3's Zen
   MCP formalises — done unprompted on Day 1.

### Drop

1. **Serial approval without engagement.** Eleven "proceed with A" in a row is dictation with extra
   steps, not collaboration.
   **Fix:** pre-commit to challenging at least two recommendations per session. Force a defence. If it
   can't be defended it was wrong; if it can, it's been learned rather than filed.
2. **Approving what isn't understood.** 75% is the number to attack.
   **Fix:** before approving, state the decision back in one sentence *including what it costs*. If
   that sentence won't come, ask then — not twenty turns later.
3. **Letting design crowd out delivery.** Perfect infrastructure and zero working features is a
   recognisable *senior* failure mode, not a junior one — but still a failure.
   **Fix:** timebox the design pass. "One hour on decisions, then build, then revisit what hurts." Some
   of the thirteen decisions would have been better made after feeling the problem.

---

## Notes for the course author

### The materials contradict each other in ways that cost real time

Not nitpicks — a student following them faithfully builds the wrong thing.

- **`chapters/02-two-tier-testing.md:641`** builds the test schema with `synchronize: true`, which means
  migrations are **never executed by any test**. **`chapters/01-orchestration-mindset.md:279`** says
  "verify migrations applied to ALL databases." Incompatible, and the chapter-02 version silently
  defeats the fresh-clone criterion the course insists on elsewhere.
- **`database-migration-strategy.md`** is labelled **MANDATORY** (`:15`) and prescribes a two-track
  `schema.sql` + hand-applied `ALTER` pattern. Its own root-cause statement (`:11`) is *the absence of a
  migration framework.* Any student using Umzug, Prisma or `sequelize-cli` should decline it — but it's
  marked mandatory, so most won't.
- **`nestjs-patterns.md`** is 100% `[Content: ...]` placeholders, yet is cited as the pattern reference.
- **`README.md:141`** instructs `cp .env.local.template .env.local` and **`:142`** links
  `seed-leads.csv` "in the project root." **Neither file exists.** Worse, `.gitignore:53` excludes
  `/data/*.csv`, so the obvious home for a seed file silently breaks the clone-and-run bar.
- Minor: `README.md:41` puts Zen MCP on Day 2; `day-3-advanced-features.md:23` puts it on Day 3.

### The structural issue is more interesting than the bugs

Day 1's lesson is backend/frontend drift. The fix — shared types as a coordination contract — is named
in the course's own chapter references (`nestjs-patterns.md:90`). **A student who reads ahead immunises
themselves against the pain, ships a better repo, and learns less.** The course currently rewards the
behaviour that defeats it.

Two options: force the friction (separate repos, or no shared package before Day 2), or restate the
objective as *"identify which structural choice prevents which class of bug, and justify it"* — which is
what happened here, and which would at least be gradeable.

### A calibration problem

Day 1's completion bar (CRUD in a browser) is incompatible with its "figure it out, we want to see how
you naturally approach this" framing (`:59-69`). A student who takes the design seriously cannot
finish. A student who finishes hasn't designed. Both are defensible, which means the day isn't
measuring what it believes it is.

### One thing worth stealing

The two highest-value defects of the session came from an **adversarial second reader** — an external
analysis document, and a subagent instructed to *report* contract problems rather than fix them. Both
found bugs that careful sequential design had missed. That is a stronger and more concrete argument for
Day 3's multi-model consensus material than its current framing, and it is demonstrable on Day 1.
