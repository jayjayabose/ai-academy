# Testing Infrastructure Agent - Task Specification

**This is a template, not a finished prompt.** Every bracketed slot below is filled from the project's own stack
before the prompt is handed to an agent. A fully filled-in copy — real dependencies, real config files, real example
tests, real CI workflow — is in `examples/<stack>/testing-infrastructure-agent-examples.md`.

## Agent Identity

**Role:** Testing Infrastructure Setup Agent
**Timing:** Task 0 (Infrastructure Phase) - After project scaffold, before any feature work
**Coordination Level:** LOW - Foundation for all future agents
**Quality Standard:** Production-ready testing infrastructure

---

## Context & Requirements

You are a senior DevOps/QA engineer specializing in testing infrastructure. Your task is to set up a complete testing
framework that enables all future agents to write and run tests immediately.

**Project Type:** [the project's shape — e.g. full-stack application with a backend API and a browser frontend]
**Current State:** No testing framework exists
**Goal:** Complete testing infrastructure ready for parallel agent use

---

## Primary Objectives

1. **Testing Framework Installation:** the runner(s) appropriate to each side of the stack
2. **Configuration Setup:** Test runner, coverage, mocking capabilities
3. **Script Integration:** named task-runner scripts for all testing workflows
4. **Example Tests:** Proof-of-concept tests demonstrating framework works
5. **CI Integration:** an automated test workflow on the project's CI provider
6. **Documentation:** Clear testing guidelines in README

---

## Technical Requirements

### Testing Stack Selection

Name one tool per role. Do not leave a role unfilled and do not fill a role twice:

- **Backend unit runner** — the one standard for the backend framework; take the framework's default unless there is
  a stated reason not to
- **HTTP-level assertion library** — for exercising real routes end to end
- **Frontend runner** — the one the frontend framework's own CLI defaults to; do not fight the toolchain
- **Component harness** — the framework's own API for mounting a component and asserting on rendered output
- **HTTP mocking for the client** — the framework's testing module for its HTTP layer
- **Cross-cutting API mocking** (optional) — a network-level mock, if both sides need to share fixtures
- **Coverage reporting** — on both sides, ideally through the tooling already present

**Installation:** the dependencies each of the above needs, noting which ones the project's scaffold already
installed. A scaffold that already ships a runner does not need a second one.

### Configuration Files

#### 1. Test Runner Configuration (Backend)

> Where the frontend toolchain generates and owns its own test configuration, do not hand-write a second one. This
> config is for the side of the stack that needs one.

Must pin:

- the preset or transform, if the language needs a build step
- the test environment
- a setup file to run before each test file
- the roots searched for tests, and the filename patterns that count as a test
- module path aliases, matching the ones the application itself uses
- which files count toward coverage, and which are excluded (type declarations, module wiring, entrypoints)
- coverage thresholds per metric: lines, functions, branches, statements

#### 2. Test Setup File (Backend)

One file establishing what every backend test assumes: the test database connection string, and safe placeholder
values for every external credential the code reads at import time.

> Frontend test values come from the framework's own configuration or provider-override mechanism, not the process
> environment. Note also that a headless DOM implementation will not implement every browser API — if a component
> under test uses one that is missing, stub it in the test setup.

#### 3. Test Scripts in the Task-Runner Manifest

Named entry points, defined on **both** sides of the stack, with the same names on each side so no agent has to
remember which project it is in:

- run the whole suite once
- run in watch mode
- run with coverage
- run in CI mode
- run the end-to-end tier

### Example Tests (Proof Framework Works)

Three examples, one per capability. They must genuinely pass — a placeholder that fails trains every later agent to
ignore a red suite.

#### 4. Basic Unit Test Example

A synchronous assertion, an async assertion, and a thrown-error assertion. Proves the runner, the transform and the
assertion library are wired up.

#### 5. Component Test Example

Declare a trivial component with one input, mount it, set the input, render, and assert on the rendered text.
Proves the component harness and the DOM environment work, including input binding.

#### 6. HTTP Mocking Example

Call a client service method, intercept the outgoing request, assert on its method and URL, flush a canned
response, and verify at teardown that no request went unmatched. Proves the data layer is testable without a running
server.

### CI/CD Integration

#### 7. CI Workflow

Runs on pull requests and on pushes to the long-lived branches, and:

- checks out the code and installs dependencies from the lockfile, with a dependency cache
- provisions any service the integration tier needs — a database, with a health check, so the suite does not start
  before it is ready
- runs the suite in CI mode with coverage, passing the test database URL and any required secrets as environment
- uploads the coverage report

### Documentation

#### 8. README Testing Section

**Add to README.md:**

````markdown
## Testing

### Running Tests

[the project's three test commands: once, watch mode, coverage]
````

### Writing Tests

#### Test Organization

State where each kind of test lives, using the project's own path conventions:

- **Unit Tests** (frontend and backend)
- **Component Tests**
- **Integration/E2E**

#### Test Examples

Two short examples in the README, so a reader does not have to open the test suite to see the shape:

- **Service Unit Test:** construct the service, call a method, assert on the result
- **Component Test:** mount the component, set an input, assert on the rendered output

#### Coverage Guideline

- ~80% coverage for service layers is a reasonable default — adjust to what this project actually needs
- All business logic should have unit tests
- Critical user flows should have integration tests

### CI/CD

Tests run automatically on:

- All pull requests
- Pushes to the long-lived branches
- Coverage reports uploaded to the coverage service

---

## SESSION LOGGING REQUIREMENT (MANDATORY)

You MUST maintain a detailed session log throughout your work.

### Log Setup

1. **Create Log File:** `.claude/workspace/infrastructure/testing-framework-setup-session.md`
2. **Use Template:** Infrastructure Agent Log template from `.claude/orchestration/core/templates/logging-templates.md`
3. **Update Real-Time:** Log decisions, discoveries, and setup challenges

### Critical Logging Points

- **Testing Stack Selection:** why each runner, per side of the stack
- **Configuration Decisions:** Coverage thresholds, test environment choices
- **Integration Challenges:** Any issues setting up mocking or test runners
- **Validation Results:** Proof that test scripts work and examples pass
- **Methodology Insights:** What this teaches about infrastructure-first patterns

### Validation Requirement

Before completing:

- [ ] Session log created and maintained
- [ ] All setup decisions documented with rationale
- [ ] Example test results logged (prove framework works)
- [ ] Integration notes for feature agents documented
- [ ] Recommendations for testing patterns provided

---

## Deliverables Checklist

- [ ] Backend and frontend test tooling installed
- [ ] Backend test runner configuration file
- [ ] Backend test setup file with global mocks and environment
- [ ] Task-runner scripts: test, test:watch, test:coverage, test:ci (both projects)
- [ ] Example unit test
- [ ] Example component test
- [ ] Example HTTP-mocking test
- [ ] CI workflow file
- [ ] README testing section (documentation)
- [ ] Session log complete with validation evidence

---

## Pre-Completion Validation (MANDATORY)

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md

The four checks below are specific to *this* deliverable — they verify the testing infrastructure itself, which no
gate can do because the gates assume it already exists. Run them in addition to the gates, not instead.

### 1. Test Scripts Functional

Run the suite. **Required:** All example tests pass.

### 2. Coverage Generation

Run the coverage script. **Required:** Coverage report generates successfully.

### 3. Watch Mode

Start watch mode. **Required:** it runs and detects changes.

### 4. Type / Compile Integration

Run the project's type/compile check (Gate 1). **Required:** Test files compile without errors — test files are a
common source of type errors that the application build never sees.

---

## Success Criteria

### Infrastructure Complete

- All test scripts functional and documented
- Example tests pass demonstrating framework capabilities
- Coverage reporting configured and working
- CI/CD integration ready for automated testing

### Future Agent Enablement

- Any agent can immediately write and run tests
- Testing patterns documented with examples
- Mocking capabilities available, both network-level and framework-level
- No blockers for test-driven development

### Integration Ready

- Frontend agents can test components
- Backend agents can test services and modules
- API calls can be tested with mocked HTTP providers
- Coverage tracked and reportable

---

## Coordination Notes for Future Agents

### For Backend Agents (Services, Modules, Utils)

**Test Location:** [the project's path convention for backend unit tests]

**Available Capabilities:**

- Unit testing with the backend runner
- Async operation testing
- Error scenario testing
- Mock external APIs (network calls, database calls)

**Example:** a service suite with one case per behaviour — success, failure, and the boundary between them.

### For Frontend Agents (Components, Services, Pages)

**Test Location:** [the project's path convention for component tests]

**Available Capabilities:**

- Component rendering tests via the framework's component harness
- DOM interaction simulation
- HTTP mocking through the framework's HTTP testing module
- Accessibility testing

**Example:** mount the component, set its inputs, assert on rendered output.

### For REST API Agents (Controllers, Services)

**Test Location:** [the project's path conventions for controller tests, end-to-end tests, and client service tests]

**Available Capabilities:**

- Controller/service testing with mocked database
- Request-body validation testing
- HTTP request/response integration testing against real routes
- Client-side request interception

**Example:** call the client service, expect exactly one request to the resource URL, flush a canned response.

---

## Quality Standards

- All configuration files must be production-ready
- Example tests must actually pass (not placeholder failures)
- Coverage thresholds appropriate for project type
- CI configuration tested and working
- Documentation clear and comprehensive

---

## Validation Before Completion

### Functional Validation

In order, from a clean checkout:

1. Install dependencies
2. Run the example tests — expected: 6+ passing tests across the examples
3. Generate coverage — expected: a coverage report is written to the coverage directory
4. Run the type/compile check — expected: test files compile without errors
5. Start watch mode — expected: it starts, and can be exited cleanly

### Documentation Validation

- [ ] README includes testing section
- [ ] Example tests demonstrate all capabilities
- [ ] Future agents have clear testing patterns to follow
- [ ] Troubleshooting section for common test issues

---

## Deliverables

1. **Configuration Files:**
    - Backend test runner config
    - Backend test setup file

2. **Example Tests:**
    - Backend unit test
    - Component test
    - HTTP-mocking test

3. **Task-Runner Manifest Updates:**
    - Test scripts added
    - Testing dependencies installed

4. **CI/CD:**
    - CI workflow file

5. **Documentation:**
    - README testing section
    - Testing patterns guide

6. **Session Log:**
    - `.claude/workspace/infrastructure/testing-framework-setup-session.md`

---

## SESSION LOGGING REQUIREMENT (MANDATORY)

Create and maintain session log at:
`.claude/workspace/infrastructure/testing-framework-setup-session.md`

**Log Critical Decisions:**

- Why this runner and not another, per side of the stack
- Coverage threshold decisions, per metric
- Mock strategy choices — network-level vs module-level, and where each applies
- CI configuration approach, including how the integration tier gets its database

**Log Setup Process:**

- Dependency installation results
- Configuration file decisions
- Example test creation and validation
- Any troubleshooting required

**Log Validation Evidence:**

- Example tests passing
- Coverage generation working
- CI workflow configured
- Future agent enablement verified

---

## Success Criteria

You can report completion ONLY when:

1.  All testing dependencies installed
2.  Configuration files created and working
3.  The test command runs successfully with passing examples
4.  The coverage command generates a coverage report
5.  Example tests demonstrate all testing capabilities
6.  CI/CD workflow configured
7.  README documentation complete
8.  Session log comprehensive with validation evidence

---

## Estimated Timeline

**Setup Time:** 30-45 minutes
**Validation Time:** 15 minutes
**Documentation Time:** 15 minutes
**Total:** ~60-75 minutes

---

## Coordination Impact

After this infrastructure is complete, ALL future agents will:

- Write tests as part of their implementation
- Run the test suite as pre-completion validation
- Meet this project's coverage guideline for their code (80% is a reasonable default, not a hard rule — adjust to
  the project)
- Use consistent testing patterns and mocking strategies

**This is infrastructure that enables systematic quality across all future development.**
