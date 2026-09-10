# Pre-Execution Validation Protocol: Strategic Orchestration Checklist

**Purpose:** Mandatory checklist for methodology partners before launching ANY agent
**Impact:** Enables smooth completion through proactive blocker removal

---

## Why This Protocol Exists

### The Problem Pattern (Reactive)

```
Agent executes → discovers blocker → gets stuck → human intervention → resume → discover next blocker → stuck again
```

**Result:** Extended time, frustration, incomplete features

### The Solution Pattern (Proactive)

```
Methodology partner validates → removes blockers → launches agent → smooth execution → success
```

**Result:** Efficient delivery, positive morale, feature complete

### Real-World Evidence

- **Reactive approach:** BLOCKED, multiple interventions required
- **Proactive approach:** COMPLETE, zero interventions needed
- **Difference:** Proactive blocker removal before execution

---

## The Pre-Execution Validation Checklist

### Phase 1: Context Recovery (5-10 minutes)

**If Continuing Previous Feature:**

- [ ] **Read handoff file** (if session continuation)

  ```bash
  # Check for handoff in .claude/orchestration/meta/session-handoffs/
  ls -la .claude/orchestration/meta/session-handoffs/ | grep $(date +%Y-%m-%d)
  ```

- [ ] **Understand previous outcomes:**
    - What was completed successfully?
    - What blockers were encountered?
    - What got the agent stuck?
    - What manual interventions were needed?

- [ ] **Extract action items:**
    - List specific blockers to fix
    - List infrastructure to validate
    - List decisions to make

**If Starting New Feature:**

- [ ] **Read feature requirements clearly**
- [ ] **Identify dependencies** on previous features
- [ ] **Check for similar patterns** in past features (reuse learnings)

---

### Phase 2: Infrastructure Validation (10-20 minutes)

**Before committing to ANY new tooling approach:**

- [ ] **Research tool capabilities:**
    - What does it do?
    - How does it work?
    - What are the alternatives?

- [ ] **Test tool requirements IN PRACTICE:**

  ```markdown
  Don't assume - validate:

  - Does tool actually work on this machine?
  - What needs to be downloaded/installed?
  - How long does setup take?
  - What's the disk space requirement?
  ```

- [ ] **Discover hidden costs:**
    - Download size (MB vs GB)
    - Setup time (minutes vs hours)
    - Learning curve (familiar vs new)
    - Accessibility (all engineers vs subset)

- [ ] **Compare to proven approaches:**

  ```markdown
  Trade-off analysis:

  - What's the proven approach?
  - What's the theoretical improvement?
  - What's the cost difference?
  - What's the value difference?
  - Is improvement worth the cost? (pragmatic decision)
  ```

- [ ] **Make pragmatic decision:**
    - Proven approach if cost high OR time-sensitive
    - Theoretical improvement if validated AND accessible
    - Document decision and reasoning

**Real Example:** a worked instance, with the actual download size and the actual minutes, is in
`examples/<stack>/pre-execution-validation-protocol-examples.md`. The shape it demonstrates: a tool advertised as
strictly better carried a setup cost three orders of magnitude larger than the built-in alternative, and the only
way to find that out was to run its "what is available" command.

---

### Phase 3: Proactive Blocker Removal

**For each blocker identified in Phase 1:**

- [ ] **Verify file paths:** for every module the agent will import, confirm the file exists and exports what the
  agent expects. Read the exports; do not infer them from the filename.

- [ ] **Fix connection configurations:**

  ```bash
  # Check network configurations match testing environment
  # Example: localhost/proxy in dev, deployed HTTPS API origin in production
  ```

- [ ] **Start required services:** probe each one the agent depends on, and start it if the probe fails. Backend,
  database, queue, anything with a port.

- [ ] **Verify prerequisites:** the project compiles, the test suite passes, and dependencies are installed --
  before the agent starts, so a failure it did not cause cannot be attributed to it. Commands:
  @.claude/orchestration/core/methodology/validation-gates.md.

- [ ] **Update agent prompt with fixes:**

  ```markdown
  CRITICAL CONTEXT (BLOCKERS REMOVED):

  - Import paths FIXED: {what was fixed}
  - Backend connection FIXED: {what was fixed}
  - Infrastructure VALIDATED: {what was tested}

  YOUR FOCUS:

  - {Clear area of responsibility}
  - {Infrastructure concerns handled}
  ```

---

### Phase 4: Agent Launch with Clear Directive (1-2 minutes)

**Launch agent with:**

