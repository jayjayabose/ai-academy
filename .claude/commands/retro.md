---
description: Run the feature retrospective - a separate retro subagent turns plans, logs and commits into a tagged, local-only retrospective.
argument-hint: '[feature-slug (e.g., dashboard-widgets)]'
---

# /retro - Feature Retrospective (Delegated, Local, Blameless)

## Command Expansion

When executed, this slash command expands to:

````text
You are the Orchestration Partner. A feature has finished its gates, or the engineer asks for a partial retro of
work still open. The retro is the LAST task in the execution plan and it is delegated like all other work. You do
not write it yourself, and the agents that implemented the feature do not write it either: they are the least
able to see how the process failed.

REQUIRED ARGUMENT:
- Feature slug (e.g., "dashboard-widgets", "user-auth") - identifies `.claude/workspace/{feature-slug}/`

YOUR MISSION:
Spawn ONE retro subagent, separate from every implementer, and give it the prompt below. Save a copy of that
prompt to `.claude/workspace/{feature-slug}/agent-prompts/retro.md`. If the feature has no execution plan yet,
ask the engineer before proceeding. When the subagent reports back, check that its artifacts exist (below); a
retro subagent that reports COMPLETE without them has not completed - send it back. Then show the engineer the
proposed changes and let THEM decide. Applying any change is a separate task they direct.

---

## RETRO SUBAGENT PROMPT

You are the retro subagent for feature `{feature-slug}`. You did not implement it.

**STEP 0 - SESSION LOG FIRST (MANDATORY):**
Your very first file action is creating `.claude/workspace/{feature-slug}/agent-logs/retro-session.md`, before you
read any workspace artifact. Reading this command file first is allowed. Append to the log as you go: what you
read, what you found, what you decided. Never compose it at the end.

**READ (read-only), cheapest first - do not read a large workspace wholesale:**
1. Each log's `Final Status` section and any provenance or "stale/superseded" notice (grep for the headings,
   then read just those).
2. `git log` for the feature branch (read-only git: log, show, diff, status), then
   `.claude/workspace/{feature-slug}/execution-plan.md`.
3. Full logs, prompts and any validation report in `.claude/workspace/{feature-slug}/` (including its bug
   analysis: why it happened, why tests passed, prevention) - only where steps 1-2 point you.
4. Cross-cutting themes: grep across `agent-logs/*` for recurring phrases (a blocker, a command, an error)
   rather than rereading every log.
5. `.claude/workspace/retro-index.md`, if it exists, so you do not duplicate an open item.

**WRITE:**
1. `.claude/workspace/{feature-slug}/retrospective.md`, using the EXISTING template
   `.claude/orchestration/core/templates/retrospective-template.md` plus the overlay below. Do not alter the
   template. Fill its sections from evidence in the plan, logs, commits and validation report, and cite the
   source of each point.
2. Your own session log (Step 0).
3. This feature's entry in `.claude/workspace/retro-index.md` (format below).

**OVERLAY ON THE TEMPLATE** (the template has no tag, status or proposed-changes fields; you add exactly these
three in your copy, nothing else):
- A `Status` block directly under the title: status is `partial` or `complete`; list complete and open work, drift,
  and validation-report presence as facts (see PARTIAL below).
  `**Status:** partial` / `**Complete:** tasks 1-4` / `**Open:** task 5` / `**Validation report:** none found`
- A `Destination:` tag on each learning, in Key Learnings only, with an ID (see TAGGING).
  `- L3 | Destination: profile | the prompt gave no port for the gate (source: agent-logs/api-session.md)`
- A `## Proposed changes` section as the LAST section, one entry per non-`none` learning.
  `- L3 -> <project>/.claude/orchestration/meta/project-profile.md: "Gate 5 port: <value>"`
Duration: use the logs' `Final Status` start/end times (see logging-templates.md) and git commit timestamps to
estimate it, and label it an estimate. If neither exists write "not recorded"; never guess.

**TAGGING - each learning gets one ID and one tag, once, in Key Learnings.** Action Items and Patterns reference
the ID (`see L3`) and never re-tag or restate the learning. Tag with exactly one destination, placed as above:
- `promote-to-core` - a generic method improvement, true for any stack and any project. The engineer later runs
  `promote.sh` and decides.
- `promote-to-pack` - stack-specific; belongs in `examples/<stack>/` of the toolbox, not in `core/`.
- `profile` - a project fact a fresh agent needs to run the gates or follow conventions correctly (commands,
  ports, layout, conventions). It fixes `.claude/orchestration/meta/project-profile.md`. Anything an agent must
  act on goes here.
- `memory` - ONLY the engineer's personal working preferences, things Claude should know about them even outside
  orchestration. Never project facts.
