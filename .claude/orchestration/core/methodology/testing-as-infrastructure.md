# Testing as Infrastructure: Early Setup, Continuous Coverage

**The pattern is portable; the framework, config and commands are not.** Each deliverable below states what must
exist and what it must guarantee. A worked set — real config files, real example tests, real CI workflow — is in
`examples/<stack>/testing-as-infrastructure-examples.md`.

## Coverage Numbers Are a Guideline, Not a Mandate

Every coverage percentage in this document (80% lines/functions, 70% branches, etc.) is a **default starting
point**, not a universal rule. Coverage percentage is a contested metric — chasing a fixed number encourages
low-value tests written just to move the number (Goodhart's law), which is worse than no coverage target at all.

**Set the testing level to what makes sense for the project.** A solo prototype or a throwaway internal tool
needs far less rigor than a payments service or anything handling sensitive data. Treat the numbers below as a
reasonable default to adjust — up or down — for your project's actual risk and stakes, not as a gate every
project must clear identically.

## Critical Discovery: Testing Framework Gap

**Problem:** Backend Agent repeatedly deferred testing with "no test infrastructure exists yet"

**Impact:** Zero test coverage for production AI service implementation

**Root Cause:** Testing framework not part of infrastructure-first pattern

**Solution:** Testing framework initialization becomes Task 0 deliverable, just like setup scripts

**This is a SYSTEMATIC GAP**, not an agent failure.

---

## Methodology Principle: Testing Framework = Infrastructure

### Just Like Development Scripts

**Development Scripts Pattern (Already Proven):**

-  Set up BEFORE feature agents need it
-  No functionality, just infrastructure
-  Enables all future agents immediately
-  Technology stack determined by project type

**Testing Framework Pattern (Same Approach):**

-  Created during initial setup phase (Task 0)
-  No tests yet, just infrastructure
-  Enables all future agents to write/run tests
-  Part of infrastructure before parallel execution

**Why This Works:**
When testing framework exists from Task 0, agents have NO EXCUSE for skipping tests. Infrastructure removes the blocker.

---

## Updated Task 0 Responsibilities

### OLD Task 0 (Early Iterations)

```
1. Project scaffolding
2. Database setup (database engine + data-access layer)
3. Development scripts (setup, seed, reset)
4. Environment configuration (example env file)
```

### NEW Task 0 (Current Standard)

```
1. Project scaffolding
2. Database setup (database engine + data-access layer)
3. Development scripts (setup, seed, reset)
4. Testing framework ← NEW
5. Test scripts (test, test:watch, test:coverage) ← NEW
6. Example tests proving framework works ← NEW
7. CI configuration for automated testing ← NEW
8. Environment configuration (example env file)
```

**Scope Addition:** Extended Task 0 scope (one-time infrastructure investment)

---

## Technology Stack Detection

### Testing Framework Selection Based on Project Type

There is no universal answer here — the point of the section is that Task 0 makes the choice *explicitly*, and
records it, rather than leaving each feature agent to improvise one. Choose along these axes:

**Backend-Heavy (APIs, Services):**

- A unit test runner that speaks the project's language natively
- An HTTP-level assertion library for exercising routes end to end
- Database mocking utilities, plus a real test database for the integration tier

**Frontend-Heavy (UI Components):**

- The test runner the framework's own tooling defaults to — do not fight the toolchain
- The framework's component-harness API, for mounting a component and asserting on rendered output
- An HTTP mocking mechanism for the client's data layer

**Full-Stack (Our Case):**

- One runner per side is normal and fine; do not force a single runner across a split stack
- The backend runner plus its HTTP/e2e companion
- The frontend runner plus the framework's component harness and HTTP mocking
- Coverage reporting configured on both sides

**Offline-capable / installable clients:**

- The frontend runner, plus stubs for the platform APIs the app depends on
- Fake the network-availability signal so offline paths are reachable in test

**Task 0 Agent Determines:** Based on project scaffold, choose appropriate testing stack

A worked selection, with the reasoning, is in `examples/<stack>/testing-as-infrastructure-examples.md`.

---

## Task 0 Testing Infrastructure Deliverables

Six deliverables. Each is described here by what it must guarantee; the filled-in file for each is in the examples
pack under the matching heading.

### 1. Test Scripts in the Project's Task Runner

Named entry points, so no agent has to remember runner flags:

- run the whole suite once
- run in watch mode during development
- run with coverage
- run under a debugger
- run the end-to-end / integration tier

The names must be stable, because every agent prompt and every validation gate refers to them.

### 2. Test Runner Configuration (Backend)

> Where the frontend toolchain generates and owns its own test configuration, do not hand-write a second one. This
> deliverable is for the side of the stack that needs explicit config.

The configuration must pin:

- which directories are searched for tests, and what filename patterns count as a test
- how source files are transformed, if the language needs a build step
- which files count toward coverage, and which are excluded (type-only files, module wiring, entrypoints)
- coverage thresholds, per metric — lines, functions, branches, statements
- module path aliases, matching the ones the application itself uses
- a setup file to run before each test file

### 3. Test Setup File (Backend)

One file that establishes the environment every backend test assumes: the test database connection string, and safe
placeholder values for every external credential the code reads at import time. Without this, the first test to
touch configuration fails for a reason that has nothing to do with the code under test.

> A frontend framework will usually have its own mechanism for this — configuration objects or provider overrides
> rather than process-level environment variables. Use the framework's mechanism; do not mutate the process
> environment from a frontend test.

### 4. Example Tests (Proof Framework Works)

At minimum one per tier, and they must genuinely pass — a placeholder that fails is worse than nothing, because it
trains every later agent to ignore a red suite:

- **A plain unit test:** a synchronous assertion, an async assertion, and a thrown-error assertion. This proves the
  runner, the transform and the assertion library are all wired up.
- **A component test:** mount a trivial component, render it, assert on its output. This proves the component
  harness and the DOM environment work.
- **An HTTP-mocking test:** call a client service, intercept the outgoing request, assert on its method and URL,
  and flush a canned response. This proves the data layer is testable without a running server.

### 5. CI Configuration

A workflow that runs on pull requests and on pushes to the long-lived branches, and that:

- checks out the code and installs dependencies from the lockfile
- provisions any service the integration tier needs (a database, with a health check so the suite does not start
  before it is ready)
- runs the suite in its CI mode, with coverage
- uploads the coverage report

### 6. README Documentation

**Add Section:** Testing

```markdown
## Testing

### Running Tests

[the project's four test commands: once, watch, debug, coverage]
```

### Writing Tests

State where each kind of test lives, using the project's own path conventions:

- **Unit tests (services/utils)**
- **Component tests**
- **Integration/E2E tests**

### Coverage Guideline

- ~80% coverage for service layers is a reasonable default — adjust to what this project actually needs
- All business logic should have unit tests
- Critical user flows should have integration tests

---

## Agent Responsibilities: Testing is Part of "Done"

### Updated Definition of Task Completion

**BEFORE (Early Pattern):**

```markdown
Task Complete When:
-  Feature implemented
-  Type / compile check passes
-  Linting passes
-  Session log complete
```

**AFTER (Current Standard):**

```markdown
Task Complete When:

-  Feature implemented
-  Type / compile check passes
-  Linting passes
-  Unit tests written and passing ← NEW
-  Coverage meets this project's testing guideline for new code ← NEW
-  Session log complete (including test strategy)
```

### Pre-Completion Validation Enhanced

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md

What this section adds to the gates: **coverage is checked alongside Gate 3, not after it.** A suite that passes at
40% coverage has not satisfied Gate 3 for new code. Run the coverage report in the same step as the tests, and paste
both.

---

## Coverage Guideline by Code Type

**These are default starting points, not mandates — raise or lower them based on what this project's risk profile
actually calls for.**

### Service Layer (Backend Business Logic)

**Coverage:** ~80% (lines, functions, branches) as a default
**Test Types:** Unit tests with mocked dependencies

A service test suite covers, at minimum: the happy path with valid input; the retry path, if the service retries;
and the give-up path, where the retries are exhausted and the error propagates. A worked suite is in the examples
pack.

### REST Controllers

**Coverage:** ~70% as a default (integration complexity)
**Test Types:** Integration tests with mocked database, plus end-to-end tests issuing real requests against routes

### UI Components

**Coverage:** ~80% as a default (component logic)
**Test Types:** Component tests with user event simulation

---

## Agent Prompt Template: Testing Requirements

### Add to ALL Feature Agent Prompts

```markdown
## TESTING REQUIREMENTS

Testing framework is initialized and ready for use. Write tests for the code you implement; use the coverage
guideline below as a default, and adjust it if this project's stakes call for more or less rigor.

### Test Coverage Guideline

- **Unit Tests:** All business logic, services, utilities (~80% coverage as a default)
- **Component Tests:** All UI components with user interactions (~80% coverage as a default)
- **Integration Tests:** API endpoints, controllers, database operations (~70% coverage as a default)

### Writing Tests

**Location Pattern:** [the project's paths for service, component, utility and controller tests]

**Running Tests:** [the project's test, watch and coverage commands]
```

### Pre-Completion Validation

Before reporting task complete:

- [ ] All tests written for new code
- [ ] All tests passing
- [ ] Coverage meets this project's testing guideline for new code
- [ ] No skipped or pending tests (unless explicitly documented)

### Test Quality Standards

- Use descriptive test names: `it('should generate summary when lead has interactions')`
- Mock external dependencies (APIs, databases, LLM calls) appropriately
- Test both success and error scenarios
- Include edge cases and validation failures
- Ensure tests are deterministic (no flaky tests)

**Failure to write any tests = Incomplete task regardless of code quality.** A specific coverage percentage is a
guideline to hit the spirit of "well-tested," not a hard gate — don't pad a suite with low-value tests just to
move a number.

---

## Session Logging: Testing Strategy Section

### ALL Agent Session Logs Must Include

```markdown
## Testing Strategy

### Test Coverage Plan
**Target Coverage:** [this project's guideline for new code — e.g. ~80%, adjusted to what the project needs]

**Test Types Planned:**
- [ ] Unit tests for [list components/services]
- [ ] Integration tests for [list integrations]
- [ ] Component tests for [list UI components]
- [ ] Edge case tests for [list edge cases]

### Testing Approach
**Mock Strategy:** [What dependencies will be mocked and how]
**Test Organization:** [How tests are structured and named]
**Coverage Focus:** [Which parts need highest coverage]

### Testing Results
**Tests Written:** [count]
**Tests Passing:** [count] / [count]
**Coverage Achieved:** [percentage]%

**Coverage Report:** [paste the per-file coverage table the tool emits]

**Challenges Encountered:** [List testing difficulties and solutions]
**Methodology Insights:** [What this teaches about testing parallel agent work]
```

---

## Evidence: Testing Framework Evolution

### Early Pattern: Testing Framework Gap (Challenge Identified)

- Backend Agent deferred testing repeatedly
- Zero test coverage for production AI service
- Technical debt created
- **Lesson:** Testing framework must exist BEFORE feature work

### Infrastructure Setup: Testing Infrastructure Success (Proven Pattern)

- Testing framework set up in Task 0
- 56 example tests demonstrating patterns
- Coverage thresholds enforced (80% lines, 70% branches)
- 447-line comprehensive testing documentation
- **Lesson:** Infrastructure-first testing enables TDD and prevents technical debt

### Integration Testing Enhancement (Evolution)

- Separate test database, distinct from the development one
- Two-tier testing strategy (unit + integration)
- Integration validation gate catches bugs before completion
- **Lesson:** Testing infrastructure evolves with project needs

---

## Coverage Enforcement Strategy

**Pick the enforcement level that matches this project — don't default to the strictest option.**

### Option 1: Soft Guideline

- Agents expected to write tests
- Coverage tracked but not blocking
- Reviewer judges test quality, not just the number
- Good fit for prototypes, internal tools, early-stage projects

### Option 2: Hard Gate (For Projects That Warrant It)

- Tests required for PR approval
- CI blocks merge if coverage drops below the project's chosen threshold
- Pre-completion validation enforced
- Reserve this for projects where the stakes (production, compliance, payments, shared infrastructure) actually
  justify a hard gate — it's not the default for every project

---

## Infrastructure Agent Task Specification

### Task: Testing Framework Setup (Part of Task 0)

**Agent Type:** Infrastructure Setup Agent
**Timing:** Initial infrastructure phase, before any feature work
**Coordination Level:** LOW (foundation for all future agents)

**Primary Objectives:**

1. Install and configure the testing framework
2. Create named test scripts in the project's task runner
3. Configure test coverage reporting with thresholds
4. Write example tests proving framework works
5. Set up CI/CD test automation
6. Document testing approach in README

**Technical Requirements:**

- A backend test runner, plus an HTTP-level companion for API and end-to-end tests
- A frontend test runner — the one the framework's tooling defaults to — with its component harness
- An HTTP mocking mechanism for client-side data-layer tests
- Coverage reporting configured on both sides

**Deliverables:**

1. Backend test runner configuration
2. Backend global test setup file
3. Example backend unit test
4. Example frontend component test
5. Updated task-runner manifest with test scripts
6. CI workflow for test automation
7. README section on testing

**Validation:**

- [ ] The test command runs successfully
- [ ] Example tests pass
- [ ] Coverage report generates with thresholds
- [ ] CI workflow configured and functional

**Success Criteria:**

- All test scripts functional
- Example tests demonstrate framework capabilities
- Future agents can immediately write and run tests
- Documentation clear on testing approach
- Coverage thresholds enforced automatically

A fully written version of this specification, as an agent prompt, is at
@.claude/orchestration/core/templates/agent-prompts/testing-infrastructure-agent.md

## Status: Testing Methodology Systematized

** Root Cause Identified:** Testing framework not part of infrastructure-first pattern
** Solution Proven:** Infrastructure setup validated testing as Task 0 deliverable
** Agent Prompts Enhanced:** Testing requirements standard in all templates
** Methodology Updated:** Testing infrastructure pattern documented
** Coverage Strategy:** Soft rollout → hard enforcement → integration validation

**Ready for:** All future projects include testing framework in Task 0, enabling systematic quality validation from day
one.