- [ ] **Updated prompt** (includes "X is FIXED" context)
- [ ] **Clear focus area** (agent knows what to build)
- [ ] **Blockers removed** (agent won't get stuck)
- [ ] **Testing approach clarified** (proven method specified)

**Agent directive template:**

```markdown
CRITICAL CONTEXT:

- {Blocker 1} FIXED: {explanation}
- {Blocker 2} FIXED: {explanation}
- {Infrastructure} VALIDATED: {what was tested}

YOUR TASK:
Focus on {clear implementation area}. Infrastructure concerns already handled.

Follow the prompt exactly, including all validation gates.
```

---

## Validation: Did the Protocol Work?

### During Execution (Monitor)

**Positive indicators:**

-  Agent makes steady progress (no long stuck periods)
-  Agent focuses on implementation (not debugging infrastructure)
-  Agent doesn't ask for guidance on blockers (already removed)
-  Agent completes validation gates systematically

**Warning indicators:**

- ⚠️ Agent stuck for >15 minutes on same issue
- ⚠️ Agent asking basic questions about infrastructure
- ⚠️ Agent discovering blockers that should have been fixed
- ⚠️ Agent struggling with tooling that should have been validated

### After Completion (Verify)

**Success metrics:**

-  All validation gates passed (type check, lint, tests, manual verification)
-  Feature complete and working
-  No major blockers discovered during execution
-  Time efficient (proactive overhead < reactive debugging)

**Failure metrics:**

-  Validation gates failed (errors/warnings)
-  Feature incomplete or blocked
-  Multiple blockers discovered during execution
-  Time wasted on infrastructure debugging

---

## Common Blocker Categories

### Category 1: Import Path Issues

**Symptoms:** "Cannot find module", bundler failures
**Proactive fix:** Verify all imported files exist before agent execution

List the file the agent will import from and read its exports before launching.

### Category 2: Connection Configuration

**Symptoms:** "Disconnected", "Cannot connect", network errors
**Proactive fix:** Verify configurations match environment

Development and production usually resolve the API to different origins. Check wherever the base URL is
configured, and check any long-lived connections separately -- they often have their own configuration.

### Category 3: Service Dependencies

**Symptoms:** "Connection refused", "Service not available"
**Proactive fix:** Start all required services before agent execution

Start the backend and the database before the agent needs them, not when it discovers they are missing.

### Category 4: Infrastructure Requirements

**Symptoms:** "Tool not found", "Command not available", hidden setup costs
**Proactive fix:** Test infrastructure requirements, discover costs, make pragmatic decisions

Run the tool's own "what is available" command before committing to it. An empty list is the answer, and it
arrives in seconds rather than after a download.

### Category 5: Environment Mismatches

**Symptoms:** "Works in test but not in dev", "Environment variable missing"
**Proactive fix:** Verify environment matches agent's needs

Confirm the development database carries the current schema, and that every environment variable the feature
reads is actually set. See @.claude/orchestration/core/methodology/environment-validation.md.

---

## Protocol Application Guidelines

### When to Use This Protocol

**Always use before:**

- Launching any agent — implementation, investigation or question-answering alike
- Continuing a previously blocked feature
- Trying a new tooling approach
- Complex infrastructure setup tasks

**Can skip for:**

- Nothing, on grounds of size. The earlier exemptions — trivial documentation updates, quick consultations,
  research tasks — assumed such work is done without launching an agent. It is not: all work is delegated, so
  all work runs this protocol. See
  @.claude/orchestration/core/methodology/delegation-protocol.md.
- A phase with nothing to validate is answered briefly and recorded as answered. It is not dropped — a phase
  silently skipped is indistinguishable in the log from one that passed.
- The engineer explicitly directing that a task be handled without an agent.

### How Long This Takes

**Context recovery:** 5-10 minutes (read handoff, understand state)
**Infrastructure validation:** 10-20 minutes (test requirements, compare approaches)
**Blocker removal:** 15-30 minutes (fix known issues)
**Total:** 30-60 minutes proactive investment

**Return on investment:**

- Prevents 1-3 hours of stuck states and interventions
- Ensures completion (not blocked)
- Maintains positive morale (success vs frustration)

---

## Integration with Existing Protocols

### This Protocol Comes BEFORE:

- Coordination protocols (coordination-protocols.md)
- Agent prompt creation (prompt-templates.md)
- Session logging (logging-protocol-integration.md)

### This Protocol Ensures:

- Agents receive clear path (blockers removed)
- Infrastructure validated (tooling works)
- Pragmatic decisions made (proven approaches chosen)
- Smooth execution possible (no stuck states)

### This Protocol Connects to:

- Session handoffs (preserve context across sessions)
- Methodology discoveries (apply learnings to prevent repeated failures)
- Quality standards (all gates passable when blockers removed)

---

## Success Stories

### Proactive Orchestration Success Story

**Challenge:** Previous attempt blocked by import paths + backend connection + manual testing
**Protocol Applied:**

- Read handoff → identified 3 blockers
- Validated infrastructure → discovered the new tool's setup cost before adopting it
- Fixed blockers proactively → imports verified, backend configured, the proven testing approach chosen
- Launched agent → smooth execution, all gates passed, COMPLETE
  **Result:** Efficient completion vs blocked state

### Future Applications

- Read session handoffs → prevent similar blockers
- Validate new infrastructure before committing
- Apply proactive blocker removal → smooth execution

## The Core Teaching

**"Engineers who master strategic orchestration deliver features systematically. Engineers who only delegate tactically
get stuck reactively."**

**Strategic orchestration means:**

- Read context (handoffs, past failures)
- Validate infrastructure (test, don't assume)
- Remove blockers (fix before execution)
- Clear path (agents focus on value)

**Tactical execution means:**

- Implement features (clear requirements)
- Validate quality (all gates)
- Document decisions (session logs)
- Deliver successfully (gates passed)

**Together:**

- Strategic thinking + tactical doing = systematic success
- **This IS the methodology**

---

## Status

**Protocol Status:** Proven through real-world success
**Application:** Mandatory for all future feature agent execution
**Documentation:** Complete with checklists and evidence


**Evidence Base:**

- Reactive approach: Blocked states, interventions required
- Proactive approach: Smooth completion, zero interventions
- Quality: All validation gates passed

**Ready for:** Integration into standard workflow for all future features

---

**Last Updated:** 2025-10-06
**Validated By:** Mobile feature success analysis
**Core Insight:** "Proactive orchestration (strategic) + focused execution (tactical) = systematic success"
