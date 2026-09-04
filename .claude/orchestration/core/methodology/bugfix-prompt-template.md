# Bug Fix Prompt Template

**Purpose:** Standard template for all bug fix agent prompts to ensure bugs are fixed WITHOUT introducing new bugs.

**Usage:** Copy this template when creating bug fix prompts. All sections marked MANDATORY must be included.

**Evidence Base:** Created after authentication bugfix agent introduced new bugs while fixing old ones (lacked
validation requirements).

**Commands and file extensions are per-project.** The template below is stack-neutral: every place a concrete
command or path would go is a `{slot}`. A filled-in version is in `examples/<stack>/bugfix-prompt-template-examples.md`.

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md — the template references them
rather than restating them, so there is one definition of "did it pass".

---

## Template Structure

```markdown
# {Feature ID} Bug Fix: {Brief Description}

**Context:** {Why this bug fix is needed - what broke, when discovered}

**Estimated Time:** {realistic estimate}

**CRITICAL:** This is a bug fix. You MUST NOT introduce new bugs while fixing existing ones.

---

## Current State (BEFORE FIX)

**Gate 1 — Type / Compile Check:** {/} {X errors}
**Gate 2 — Lint:** {/} {X warnings}
**Gate 3 — Tests:** {/} {X failing / Y passing}
**Gate 4 — Process Cleanup (Resource Check):** {/} {status}

**Your job:** Fix {specific bugs} AND maintain or improve all validation metrics.

A baseline is not optional decoration. Without it the agent cannot tell "I fixed it" from "I made it worse in a
different place", and neither can you.

---

## Bug #1: {Description}

**File:** \`path/to/file\`
**Line:** {line number if applicable}

**Symptom:**
\`\`\`
{Exact error message or behavior}
\`\`\`

**Root Cause:**
{Why this bug exists - what assumption was wrong, what was missed}

**Current Code:**
\`\`\`{language}
{Show problematic code}
\`\`\`

**Fix Required:**
\`\`\`{language}
{Show corrected code or approach}
\`\`\`

**Validation:**
\`\`\`bash
{How to verify this specific bug is fixed}
\`\`\`

---

## Bug #2: {Description}

{Same structure as Bug #1}

---

## PRE-TESTING SETUP (MANDATORY)

**CRITICAL:** Before you can test your fix by hand, you MUST ensure the development environment is ready.

### 1. Verify Development Database Schema

**If your fix involves database operations or user-facing features:**

**Check if schema applied to development database:**
\`\`\`bash
{command that starts the development server}
{watch for database connection errors}
\`\`\`

**If database errors or features don't work when you use the app:**
\`\`\`bash
{command that applies migrations to the development database}
{command that seeds it with test data}
\`\`\`

**Why:** Integration tests use a separate test database. Your manual testing uses the development database. They
can be out of sync.

**Example:** Tests passed against the test database, but registration failed in the browser because the
development database had no schema.

**Verify schema applied:**

- Development database should have all required tables
- Manual testing should work without database errors
- Don't skip this step - it catches issues tests miss

### 2. Start Development Server

\`\`\`bash
{command that starts the development server}
\`\`\`

**Verify:**

- Server starts without errors
- Database connection successful
- No schema/migration errors

**Wait for the server's ready signal** before testing.

---

## PRE-COMPLETION VALIDATION (MANDATORY)

**CRITICAL:** Bug fixes must NOT introduce new bugs.

Run all five gates before claiming "COMPLETE". The gates and their pass conditions are defined once, in
\`core/methodology/validation-gates.md\`; what this template adds is that **every gate is judged against the
baseline, not in isolation**. A gate that was already failing may not fail worse.

### 1. Type / Compile Check (BLOCKING)

**BEFORE FIX:** {X errors}
**AFTER FIX:** Must be ≤ BEFORE (ideally 0)

**IF ERRORS INCREASED:** Your fix introduced new type issues. Revert and try different approach.

---

### 2. Lint (BLOCKING)

**BEFORE FIX:** {X warnings}
**AFTER FIX:** Must be ≤ BEFORE (ideally 0)

**IF WARNINGS INCREASED:** Your fix introduced code quality issues. Revert and try different approach.

---

### 3. Full Test Suite (BLOCKING)

**BEFORE FIX:** {X failing / Y passing}
**AFTER FIX:** Must be ≤ BEFORE failing (ideally 0 failing)

**CRITICAL:** Run the FULL test suite, not just affected tests.

**IF MORE FAILURES:** Your fix broke other tests. Revert and try different approach.

**IF SAME FAILURES:** Your fix didn't work. Try different approach.

**ONLY if all passing:** Fix successful.

---

### 4. Resource Cleanup Check

**BEFORE FIX:** {status}
**AFTER FIX:** development ports free, no processes left behind by a dev server you killed improperly

If a port is still held, identify the process holding it and stop it, then re-run the check.

---

### 5. Session Log Documentation (BLOCKING)

**In your session log, create section:**
\`\`\`markdown

## Pre-Completion Validation Results

### Baseline (Before Fix)

- Gate 1 (type / compile): {X errors}
- Gate 2 (lint): {X warnings}
- Gate 3 (tests): {X failing / Y passing}
- Gate 4 (resources): {status}

### After Fix

[Paste each gate's command and its output]

### Comparison

- Gate 1: {X} → 0 
- Gate 2: {X} → 0 
- Gate 3: {X failing} → 0 failing 
- Gate 4: Clean 

**ALL VALIDATIONS PASSED**
\`\`\`

The comparison table is the deliverable. Raw "after" output on its own does not show whether the fix was a
net improvement.

---

## IF ANY VALIDATION FAILS

**DO NOT claim "COMPLETE"**

### If Type / Compile Errors Remain or Increase:

-  Your fix introduced new type issues
-  REVERT your changes
-  Try different approach (e.g., narrowing the type rather than asserting it)
-  Re-validate until 0 errors

### If Lint Warnings Appear:

-  Your fix violated code quality standards
-  REVERT or fix the lint issues
-  Re-validate until 0 warnings

### If Tests Still Fail or New Failures:

-  Your fix didn't work OR broke other code
-  REVERT if more failures than before
-  Investigate root cause more deeply
-  Try different fix approach
-  Re-validate until all passing

### If You Introduce New Bugs:

-  STOP and REVERT changes immediately
-  Analyze what went wrong
-  Document issue in session log
-  Try different approach
-  Validate again from clean state

**You are NOT COMPLETE until:**

- Gate 1: 0 errors (or ≤ BEFORE)
- Gate 2: 0 warnings (or ≤ BEFORE)
- Gate 3: All passing (or ≤ BEFORE failing)
- Gate 4: All ports available
- Gate 5: The fixed behaviour verified by hand, not only by the test that covers it
- Validation output pasted in session log

---

## Success Criteria

### Fix is Complete When ALL Pass:

| Gate | Required | Before | After |
| --- | --- | --- | --- |
| 1. Type / Compile Check | 0 errors | {X} | {X} |
| 2. Lint | 0 warnings | {X} | {X} |
| 3. Tests | all passing | {X failing} | {X failing} |
| 4. Process Cleanup | ports free | {status} | {status} |
| 5. Manual Testing | the reported symptom is gone |  |  |

**Session Log:**

- All validation output pasted
- Before/after comparison shown
- Confirmation all validations passed

---

## Time Breakdown Example

- Fix Bug #1: {X minutes}
- Fix Bug #2: {X minutes}
- Fix Bug #3: {X minutes}
- Run validation (all steps): 10 minutes
- **Total: {X} minutes**

**Important:** If you introduce new bugs, add 30+ minutes for rework.

**AVOID REWORK:** Validate thoroughly before claiming complete.

---

## Warning Signs Your Fix Has Issues

### Red Flags (STOP and Reconsider):

**During Implementation:**

- [ ] Compile errors increase instead of decrease
- [ ] Need to modify many unrelated files
- [ ] Multiple approaches tried without success
- [ ] Tempted to skip validation steps
- [ ] Scope expanding beyond original bug

**During Validation:**

- [ ] Gate 1 shows MORE errors than before
- [ ] Gate 3 shows MORE failures than before
- [ ] Different tests now failing (broke something else)
- [ ] Need to modify production code extensively for a "bug fix"

**If ANY red flag:** Your approach may be wrong. Document issue and ask for guidance.

---

## Notes for Bug Fix Agent

**What Bug Fixes Are:**

- Targeted corrections to specific identified issues
- Minimal changes to achieve fix
- Preserve all existing functionality
- Maintain or improve code quality

**What Bug Fixes Are NOT:**

- Refactoring entire modules
- Adding new features
- Rewriting working code
- Changing architecture

**Stay focused on:** Fixing the specific bugs listed. Nothing more.

**Validate completely:** All five gates MUST pass before claiming complete.

---

**Status:** Standard template ready for use
**Applies to:** ALL bug fix prompts
**Mandatory Sections:** Pre-completion validation, session log documentation
**Purpose:** Prevent bug fixes from introducing new bugs
```

