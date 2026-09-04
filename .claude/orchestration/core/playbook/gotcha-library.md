# Gotcha Library: Known Issues & Solutions

**Purpose:** Complete catalog of documented issues with proven solutions

**Instances are per-stack.** Each gotcha below states the shape of the problem and the fix that works. The
symptom exactly as it appeared in one project -- the command, the framework, the error string -- is in
`examples/<stack>/gotcha-library-examples.md`. Recognise the shape here; match the symptom there.

---

## Frontend Gotchas

### Field Naming Mismatches

**Problem:** Backend and frontend disagree on the naming convention for the same field
**Symptoms:** the API returns null/undefined for fields
**Solution:** Lock one convention per layer with one named conversion boundary, and import the shared schema types
rather than retyping field names by hand
**Evidence:** High-coordination challenge
**See:** @.claude/orchestration/core/methodology/pattern-library.md § 3. Field Naming Convention Locks

---

## Backend Gotchas

### Database Type Mismatches

**Problem:** The database returns a different type than the code assumes -- strings where date objects were expected
**Symptoms:** Tests pass (mocked), production crashes (real DB)
**Solution:** Integration tests WITHOUT mocks catch this
**Evidence:** Integration testing discovery
**See:** @.claude/orchestration/core/methodology/pattern-library.md § 5. Two-Tier Testing Strategy

### External Dependency Validation

**Problem:** Tests pass (mocked API), feature broken (real API)
**Symptoms:** Missing environment variables, API calls fail
**Solution:** Mandatory external dependency disclosure
**Evidence:** External dependency issue
**See:** Pattern Library external dependency validation

---

## Testing Gotchas

### Long-Running Test Processes

**Problem:** Test workers accumulate after timeout (2+ min tests)
**Symptoms:** RAM exhaustion (10GB+), development machine unusable
**Solution:** Configure proper test timeouts, and run resource-intensive suites serially rather than across parallel
workers
**Evidence:** Validation gate discovery
**See:** @.claude/orchestration/core/methodology/validation-gates.md § Gate 4: Process Cleanup (Resource Check)

### Type Errors While Tests Pass

**Problem:** Runtime test success ≠ compilation success
**Symptoms:** Tests pass, the type/compile check fails, deployment blocked
**Solution:** Run the project's type/compile check (Gate 1) before claiming complete
**Evidence:** 221 errors undetected by tests alone
**See:** @.claude/orchestration/core/methodology/validation-gates.md § Gate 1: Type / Compile Check

---

## Coordination Gotchas

### Import Chain Parallelization

**Problem:** Claiming parallel execution when import dependencies exist
**Symptoms:** Agents refuse to proceed (correctly!)
**Solution:** Map imports before claiming parallel possible
**Evidence:** Authentication import dependency
**See:** @.claude/orchestration/core/methodology/pattern-library.md § 9. Import Chain Parallelization Analysis

### Integration Without Validation

**Problem:** Individual agents complete, system integration fails
**Symptoms:** Type errors, field mismatches after parallel work
**Solution:** Integration validation layer (5 gates mandatory)
**Evidence:** ~60 coordination errors after parallel completion
**See:** @.claude/orchestration/core/methodology/validation-gates.md

---

## PWA Gotchas

### Service Worker Doesn't Register in Dev

**Problem:** The development server does not register the service worker -- most frameworks disable it in dev by
default
**Symptoms:** Offline/install features "don't work" during development
**Solution:** Test against a production build served by a static server, not against the dev server
**Evidence:** PWA development discovery

### HTTPS Required on Real Devices

**Problem:** Service workers only register over HTTPS (localhost is exempt)
**Symptoms:** Install/offline works on desktop localhost but not on a phone via `http://192.168.X.X`
**Solution:** Serve over HTTPS (deployed host or an `ngrok`/`cloudflared` tunnel) to test on device
**Evidence:** PWA setup issue

---

**Status:** Growing library - add new gotchas as discovered