- `none` - discoverable from the code, so recording it would duplicate the repo.
If a learning seems to fit two tags, split it into two learnings or pick the one that makes someone act.

**PARTIAL, DRIFTED OR UNGATED FEATURES.** Do not assume the feature finished cleanly. Write what you find:
- Feature still open: Status is `partial`. List what is complete and what is open, from the plan and logs. Do not
  invent an ending or a conclusion the evidence lacks.
- Drift: if `git log` differs from the plan, prompts or logs (commits nobody recorded, rewritten history, planned
  work absent from HEAD), record it as a fact: "plan lists X; `git log` shows Y". Do not guess why.
- Gates never ran or no validation report exists: write "no validation report" or "gate N not run" as a fact.
  Never infer results.

**RETRO INDEX FORMAT** (`.claude/workspace/retro-index.md`; create it if missing; update, never duplicate, this
feature's entries; touch no other feature's entries except to mark an item `done` that the evidence shows closed):
```text
- {feature-slug} | {YYYY-MM-DD} | {partial|complete} | tags: promote-to-core 2, profile 3

## Open items
- {feature-slug}/O1 | action | owner: engineer | open | one-line text (L3)
- {feature-slug}/O2 | decision | owner: engineer | open | one-line text (L5)
```
One line per retro. List a tag only if it has at least one learning (omit zero counts). Every open follow-up gets
an item: ID, type (`action` or `decision`), owner, status (`open` or `done`). A decision waiting on the engineer is
type `decision`.

**PROPOSE, NEVER APPLY:**
You apply NONE of the Proposed changes. Do not edit `core/`, `meta/project-profile.md`, memory, the template, or
any code. Give the target file and the exact wording you suggest.

**HARD RULES:**
- Retrospectives are LOCAL to the engineer's machine. They are never committed. Never run git add, git commit,
  git push, git stash, or any command that changes git state or touches a remote.
- A retrospective contains NO personal or quote data (for example driver, property, vehicle or customer
  details) and NO secrets (keys, tokens, passwords, connection strings). Describe the shape of a problem, not the
  data that triggered it. If a log contains such data, do not copy it; say "log contained customer data" and move on.
- Blameless and process-focused. Write what the process allowed, not who erred: "the prompt did not say X", not
  "the agent forgot X". Name causes in prompts, plans, tooling and gates.
- Report only what the evidence shows. If a log is missing or thin, say so in the retrospective as a finding.

**COMPLETION - you have not completed until all exist:**
- `retrospective.md` (Status block, every learning tagged once, Proposed changes section present)
- `agent-logs/retro-session.md`
- the feature's entry and open items in `.claude/workspace/retro-index.md`
Report: status (partial|complete), the tag counts, the Proposed changes, and anything you could not verify.

---

## AFTER THE SUBAGENT REPORTS

Show the engineer where the retrospective and index entry are, and the Proposed changes by destination. Then, per
destination (`<toolbox>` is the engineer's checkout of the toolbox repo):

| Destination | Lands in | Engineer does next |
|---|---|---|
| `promote-to-core` | `<toolbox>/.claude/orchestration/core/...` (stack-neutral, names no stack or project) | Run `promote.sh <project>`; it lists candidates by tier (core, command, pack). Review the diff and decide. Publishing (git add, commit, push) only when they ask. |
| `promote-to-pack` | `<toolbox>/.claude/orchestration/examples/<stack>/` | Add the wording there; same review. |
| `profile` | the project's `.claude/orchestration/meta/project-profile.md` (never promotable) | Update it; offer to delegate that. |
| `memory` | the engineer's auto-memory | Offer to save only the personal preferences. |
| `none` | nothing | Nothing. |

Retrospectives and the index stay local and are never committed.

````

## Arguments

**Required:**
- `feature-slug` - the feature whose retrospective to write

## Expected Output

1. `.claude/workspace/{feature-slug}/retrospective.md` - status, tagged learnings, proposed changes
2. `.claude/workspace/{feature-slug}/agent-logs/retro-session.md` - the retro subagent's incremental log
3. `.claude/workspace/{feature-slug}/agent-prompts/retro.md` - saved prompt
4. An entry and open items in `.claude/workspace/retro-index.md` - what `/orchestration` reads first on the next feature

## Why This Command Exists

**Problem:** An optional, unowned retro never gets written, and lessons are rediscovered feature after feature.
**Solution:** A mandatory, delegated final task with one author, a destination for every learning, and an index
so the next planning session finds it.
**Benefit:** Method-level learnings reach the toolbox through promotion; project-level ones stay local.

---

**Status:** Ready for use
**Purpose:** Delegated, blameless retrospective with tagged learnings
**Outcome:** Retrospective + index entry + proposed (never auto-applied) changes
