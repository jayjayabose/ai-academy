# Sub-Agent Usage: Quick Operational Guide

**What:** Agent spawns focused sub-tasks using Task tool for context isolation

**When:** Agent decides autonomously, or you request explicitly

---

## Quick Decision Framework

**Agent uses sub-agents when:**

- Large codebase exploration (>10 files to understand)
- Research synthesis (needs to study docs/approaches)
- Context getting heavy (>50K tokens accumulated)

**Agent avoids sub-agents when:**

- Simple tasks (1-2 files, straightforward logic)
- Small codebases (<10K lines)
- Tight integration needed (debugging, iterative work)

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
