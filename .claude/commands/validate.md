---
description: Comprehensive validation of completed agent work - verify functionality, find bugs, create fix prompts, and document learnings.
argument-hint: '[feature-id (e.g., dashboard-widgets)]'
---

# /validate - Systematic Agent Work Validation

## Command Expansion

When executed, this slash command expands to:

````text
You are the Orchestration Partner performing systematic validation of completed agent work. Tactical agents have reported their work complete. Your job is to verify everything works, identify bugs, create fix prompts if needed, and document findings for `/retro`, which writes the retrospective.

REQUIRED ARGUMENT:
- Feature ID (e.g., "dashboard-widgets", "user-auth") - identifies which feature to validate

VALIDATION MISSION:
Do NOT trust tactical agent claims of completion. Verify everything systematically. Agents can be overconfident and miss critical bugs, especially integration issues hidden by mocking strategies.

WHERE THE COMMANDS COME FROM:
This file names gates, never commands. Every command below is read from
`.claude/orchestration/meta/project-profile.md`, which is the project's own record of its gate
commands, ports, database and layout. The gates are defined in
@.claude/orchestration/core/methodology/validation-gates.md. If the profile does not exist yet,
ask the engineer for the commands and record them there -- do not guess one, because a
plausible command that does not exist in this project reports a false pass.

YOUR ROLE:
- Strategic validator (orchestration partner reviewing tactical work)
- Quality assurance (systematic bug finding)
- Fix prompt creator (actionable bug fix instructions)
- Retro contributor (findings feed into `/retro`, which writes the retrospective)

---

## PHASE 1: SYSTEMATIC VALIDATION (MANDATORY)

### Step 1: Identify What Was Built

**Locate Feature Documentation:**
```bash
# Find all relevant files
ls .claude/workspace/{feature-id}/
ls .claude/workspace/{feature-id}/agent-logs/
````

**Read to understand scope:**

1. `.claude/workspace/{feature-id}/FEATURE-OVERVIEW.md` - What should have been built
2. `.claude/workspace/{feature-id}/TECH-PLAN.md` - Technical approach
3. `.claude/workspace/{feature-id}/EXECUTION-GUIDE.md` - Task breakdown
4. All agent session logs in `agent-logs/` directory

**Document:**

```markdown
## Feature: {Name}

**Tasks Completed:**

- Task 0: {what was built}
- Task A: {what was built}
- Task B: {what was built}
- Task C: {what was built}
```

---

### Step 2: Check Basic Compilation & Linting

**Run in parallel** — Gate 1 and Gate 2 as `meta/project-profile.md` records them, plus:

```bash
git status --short
```

**Verify:**

- [ ] Gate 1, type / compile check: 0 errors (MANDATORY). If this project has no static
      check, record that rather than reporting a pass.
- [ ] Gate 2, lint: 0 warnings, 0 errors (MANDATORY)
- [ ] Modified files list matches expectations

**If failures found:**

- Document each error with file:line
- Create fix section in validation report

---

### Step 3: Run Full Test Suite

**Execute tests:** Gate 3, as `meta/project-profile.md` records it. Capture stderr as well as
stdout — the whole point of this step is what the runner did not treat as a failure.

**Analyze results:**

- [ ] All tests passing? (Check count: X/X)
- [ ] Any stderr output? (warnings, errors logged but not failing tests)
- [ ] Any mocking indicator in failing test output? (indicates mock issues)

**Critical Analysis:**
Look for these red flags in test output:

- A logged failure from application code - silent failure, swallowed by a caught error
- A null/undefined or wrong-type access error - type mismatch between layers
- A database constraint or type-format rejection - a value the code never validated
- Anything on stderr while the run reports green - caught errors not failing tests

**If tests pass but stderr has errors:**
🚨 CRITICAL: Tests are hiding bugs! Proceed to deep validation.

---

### Step 4: Code Review (Find What Tests Missed)

**Search for problematic patterns:**

Take the source and test directories, and the file extension to filter on, from
`meta/project-profile.md`. The four patterns are the portable part; the greps that find them
are a per-project detail.

**Pattern 1: Type assumptions at the database boundary.** Find the places that read values
straight out of a query result and then treat them as a richer type than the driver returns --
dates, decimals, JSON columns. A driver that hands back strings will pass every mocked test.

**Pattern 2: Silent failures.** Find catch blocks whose only action is to log. An error that
is logged and not re-raised looks identical to success from the caller and from the test
suite.

**Pattern 3: Identifier formats never validated.** Find literals assigned to fields the
database constrains -- an identifier column with a format, an enum, a foreign key. Sentinel
strings like `'system'` or `'admin'` are the usual offender and only fail against a real
schema.

**Pattern 4: Mock-heavy tests.** Count mock declarations in the test tree, and count the
integration tests that are supposed to have none. A large ratio between them means the suite
is testing the mocks.

**Document findings:**

```markdown
## Code Review Findings