---

## How to Use This Template

### When Creating Bug Fix Prompts:

1. **Copy template structure** above
2. **Fill in all {placeholders}** with specific bug details, including the project's own commands
3. **Ensure validation section included** (copy verbatim, adjust metrics)
4. **Add "CRITICAL: Do not introduce new bugs" warning** at top
5. **Document baseline state** (all five gates, measured before the fix)
6. **Require before/after comparison** in session log

### What Makes a Good Bug Fix Prompt:

** Clear bug descriptions** with file/line references
** Root cause analysis** (why bug exists)
** Specific fix instructions** (what code to change)
** Complete validation requirements** (all five gates, by reference)
** Before/after metrics** (so agent knows success criteria)
** "Do not introduce new bugs" warning** (explicit constraint)

### What Makes a Bad Bug Fix Prompt:

** Vague instructions** ("fix the auth tests")
** No validation requirements** (agent decides when "done")
** No baseline metrics** (agent doesn't know if they made things worse)
** Only validates specific bug** (doesn't check for new bugs introduced)
** No session log requirements** (no audit trail)

---

## Integration with Methodology

### This Template Enforces:

- **Gate 1 (Type / Compile Check) as a pre-completion blocker** (proven pattern)
- **Process Cleanup Requirements** (proven pattern)
- **Session Logging Standards** (all features)
- **Quality Standards Maintenance** (all features)

### When to Use:

- ANY bug discovered during validation
- ANY regression found after feature completion
- ANY technical debt fix
- ANY refactoring prompted by code review

### Where to Save Bug Fix Prompts:

**Always in feature's agent-prompts directory:**

```
.claude/workspace/{feature-id}/agent-prompts/
  ├── task-0-{name}.md
  ├── task-a-{name}.md
  ├── bugfix-1-{description}.md  ← Bug fixes here
  ├── bugfix-2-{description}.md
  └── bugfix-3-{description}.md
```

**NOT in feature root directory.**

---

**Status:** Template created and ready for use
**Mandatory:** Use for ALL bug fix prompts
**Purpose:** Prevent bug fixes from introducing new bugs
**Evidence:** Created after bugfix agent introduced new bugs due to missing validation
