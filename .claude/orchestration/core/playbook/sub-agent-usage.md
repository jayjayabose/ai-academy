# Sub-Agent Usage: Quick Operational Guide

**What:** An agent spawning focused sub-tasks for context isolation

**When:** Inside an agent that is already executing delegated work

**Not the same question as delegation.** Whether the *orchestration partner* hands work to an agent is settled:
it always does — see @.claude/orchestration/core/methodology/delegation-protocol.md. This file is about the
narrower call an agent makes once it is running, about splitting its own task further to protect its context.

---

## Quick Decision Framework

**An executing agent splits off a sub-agent when:**

- Large codebase exploration (>10 files to understand)
- Research synthesis (needs to study docs/approaches)
- Context getting heavy (>50K tokens accumulated)

**It keeps the work in its own context when:**

- The task is small enough that the split costs more context than it saves
- Tight integration needed (debugging, iterative work)

This is a context-budget trade-off, not a rigor trade-off. It never justifies dropping the session log, the
execution plan or any validation gate.

**Never split browser work across sub-agents.** The browser-automation surface is a singleton: one agent holds
it at a time. See delegation-protocol.md § Serialization of the Browser-Automation Surface.

---

## How to Use

### Explicit Request

```
"Use a sub-agent to explore the authentication code
and return a summary of existing patterns"
```

### Let Claude Decide

```
"Implement authentication"
(Claude decides if sub-agent helpful)
```

### Monitor Sub-Agents

```bash
/agents  # See running sub-agents
```

---

## Trade-Off

**Slower:** ~30% execution overhead (1-3 min per sub-agent launch)

**Higher quality:** Better pattern discovery, focused context

**Worth it when:** Quality > speed (large codebases, complex features)

---

## Sub-Agents Are One Context Technique, Not the Only One

A sub-agent is the agent's own lever on context. Yours are upstream of it, and they are cheaper:

- **Scope the request.** A prompt that names the files and states what is out of scope reads less than one
  that asks the agent to find out.
  See @.claude/orchestration/core/playbook/prompt-creation.md § What makes prompts work.
- **Break the task down.** Several small, separately verifiable tasks each start clean; one large task
  accumulates.
- **Hand off before you run out.** When the session is already heavy, a handoff file transfers the
  conclusions instead of the transcript.
  See @.claude/orchestration/core/playbook/session-continuity.md § When to Create Handoff.

Reach for a sub-agent when the context cost is unavoidable -- the exploration genuinely has to happen and
you do not want its output in the main thread.
