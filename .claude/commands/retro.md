---
description: Run the feature retrospective - a separate retro subagent turns plans, logs and commits into a tagged, local-only retrospective.
argument-hint: '[feature-slug (e.g., dashboard-widgets)]'
---

# /retro - Feature Retrospective (Delegated, Local, Blameless)

## Command Expansion

When executed, this slash command expands to:

````text
You are the Orchestration Partner. A feature is finished (gates passed) and needs its retrospective. The retro is
the LAST task in the execution plan and it is delegated like all other work. You do not write it yourself, and the
agents that implemented the feature do not write it either: they are the least able to see how the process failed.

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
Create `.claude/workspace/{feature-slug}/agent-logs/retro-session.md` IMMEDIATELY after reading this prompt,
before reading anything else. Append to it as you go: what you read, what you found, what you decided. Never
compose it at the end.

**READ (read-only):**
- `.claude/workspace/{feature-slug}/execution-plan.md`
- `.claude/workspace/{feature-slug}/agent-logs/*`
- `git log` for the feature branch (read-only git: log, show, diff, status)
- any validation report in `.claude/workspace/{feature-slug}/` (including the bug analysis: why it happened,
  why tests passed, prevention)
- `.claude/workspace/retro-index.md`, if it exists, so you do not duplicate an open action item

**WRITE:**
1. `.claude/workspace/{feature-slug}/retrospective.md`, using the EXISTING template
   `.claude/orchestration/core/templates/retrospective-template.md`. Do not alter the template. Fill its
   sections from evidence in the plan, logs, commits and validation report, and cite the source of each point.
2. Your own session log (Step 0).
3. One line for this feature in `.claude/workspace/retro-index.md` (create the file if missing; if a line for this
   feature exists, update it rather than adding another). Line format:
   `- {feature-slug} | {YYYY-MM-DD} | tags: {destinations used} | open: {open action items, or none}`
   Keep a short "Open action items" list below the lines in the same file; add yours, drop ones this feature closed.

**TAG EVERY LEARNING with exactly one destination.** Put the tag at the start of the learning:
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

**PROPOSE, NEVER APPLY:**
End the retrospective with a "Proposed changes" list: for each non-`none` learning, the target file and the
exact wording you suggest. You apply NONE of them. Do not edit `core/`, `meta/project-profile.md`, memory, the
template, or any code.

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
- `retrospective.md` (every learning tagged, Proposed changes list present)
- `agent-logs/retro-session.md`
- the feature's line in `.claude/workspace/retro-index.md`
Report: the tag counts, the Proposed changes list, and anything you could not verify.

---

## AFTER THE SUBAGENT REPORTS

Tell the engineer:
- Where the retrospective and index entry are, and the Proposed changes by destination.
- `promote-to-core`: run `promote.sh <project>`, review the diff, and decide. Publishing (git add, commit, push)
  happens only when they ask.
- `promote-to-pack`: add to `examples/<stack>/` in the toolbox.
- `profile`: update `meta/project-profile.md` (offer to delegate it).
- `memory`: offer to save only the personal preferences.
Retrospectives and the index stay local and are never committed.

````

## Arguments

**Required:**
- `feature-slug` - the feature whose retrospective to write

## Expected Output

1. `.claude/workspace/{feature-slug}/retrospective.md` - tagged learnings, proposed changes
2. `.claude/workspace/{feature-slug}/agent-logs/retro-session.md` - the retro subagent's incremental log
3. `.claude/workspace/{feature-slug}/agent-prompts/retro.md` - saved prompt
4. A line in `.claude/workspace/retro-index.md` - what `/orchestration` reads first on the next feature

## Why This Command Exists

**Problem:** An optional, unowned retro never gets written, and lessons are rediscovered feature after feature.
**Solution:** A mandatory, delegated final task with one author, a destination for every learning, and an index
so the next planning session finds it.
**Benefit:** Method-level learnings reach the toolbox through promotion; project-level ones stay local.

---

**Status:** Ready for use
**Purpose:** Delegated, blameless retrospective with tagged learnings
**Outcome:** Retrospective + index entry + proposed (never auto-applied) changes