### Potential Bug #1: {Description}

- **File:** `{path/to/file}:{line}`
- **Pattern:** {Which pattern matched}
- **Issue:** {What's wrong}
- **Evidence:** {Code snippet or grep output}
- **Impact:** {How it affects functionality}

### Potential Bug #2: ...
```

---

### Step 5: Integration Testing (Real Validation)

**Test real flows (NO MOCKS):**

**For database-dependent features:** start the project's development server with the command
in `meta/project-profile.md`, in the background; wait for it to come up; check that the ports
the profile lists are listening; then stop it again.

```bash
# Fill both from meta/project-profile.md before running this. Left empty, the block fails
# loudly, which is the intended behaviour -- a guessed dev-server command reports a false pass.
DEV_CMD=          # this project's "start the dev server" command
DEV_PORTS=        # space-separated ports it should end up listening on

$DEV_CMD &
DEVPID=$!
sleep 10

for p in $DEV_PORTS; do lsof -i :"$p" 2>/dev/null; done

kill $DEVPID 2>/dev/null
```

**Verify:**

- [ ] Servers start without errors
- [ ] No error logs during startup
- [ ] All expected ports listening

**For features with database writes:** using the database client and connection the profile
records, count the rows the feature claims to have written, and inspect the table's real
constraints. Do this against the database, not through the code under test — the point is to
find out whether the write happened and whether the schema agrees with what the code assumes.

**Document:**

```markdown
## Integration Testing Results

**Server Startup:** {Pass/Fail with details}
**Database Validation:** {Pass/Fail with evidence}
**Error Logs:** {Any errors found in server output}
```

---

### Step 6: Verify Agent Session Logs

**Check log quality:**

```bash
# Count lines per log
wc -l .claude/workspace/{feature-id}/agent-logs/*.md

# Check for required sections
grep -r "## Coordination" .claude/workspace/{feature-id}/agent-logs/
grep -r "## Testing" .claude/workspace/{feature-id}/agent-logs/
grep -r "## Decisions" .claude/workspace/{feature-id}/agent-logs/
```

**Quality checklist:**

- [ ] Each agent has session log
- [ ] Logs document design decisions
- [ ] Logs include testing approach
- [ ] Logs mention coordination assumptions
- [ ] Logs are >300 lines (comprehensive)

---

## PHASE 2: BUG ANALYSIS (IF BUGS FOUND)

### For Each Bug Discovered:

**1. Root Cause Analysis**

```markdown
### Bug #{number}: {Short Description}

**Symptom:** {How bug manifests}
**Root Cause:** {Why it happened}
**Why Tests Passed:** {Why testing didn't catch it}
**Production Impact:** {What breaks in real usage}
**Agent Assumption:** {What agent incorrectly assumed}
**Reality:** {What actually happens}
```

**2. Evidence Collection**

- Error logs (exact messages)
- Code snippets showing bug
- Test output showing hidden errors
- Database constraint violations

**3. Fix Strategy**

- Exact file:line to fix
- Code to add/change
- New tests to prevent regression

---

## PHASE 3: CREATE BUG FIX PROMPT (IF NEEDED)

**If bugs found, create:**
`.claude/workspace/{feature-id}/BUG-FIX-PROMPT.md`

**Template:**

```markdown
# {Feature ID} Bug Fix: {Brief Description}

**Context:** Post-validation review found {number} critical bugs

---

## Bug #1: {Description}

**File:** `{path/to/file}`
**Line:** {line number}

**Current Code:**
\`\`\`{language}
{current broken code}
\`\`\`

**Problem:**
{Explain what's wrong and why}

**Fix Required:**
\`\`\`{language}
{exact code to replace with}
\`\`\`

**Validation:**

1. Run the project's test command, narrowed to {path/to/test}
2. Verify: {specific check}

---

## Bug #2: ...

---

## New Integration Test Required

**File:** `{the project's integration-test directory}/{feature}-integration.{ext}` (NEW)

\`\`\`{language}
{full test code that would have caught the bug}
\`\`\`

---

## Success Criteria

- [ ] Bug #1 fixed
- [ ] Bug #2 fixed
- [ ] Integration test added
- [ ] All tests passing
- [ ] Gate 1, type / compile check: 0 errors
- [ ] Manual validation: {specific steps}

**Estimated Time:** {realistic estimate}
```

---

## PHASE 4: HAND FINDINGS TO /retro

**Do not write or update the retrospective here.** One author writes it: the retro subagent run by `/retro`.
Your job is to leave the findings where it will read them (the validation report from Phase 5 and the
bug analysis below), then tell the engineer to run:

`/retro {feature-id}`

The sections below are the **input** for the retro: record them in the validation report so the retro can
carry them into the retrospective.

### What Went Well  (Validation Confirmed) - input for /retro

- {Patterns that worked effectively}
- {Quality code delivered}
- {Coordination that prevented issues}

### What Didn't Go Well  (Bugs Found) - input for /retro

- Bug #{number}: {Description with file:line}
- Testing gap: {What mocks hid}
- Integration issue: {What manual testing revealed}

### Key Learnings 💡 (Prevention) - input for /retro

```markdown
**Why Bug #{number} Happened:**

- Agent assumed: {assumption}
- Reality: {what actually happens}
- Why tests passed: {mocking hid it}
- Prevention: {pattern for future}
```

### Action Items 🎯 (Immediate Fixes) - input for /retro

- [ ] Fix Bug #1: {specific fix needed}
- [ ] Fix Bug #2: {specific fix needed}
- [ ] Add integration test: {to prevent regression}
- [ ] Update agent prompts: {prevent similar bugs}

---

## PHASE 5: CREATE VALIDATION REPORT

**Create:**
`.claude/workspace/{feature-id}/{FEATURE-ID}-VALIDATION-REPORT.md`

**Structure:**

```markdown
# {Feature ID}: Comprehensive Validation Report

**Date:** {date}
**Validator:** Orchestration Partner
**Status:** {PRODUCTION READY / BUGS FOUND / BLOCKED}

---

## Executive Summary

{2-3 paragraph summary of findings}

---

## Validation Results

### Gate 1 — Type / Compile Check: {/}

{Details, or "this project has no static check" — never a blank pass}

### Gate 2 — Lint: {/}

{Details}

### Test Suite: {/}

- Tests passing: {X/X}
- Coverage: {percentage}
- Hidden errors: {list if any}

### Code Review: {/⚠️/}

{Findings from pattern search}

### Integration Testing: {/}

{Server startup, database validation results}

---

## Bugs Found: {count}

{Detailed bug descriptions with evidence}

---

## Agent Performance Assessment

**Task 0:** {Grade with justification}
**Task A:** {Grade with justification}
**Task B:** {Grade with justification}
**Task C:** {Grade with justification}

**Overall:** {Grade with reasoning}

---

## Methodology Learnings

{Key insights for future features}

---

## Recommendations

**Immediate Actions:**

1. {Highest priority}
2. {Second priority}

**For Future Features:**

1. {Pattern to apply}
2. {Requirement to add}

---

## Time to Fix: {estimate}

**Status:** {Ready for fixes / Needs design review / etc}
```

---

## REPORTING VALIDATION RESULTS

**After validation complete, provide summary:**

```markdown
## {Feature ID} Validation Complete

**Overall Status:** {PRODUCTION READY / BUGS FOUND / ISSUES}

### Summary

{Brief 2-3 sentence summary}

### What Works 

- {Major functionality 1}
- {Major functionality 2}
- {Major functionality 3}

### Bugs Found 🚨

{If any:}

- **Bug #1:** {One-line description} - {file:line}
- **Bug #2:** {One-line description} - {file:line}

### Time to Fix: {estimate}

### Key Learnings

- {Most important insight 1}
- {Most important insight 2}

### Documentation Created

-  Validation Report: `.claude/workspace/{feature-id}/validation-report.md`
-  Bug Fix Prompt: `.claude/workspace/{feature-id}/bugfix-prompt.md` (if bugs found)
-  Retro handoff: run `/retro {feature-id}` (it writes `.claude/workspace/{feature-id}/retrospective.md` from these findings)

### Next Steps

1. {Immediate action}
2. {Second priority}
3. {Third priority}
```

---

## QUALITY CHECKLIST

Before completing validation:

**Validation Completeness:**

- [ ] All 6 validation phases completed
- [ ] Every agent's work reviewed
- [ ] All modified files examined
- [ ] Test output fully analyzed
- [ ] Integration testing performed

**Bug Analysis:**

- [ ] Root cause identified for each bug
- [ ] "Why tests passed" explained for each bug
- [ ] Fix strategy documented with exact code
- [ ] Integration test to prevent regression included

**Documentation:**

- [ ] Validation report comprehensive (>100 lines)
- [ ] Bug fix prompt actionable (if needed)
- [ ] Findings recorded for `/retro` (retrospective is written by /retro, not here)

**Retro Input (for `/retro`):**

- [ ] What worked documented (validation confirmed successes)
- [ ] What failed analyzed (bugs found with root causes)
- [ ] Prevention strategies defined (avoid in next feature)
- [ ] Action items created (fix bugs, improve prompts)

---

## CRITICAL VALIDATION PRINCIPLES

### 1. Don't Trust Agent Claims

- Agents say "tests pass" but tests may hide bugs
- Agents say "works correctly" but may not have tested integration
- Agents say "complete" but may have deferred critical work

### 2. Look for Integration Gaps

- Mock-heavy tests hide type mismatches
- Try-catch blocks hide constraint violations
- Silent failures look like success

### 3. Validate Against Reality

- Run real database queries
- Start real servers
- Check real constraints
- Test real error paths

### 4. Document Everything

- Evidence for every bug
- Reasoning for every grade
- Prevention for every pattern
- Metrics for every learning

---

## SUCCESS METRICS

**Validation Quality Indicators:**

- Bugs found: {count} (good to find them now!)
- Time to fix: {estimate} (shows validation effectiveness)
- Learnings captured: {count} (builds methodology)
- Documentation complete: {5/5 files} (enables future work)

**Ideal Outcome:**

- Feature functional (possibly with known fixes needed)
- All bugs documented with fix prompts
- Clear time estimate for any fixes
- Findings handed to `/retro` for the retrospective
- Engineer can fix bugs and proceed to next feature

---

**This validation process should take 2-4 hours for comprehensive review.**
**The time investment prevents production bugs and builds systematic knowledge.**

````

## Arguments

**Required:**
- `feature-id` - The feature to validate (e.g., "f04", "f05-auth")
  - Locates agent logs and documentation
  - Determines where to save validation reports

**Optional:**
None - command is comprehensive by default

## Expected Output

**Documentation Created:**
1. `validation-report.md` - Comprehensive findings with bug analysis
2. `bugfix-prompt.md` - Step-by-step fix instructions (if bugs found)
3. Findings for `/retro`, which writes `retrospective.md` (one author)

**Summary Report:**
Status, bugs found, time to fix, key learnings, next steps

---

## Why This Command Exists

**Problem:** Agents claim completion but tests hide integration bugs
**Solution:** Systematic validation with real testing, not just mocks
**Benefit:** Find bugs before production deployment

**Strategic Value:**
- Captures what worked/failed for retrospective
- Finds bugs tests missed (integration validation)
- Creates actionable fix prompts
- Validates coordination protocols
- Enables compound learning (retrospectives improve over time)

---

## Example Usage

```bash
# After tactical agents report feature complete
/validate dashboard-widgets

# Result:
# - Found 2 critical bugs (type mismatch, invalid UUID)
# - Created bugfix-prompt.md (~30 min to fix)
# - Recorded findings for /retro (run /retro dashboard-widgets next)
# - Documented prevention strategies for next feature
# - Engineer can fix bugs and proceed
````

---

**Status:** Ready for use
**Purpose:** Systematic validation by orchestration partner (strategic review of tactical work)
**Outcome:** Production-ready features + bug-free delivery + retrospective insights
