# 5 Validation Gates (Mandatory for All Features)

**Purpose:** Define when a feature is truly "complete" vs "compiles but broken"

**Status:** MANDATORY - All 5 gates must pass before claiming "COMPLETE"

**Commands are per-project.** Each gate below states what must be true and what output counts as evidence; the command
that produces it belongs to the project. A worked set is in `examples/<stack>/validation-gates-examples.md`.

---

## A gate must leave the project as it found it

This governs all five gates below, and it is the property most often lost by accident.

**Two things must be unchanged when a gate finishes: the tracked files, and the state the
next run starts from.** Touching either *during* the run is fine. Leaving either altered is
not.

### Never use an autocorrecting command as a gate

Most linters and formatters have a mode that rewrites source until it passes. Used as a gate
it is not a check at all:

- **It cannot fail**, because it edits the code until it agrees with itself. A green result
  carries no information.
- **The rewrite rides along in your diff**, unreviewed, mixed into a change about something
  else.
- **It hides the thing the gate exists to surface.** You wanted to know the code violated a
  rule; instead the violation was silently removed.

So: invoke the linter in its read-only form, and confirm the working tree is still clean
afterwards. If the tree changed, those edits are now part of your change and need reading.

**Expect the project's own script to be the autocorrecting one.** Wiring the fixing mode into
the everyday command is convenient while developing and is a common default. That does not
make it the gate. When they differ, record both in `meta/project-profile.md` — the gate
command and the everyday one — so nobody reaches for the wrong one under time pressure.
Where a pre-commit or pre-push hook runs the fixing form and continuous integration runs the
read-only form, **CI is the gate.**

### Databases are a different case, and forbidding them would be wrong

Gate 3's integration tier has to reach a real database; that is the entire point of running
it without mocks. The constraint is not *don't touch it* but **leave no trace**:

- Roll back or truncate what the run wrote. No rows outlive the suite.
- No schema drift: the structure afterwards is the structure before.
- No leftover fixtures that a later run would silently depend on.

A suite that writes and cleans up is a good gate. A suite that leaves records behind is not —
and neither is a "gate" that drops, recreates or reloads the schema, or loads seed data,
because the next run no longer starts from the same place. The objection is never that the
database was touched. It is that the starting state moved.

### Why this is stated here rather than left to judgement

Three separate projects hit the same trap independently before it was written down: in each
one the everyday lint command silently rewrote source, and in two of them a git hook ran the
fixing form while CI ran the read-only form. Nothing in this document said a gate had to be
read-only, so each project rediscovered it. That is the signal that a rule belongs in the
portable method rather than in one project's notes.

Automated tooling that runs gates on your behalf may refuse anything stateful-looking
outright — a blunter rule than this one, and correct for a tool that cannot know your
project's cleanup story. Do not read that as "gates may not use a database."

---

## Gate 1: Type / Compile Check

**Command:** the project's compile or static type check

**Required:** 0 errors

**Why:** Code that doesn't compile definitely doesn't work. But code that compiles might still be broken (that's what
the other gates catch).

**Common issues caught:**

- Type mismatches between layers
- Missing type definitions
- Incorrect import paths
- Schema/code type inconsistencies

**If the project has no static check at all,** record that in the project's conventions and say so when reporting the
gate. A gate that is silently skipped is indistinguishable in the log from one that passed.

---

## Gate 2: Lint

**Command:** the project's linter, at the strictness the project has agreed, **in its
read-only form** — see § A gate must leave the project as it found it. If the everyday script
autocorrects, it is not this gate.

**Required:** 0 warnings, 0 errors, and a clean working tree afterwards

**Why:** Consistent code quality, catches common mistakes, enforces team conventions

**Common issues caught:**

- Unused variables/imports
- Inconsistent formatting
- Code smell patterns
- Best practice violations

---

## Gate 3: Tests Passing

**Command:** the project's full test suite

**Required:** All tests passing

**Two-Tier Testing Strategy (BOTH required):**

**Unit Tests (WITH mocks):**

- Test logic in isolation
- Fast execution (<1s per test)
- Example: "User validation rejects invalid email"

**Integration Tests (WITHOUT mocks):**

