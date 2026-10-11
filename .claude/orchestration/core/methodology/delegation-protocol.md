# Delegation Protocol (Delegate by Default)

**Purpose:** Define who does the work, and remove the recurring judgment call about whether a task is big enough to
deserve the method

**Status:** MANDATORY - delegation is the default for all work; the engineer's explicit direction is the only override

**Supersedes:** all earlier guidance that told the orchestration partner to scale rigor to the task and skip the
workspace, execution plan and session log for small work

---

## The Rule

**Always create a subagent to do the work, and to produce the session and workspace artifacts that go with it.**

Three parts, all binding:

1. **Delegate.** The orchestration partner plans, scopes and reviews. A subagent executes.
2. **No scale judgment.** Do not ask whether the task is complex or large enough to warrant the method. That
   question is withdrawn. There is no "too small to delegate" category and no threshold to be measured against.
3. **Engineer override only.** The one way work is done in the main thread without a subagent is the engineer
   saying so, in this session, about this task. Nothing else — not the size of the change, not how obvious the
   answer looks, not how quickly it could be finished directly — is grounds to skip it.

---

## What "the work" Covers

Everything, not only changes to the repository:

| Kind of work | Delegated? |
| --- | --- |
| Implementing a feature | Yes |
| A one-file change or a typo fix | Yes |
| Investigating how something behaves | Yes |
| Answering a question about the codebase | Yes |
| Answering a question about work already done this session | Yes |
| Answering a question about the method itself | Yes |
| Reviewing or validating another agent's output | Yes |
| Recording a decision the engineer just made in conversation | No — that is conversation, not work |

The awkward row is question-answering, and it is deliberate. A question about work already done reads like
something the orchestration partner can answer from memory. Memory is the least reliable source available: it
reports what was intended rather than what is on disk, and it degrades silently as the session grows. A subagent
reads the current state and reports it. That is the point.

---

## The Subagent Owns Its Own Paper Trail

Delegating the work and keeping the bookkeeping is the failure this protocol exists to prevent. The artifacts are
part of the task, not a wrapper the orchestration partner adds afterwards.

Every delegated task must state, in its prompt, that the subagent creates:

- **Its session log** — `.claude/workspace/{feature-slug}/agent-logs/{task-name}-session.md`, maintained during
  execution rather than written from memory at the end. Templates:
  @.claude/orchestration/core/templates/logging-templates.md
- **The execution plan** for the work it owns —
  `.claude/workspace/{feature-slug}/execution-plan.md`. Template:
  @.claude/orchestration/core/templates/execution-plan-template.md
- **A saved copy of its own prompt** — `.claude/workspace/{feature-slug}/agent-prompts/{task-name}.md`, so the
  instruction that produced the work survives the chat window
- **A retrospective** — `.claude/workspace/{feature-slug}/retrospective.md`, for any feature that ran more than
  one task or produced a commit or a database write. Written by the retro task below, not by the implementers.
  Template: @.claude/orchestration/core/templates/retrospective-template.md

Full structure and file purposes: @.claude/orchestration/core/playbook/workspace-management.md

A subagent that reports COMPLETE without these has not completed. Send it back.

### Create the Session Log Immediately, Append as You Go

The session log is created **right after the subagent reads its prompt**, before any other work, and appended to
as each step finishes: commands run, gate output, decisions, surprises. It is never composed at the end. A log
written from memory at the close is the one agents stall on, and it reports what was intended rather than what
happened.

### The Retro Task

The **retro** is the last task in every execution plan. It runs after the gates pass, is delegated like all other
work, and is performed by a subagent **separate from the implementers**: the people who did the work are the
least able to see how the process failed. The retro subagent reads the plan, the logs, the commit history and any
validation report, writes the retrospective and its own session log, and proposes changes without applying them.
Retrospectives are local to the engineer's machine and are never committed. The `/retro` command runs this task.

---

## Serialization of the Browser-Automation Surface

**Exactly one agent may drive the browser-automation surface at a time. Never fan browser work out across
parallel agents.**

The browser-automation surface is not like the filesystem or the test runner, where several agents can work at
once on separate parts. It is a **singleton**: one browser process, one persistent profile, one logged-in
session, shared by whatever drives it. That session is typically the engineer's own live authentication to
external systems, which is what makes the surface useful and also what makes it unsafe to contend for.

Two agents driving it concurrently do not get a browser each. They get the same browser, navigating out from
under one another, with each agent's snapshot describing a page the other just left. The failures this produces
are non-deterministic and look like flaky application behaviour rather than a coordination fault, which is the
worst property a failure can have.

So:

- Browser work **is still delegated** — the default rule applies unchanged.
- Browser work is delegated **to one agent at a time**, and the next browser task starts only after the previous
  agent has finished with the surface.
- When a plan contains several browser tasks, they are **sequential by construction**, regardless of whether
  their coordination level would otherwise permit parallel execution. The parallelization test in
  @.claude/orchestration/core/playbook/agent-coordination.md is necessary but not sufficient here: two browser
  tasks can touch entirely different files and still collide.
- If non-browser work can proceed in parallel alongside the single browser agent, it may.

Which concrete server provides this surface, where its profile lives, and which session it holds is a per-project
fact and is recorded in `meta/project-profile.md`. It is not named here.

---

## The Failure This Prevents

The rule replaced a judgment call, and it did so because of how that judgment call failed in practice.

A task arrives looking small. The orchestration partner weighs it, concludes correctly that it is too small for
a workspace and an execution plan, and proceeds directly. Then the work moves: an investigation turns into a
prototype, the prototype pivots to a different layer, and what shipped is several committed files plus real
writes to a live database. No session log. No retrospective. Nobody noticed, because:

**The scale judgment was made once, at the point of least information, and nothing ever triggered a
re-evaluation.**

That is the whole defect. The judgment was not wrong when it was made — it was correct for the task as framed in
the first five minutes. It was simply never revisited, and there was no mechanism that would have revisited it.
Scope change is the signal to re-run the call, and scope change is exactly the moment everyone is busy.

Two repairs are available. Re-run the judgment whenever scope or layer changes — which depends on somebody
remembering to, mid-flight, under load. Or delete the judgment. This protocol deletes the judgment.

**The cost is honest and worth stating:** delegating a one-line answer through a subagent is slower and produces
a workspace directory for something trivial. That is the premium being paid. It buys the property that no piece
of work can grow past its paper trail, because the paper trail was never conditional on an estimate of how big
the work would turn out to be.

---

## Quick Reference

**Before doing anything yourself, check:**

- [ ] Did the engineer explicitly direct that this be done without a subagent? If not, delegate.
- [ ] Does the prompt require a session log, an execution plan and a saved prompt copy (and, for multi-task, committing or database-writing features, a retrospective)?
- [ ] Does this task touch the browser-automation surface? If so, is it the only browser task running?
- [ ] Does the prompt tell the subagent to create its session log immediately and append as it goes?
- [ ] Is the retro the last task in the execution plan, assigned to a subagent other than the implementers?

**No scale question appears on this list. That is intentional.**

---

**Status:** Mandatory. Applies to implementation, investigation and question-answering alike.
