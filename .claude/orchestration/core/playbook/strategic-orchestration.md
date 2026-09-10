# Strategic Orchestration: Pre-Execution Checklist

**What:** What the orchestration partner does *before* launching an agent

**When:** Every feature agent launch, every continuation of a blocked feature, every new tool

**Think:** Cheat sheet (keep open while working)

**Complete specification:** @.claude/orchestration/core/methodology/pre-execution-validation-protocol.md

---

## The trade this protocol makes

```
Reactive:  launch → agent hits blocker → stuck → intervention → resume → next blocker
Proactive: validate → remove blockers → launch → smooth execution
```

30-60 minutes of pre-execution work against 1-3 hours of stuck states. Budget it: context recovery 5-10 min,
infrastructure validation 10-20 min, blocker removal 15-30 min, launch 1-2 min.

**Evidence and return on investment:** core/methodology/pre-execution-validation-protocol.md § How Long This Takes

---

## Phase 1 — Context recovery (5-10 min)

Continuing a feature:

- [ ] Read the handoff file in `.claude/orchestration/meta/session-handoffs/`
- [ ] Name what completed, what blocked, what needed manual intervention
- [ ] Turn each of those into an action item: blocker to fix, infrastructure to validate, decision to make

Starting fresh:

- [ ] Read the requirements; identify dependencies on earlier features
- [ ] Look for a past feature with the same shape and reuse what it learned

**Full phase:** core/methodology/pre-execution-validation-protocol.md § Phase 1: Context Recovery

---

## Phase 2 — Infrastructure validation (10-20 min)

Before committing to any new tooling:

- [ ] Test the tool's requirements **in practice** — does it run here, what does it download, how long does setup take
- [ ] Price the hidden costs: download size, setup time, learning curve, who can actually use it
- [ ] Compare against the proven approach already in the repo
- [ ] Decide pragmatically and write down why

The rule: **do not assume, validate.** A tool advertised as an improvement can carry a setup cost an order of
magnitude larger than the alternative it replaces, and you only find that out by running it.

**Worked trade-off analysis:** core/methodology/pre-execution-validation-protocol.md § Phase 2: Infrastructure Validation

---

## Phase 3 — Proactive blocker removal (15-30 min)

For each blocker from Phase 1:

- [ ] Verify every file the agent will import actually exists and exports what the agent expects
- [ ] Check connection configuration matches the environment the agent will run in
- [ ] Start the services the agent needs (backend, database) before it needs them
- [ ] Confirm prerequisites are green: compiler, test suite, installed dependencies
- [ ] Write the fixes into the agent prompt as "X is FIXED" context

**Commands per blocker category:** core/methodology/pre-execution-validation-protocol.md § Common Blocker Categories

The five recurring categories: import paths · connection configuration · service dependencies · infrastructure
requirements · environment mismatches.

---

## Phase 4 — Launch (1-2 min)

- [ ] Prompt states which blockers were removed and what was validated
- [ ] Prompt states one clear focus area
- [ ] Prompt requires the validation gates
- [ ] Prompt requires the agent to write its own session log, execution plan and saved prompt copy
      (@.claude/orchestration/core/methodology/delegation-protocol.md)
- [ ] If the task drives the browser-automation surface, no other browser agent is running — that surface is a
      singleton and browser work is strictly serialized

**Directive template:** core/methodology/pre-execution-validation-protocol.md § Phase 4: Agent Launch with Clear Directive

---

## Did it work?

Warning signs during execution: agent stuck >15 minutes on one issue · asking basic infrastructure questions ·
discovering blockers this checklist should have caught · fighting tooling that was never validated.

Any of those means Phase 2 or Phase 3 was skipped, not that the agent is weak.

**Success and failure metrics:** core/methodology/pre-execution-validation-protocol.md § Validation: Did the Protocol Work?

---

## When to skip

**Nothing is exempt by size.** The earlier carve-out for trivial documentation updates, quick consultations and
research tasks is withdrawn: those are delegated too, so they launch an agent, so they run the checklist. The
depth of each phase scales with what the task actually depends on — a task with no infrastructure dependency
passes Phase 2 in a sentence — but the phases are worked, not skipped, and the result is written down.

The only skip is the engineer explicitly directing one.

**Rule:** @.claude/orchestration/core/methodology/delegation-protocol.md

---

## Where this sits

Runs **before** coordination protocols (`agent-coordination.md`), prompt creation (`prompt-creation.md`) and session
logging. Its output is the input to all three.

---

**Status:** Mandatory before every feature agent execution.