- Test cross-layer integration
- Real database operations — permitted and expected, provided the run leaves no trace
  (see § A gate must leave the project as it found it)
- Example: "Create record → verify in database → retrieve it back through the API"

**Why both:**

- Unit tests validate logic correctness
- Integration tests catch cross-layer bugs (mocks can hide these)

**Evidence:** integration tests found bugs mocked tests missed, all of the same class -- the database returning a
different type than the code assumed, and identifier formats the code never validated.

---

## Gate 4: Process Cleanup (Resource Check)

**Command:** list what is listening on the project's development ports

**Required:** Clean development environment, no hanging processes

**Why:** Multiple agent sessions may start dev servers that don't shut down cleanly, causing port conflicts and
resource exhaustion

**Common issues caught:**

- Backend server still running from earlier session
- Frontend dev server from previous session
- Multiple servers competing for same port

**Fix if needed:** identify the process holding the port and stop it, by PID or by process name.

---

## Gate 5: Manual Testing

**CRITICAL:** Automated tests passing ≠ feature actually working

**Two types based on feature:**

### Frontend Manual Testing (drive a real browser; a browser-automation MCP makes this systematic)

1. Open the running application at the URL the feature lives on
2. Navigate through all UI you created
3. Test all forms (submit, validation, error states)
4. Verify data displays correctly
5. Test all user interactions
6. Check the browser console: 0 errors

**Systematic browser testing:**

- Navigate to all pages you created
- Fill and submit all forms
- Verify redirects and navigation work
- Check data displays correctly
- Screenshot key states
- Document any errors found

**Common issues caught:**

- Schema not applied to the development database (tests use the test database, the browser uses the dev one)
- Client state management broken
- API integration failing
- UI rendering issues

### Backend Manual Testing (issue real requests against the running service)

**Verify:**

1. Response status matches what the endpoint promises
2. Response body contains the fields the contract declares
3. Authentication: login returns a valid token or session
4. Authorization: protected endpoints reject unauthorized requests
5. Error handling: invalid requests return proper error responses

**Common issues caught:**

- API returns wrong status codes
- Missing fields in response
- Authentication/authorization not working
- Database queries failing
- Error handling broken

---

## Session Log Documentation (MANDATORY)

**Agent must paste ALL validation output in session log:**

```markdown
## Pre-Completion Validation Results

### Gate 1: Type / Compile Check
[paste the command and its output]
✔ 0 errors

### Gate 2: Lint
[paste the command and its output]
✔ 0 warnings, 0 errors

### Gate 3: Tests
[paste the suite summary]
✔ Tests: X/X passing

### Gate 4: Process Cleanup
[paste the port listing, or "no hanging processes"]
✔ Clean development environment

### Gate 5: Manual Testing

FRONTEND (if applicable):
- Browser testing:  All features work
- Console errors: None
- Automation results: [details]

BACKEND (if applicable):
- Request testing:  API returns expected responses
- Authentication:  Works correctly
- Error handling:  Proper responses

**All 5 gates passed: YES**
```

Paste the command as well as the output. Output alone does not show which gate was actually run.

---

## Failure Handling

**IF ANY GATE FAILS:**

 Do NOT claim "COMPLETE"
 Fix errors first
 Re-run ALL validation steps
 Only claim "COMPLETE" after ALL validations pass

**Claiming "COMPLETE" without passing all 5 gates = INCOMPLETE TASK**

---

## Why All 5 Gates Matter

**Evidence from building real features:**

-  Type check: 0 errors ≠ tests pass (test files carry type errors of their own)
-  Tests: all passing ≠ the application works (database setup issues surface only when a person uses it)
-  Application works ≠ clean environment (resource exhaustion from hanging processes)

Each gate catches a class the one before it cannot see. That is why the set is five and not one.

**All 5 gates = truly complete**

---

## Quick Reference

**Feature is complete when:**

- [ ] Gate 1: Type / compile check - 0 errors
- [ ] Gate 2: Lint - 0 warnings
- [ ] Gate 3: Tests - All passing (unit + integration)
- [ ] Gate 4: Process cleanup - No hanging servers
- [ ] Gate 5: Manual testing - Feature works in the browser (frontend) OR the API responds correctly (backend)

**All 5 MANDATORY. No exceptions.**
