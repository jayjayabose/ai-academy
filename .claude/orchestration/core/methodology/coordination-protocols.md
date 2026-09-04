# Coordination Protocols: Agent Handoff Mechanisms

## Overview: Systematic Agent Coordination for Parallel Success

**Purpose:** Proven coordination mechanisms that prevent integration failures while maintaining quality and efficiency.

**Evidence Base:** All protocols developed through analysis of success patterns and failure patterns, with systematic
solutions designed and validated.

**Usage:** Implementation blueprints for reliable parallel agent orchestration with professional quality maintenance.

**Stack values are per-project.** Every template below has slots — library names, conventions, import forms, commands.
The slots are the portable part; what goes in them belongs to the project. A worked set of fills is in
`examples/<stack>/coordination-protocols-examples.md`.

## Protocol Classification System

### Low Coordination Protocols ( Infrastructure-Independent Tasks)

**Scenario:** Tasks with minimal cross-dependencies (database setup, deployment config, UI scaffolding)
**Coordination Overhead:** Minimal - basic conventions only
**Success Rate:** Proven high in practice

### High Coordination Protocols (⚠️ Contract-Code Integration Tasks)

**Scenario:** Tasks with significant cross-dependencies (shared API contract + server-side handlers + UI components)
**Coordination Overhead:** Systematic coordination architecture required
**Success Rate:** Requires systematic coordination mechanisms
**Quality Maintenance:** Professional standards maintained through systematic coordination

## Core Coordination Protocol: Pre-Execution Setup

### Phase 1: Task Classification and Coordination Planning

#### 1.1 Coordination Requirements Assessment

```markdown
## Task Coordination Assessment Checklist

For each proposed parallel task, evaluate:

### Cross-Dependency Analysis

- [ ] Does this task depend on exact implementation details from another task?
- [ ] Do multiple tasks contribute to the same schema/interface/contract?
- [ ] Are technology stack decisions (library versions, patterns) shared between tasks?
- [ ] Do tasks require real-time cross-referencing of each other's work?

### Coordination Level Classification

- **LOW:** Basic naming conventions sufficient (infrastructure tasks)
- **MEDIUM:** Shared contracts required (API boundaries, component interfaces)
- **HIGH:** Contract-code integration (shared contract ↔ handlers ↔ UI) requires systematic coordination architecture

### Risk Assessment

- **GREEN:** Independent tasks, proven parallel patterns
- **YELLOW:** Some coordination required, systematic mechanisms available
- **RED:** High coordination complexity, consider sequential approach
```

#### 1.2 Technology Stack Coordination Lock

Fill every slot before any parallel execution begins. An unfilled slot is a decision each agent will make
independently and differently — that is the mechanism by which parallel work fails to integrate.

```markdown
## Technology Stack Template (Pre-Execution)

### Required Before Any Parallel Execution

#### Library Versions (Exact Specifications)

- **Frontend:** {framework, exact version, and the application shape}
- **Backend:** {framework, exact version, and the module/route structure}
- **Language:** {language, minimum version, strictness setting}
- **API:** {transport + serialisation format; what artefact carries the contract}
- **Database:** {engine + version + data-access layer}
- **UI Components:** {component library + the specific component patterns to follow}
- **Testing:** {the test runner for each tier}
- **Package Manager:** {one, named}

#### Naming Conventions (Mandatory Consistency)

- **Field Names:** {one case convention, with two or three real field names as examples}
- **File Names:** {convention, with an example filename}
- **Function Names:** {convention with descriptive patterns}
- **Type Names:** {convention for interfaces and types}

#### Import Patterns (Consistency Required)

- **HTTP client:** {the exact import and injection form the frontend uses}
- **Backend framework:** {consistent module and handler registration form}
- **Language:** {explicit type imports and exports, or the project's equivalent}
- **Component Library:** {consistent component import patterns}
- **Data-access layer:** {model and migration pattern consistency}

#### Error Handling Patterns

- **API Errors:** Consistent error response format with real HTTP status codes (400/401/404/409)
- **HTTP Errors:** {server-side error translation} + {client-side error response handling}
- **UI Errors:** Consistent error boundary and display patterns
- **Validation:** Consistent input validation and error messaging
```

Version numbers are part of the lock. "Recent" is not a version, and two agents will resolve it to two
different majors.

### Phase 2: Coordination Mechanism Implementation

#### 2.1 Cross-Agent Communication Protocol

```markdown
## Cross-Agent Consultation Requirements

### When Consultation is Mandatory

- **Contract-Dependent Tasks:** The handler agent MUST reference the Types Agent's actual contract output
- **Type Dependencies:** UI Agent MUST import the shared types from the Types Agent (never redefine them)
- **Technology Decisions:** Library pattern decisions must be coordinated across agents
- **Integration Assumptions:** Any assumption about another agent's work requires validation

### Consultation Process

1. **Pre-Implementation Consultation:** Agent B reviews Agent A's completed work before starting
2. **Decision Broadcasting:** Agents announce key decisions that affect other agents
3. **Cross-Validation Protocol:** Agents verify assumptions against actual agent outputs
4. **Integration Checkpoint:** Validation before individual agent completion reporting

### Communication Documentation Format

- **Decision Log:** What decisions were made and why
- **Coordination Note:** How this affects other agents
- **Validation Requirement:** What other agents need to verify
- **Integration Point:** How agents coordinate at boundaries

### SESSION LOGGING REQUIREMENT (NEW)

ALL agents MUST maintain detailed session logs during execution:

**Log Location:** `.claude/workspace/[feature]/agent-logs/[agent-name]-session.md`
**Required Logging:** Use templates from `.claude/orchestration/core/templates/logging-templates.md`
**Critical Log Points:**

- Technology stack decisions affecting other agents
- Coordination assumptions and validations
- Integration challenges encountered
- Methodology insights discovered during execution

**Purpose:** Session logs provide methodology partner with detailed execution data for:

- Systematic failure analysis and pattern recognition
- Pattern recognition across features, from real execution examples
- Coordination protocol refinement based on actual agent behavior
- Onboarding material from documented execution journeys
```

#### 2.2 Shared Context Management System

```markdown
## Shared Context Protocol

### Central Reference Documents (Required)

- **API contract module:** shared request/response type definitions authored by the Types Agent for import by
  others (the contract)
- **conventions.md:** Technology stack decisions and patterns
- **Integration points module:** cross-agent interface definitions

### Context Inheritance Rules

- **Types Agent:** Authors the API contract module (request/response types) and the route map
- **Handler Agent:** Imports the contract module, implements the server-side handlers/services
  (never duplicates types)
- **UI Agent:** Imports the contract module, calls the documented endpoints through the project's HTTP client
- **All Agents:** Reference conventions.md for technology patterns

### Living Documentation Requirements

- **Real-time Updates:** Shared documents updated as decisions are made
- **Version Control:** All shared context in version control
- **Access Patterns:** All agents can read, specific agents own updates
- **Validation Sync:** Changes trigger validation requirements for dependent agents
```

## High Coordination Protocol: Contract-Code Integration

### Implementation: Shared Types → Handlers → UI Coordination

The three roles below are the general shape of contract-code integration: one agent owns the contract, one
implements it server-side, one consumes it client-side. Rename them to whatever the project calls those
layers; do not collapse them.

#### Step 1: Types Agent Execution (Foundation)

```markdown
## Types Agent Coordination Responsibilities

### Primary Outputs (For Other Agents)

1. **API contract module:** Complete request/response type definitions for import (the contract)
2. **route-map.md:** The route table (method + path + request/response type per endpoint)
3. **field-naming-log.md:** All field names used for cross-agent verification
4. **contract-changelog.md:** Any changes or updates to the types/routes

### Coordination Requirements

- **Field Naming Lock:** One case convention, applied consistently, with the real field names written down
- **Type Export Setup:** Export the contract types from a shared module for cross-agent use
- **Documentation Standards:** Comprehensive field descriptions for other agents
- **Validation Setup:** Request validation rules defined on the contract itself, in the project's validation library

### Cross-Agent Integration Handoff

- Create integration checklist for the Handler Agent and UI Agent
- Document all field names and types for cross-referencing
- Set up the shared types module that other agents will import
- Provide type-import patterns for other agents to use
```

#### Step 2: Handler Agent Coordination (Contract-Dependent)

```markdown
## Handler Agent Coordination Responsibilities

### Pre-Implementation Requirements

1. **Import Types Validation:** Successfully import the contract module from the Types Agent
2. **Field Name Review:** Verify all contract field names before writing handlers
3. **Type Inheritance Setup:** Configure the build to resolve the shared types
4. **Database Coordination:** Ensure database fields map to the contract field names

### Implementation Coordination

- **No Field Name Translation:** Use exact field names from the imported contract
- **Type Safety Verification:** All handlers/services use imported types, never duplicate
- **Cross-Validation Protocol:** Verify handler request/response shapes match the contract before completion
- **Error Handling Consistency:** Use the framework's error translation layer + real HTTP status codes

### Cross-Agent Integration Handoff

- Confirm the implemented routes match the Types Agent's route-map for UI Agent import
- Document all available endpoints (method + path) with exact field names
- Provide request/response examples for UI Agent usage
- Create HTTP-level integration testing setup for UI Agent validation
```

#### Step 3: UI Agent Coordination (Multi-Dependent)

```markdown
## UI Agent Coordination Responsibilities

### Pre-Implementation Requirements

1. **Type Import Validation:** Successfully import the shared types from the Types Agent
2. **Endpoint Review:** Confirm the actual routes from the Handler Agent's route-map
3. **Library Version Verification:** Confirm the HTTP client patterns are used consistently
4. **Data Structure Review:** Understand exact data shapes before component creation

### Implementation Coordination

- **Type Inheritance Only:** Use imported types, never create duplicate types
- **Endpoint Reuse Only:** Call the documented routes through the project's HTTP client, never invent paths
- **Library Pattern Consistency:** Follow the established HTTP client service patterns
- **Data Assumption Validation:** Verify all component data expectations against the actual contract

### Integration Validation Requirements

- Test components against the actual endpoints (not mock data)
- Verify all data fields display correctly (no undefined values)
- Confirm error handling works with the actual HTTP error status codes
- Validate responsive design and accessibility standards
```

## Integration Validation Layer Protocol

### System-Level Testing Between Parallel Completion and Final Delivery

#### Integration Checkpoint Requirements

```markdown
## Integration Validation Checklist

### API Operation Validation

- [ ] All read endpoints return expected data (no null/undefined for existing fields)
- [ ] All write endpoints execute successfully with proper status codes + error handling
- [ ] Field names consistent between the shared contract, the handlers, and the UI components
- [ ] Shared types resolve correctly across all agents without errors

### Library Integration Validation

- [ ] HTTP client service patterns used consistently across all frontend components
- [ ] No import errors or missing type definitions
- [ ] Library version compatibility confirmed across all components
- [ ] Error handling patterns consistent with library documentation

### End-to-End Functionality Validation

- [ ] Fresh clone → install → setup → run → working application, in the project's documented commands
- [ ] All UI components display real data correctly (no "undefined" values)
- [ ] Database operations function correctly through the API layer
- [ ] Authentication and authorization work end-to-end

### Quality Standards Validation

- [ ] A+ code quality maintained across all parallel agents
- [ ] Gates 1-3 clean across every agent's output, not just in aggregate
- [ ] Lint and formatting standards consistent
- [ ] Professional development practices throughout
```

---

## Pre-Completion Validation Protocol (MANDATORY)

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md

### Individual Agent Validation (Before Claiming "COMPLETE")

Every agent runs all five gates on its own output before reporting completion — not the orchestrator
afterwards, and not only whichever agent happens to own the build.

**Claiming "COMPLETE" without passing all five gates = INCOMPLETE TASK.**

The coordination-specific addition: an agent passing its own five gates says nothing about whether its
output integrates with a sibling agent's. The Integration Validation Layer above is a *separate* obligation
that runs after the individual gates, never instead of them.

---

### Manual Browser Testing (MANDATORY)

Gate 5 in @.claude/orchestration/core/methodology/validation-gates.md.

The coordination-specific rule: the agent that built the UI is the agent that drives it, and it does so
against the *development* database rather than the test database — a schema that was only ever applied to
the test database passes gates 1-3 and fails the first human who opens the app.

---

#### Integration Failure Resolution Protocol

```markdown
## When Integration Validation Fails

### Systematic Debugging Process

1. **Field Name Analysis:** Check for mismatches between the case conventions of adjacent layers
2. **Type Import Verification:** Confirm all agents use shared types correctly
3. **Library Version Check:** Verify consistent library patterns across agents
4. **Cross-Agent Communication Review:** Identify coordination gaps

### Resolution Approach

- **Root Cause Analysis:** Identify systematic coordination failure, not individual agent issues
- **Coordination Gap Identification:** Determine which coordination mechanism was missing
- **Systematic Solution:** Fix coordination mechanism, not just symptom
- **Quality Standards Maintenance:** Preserve A+ code quality during resolution

### Prevention Integration

- Document coordination gap for future prevention
- Update coordination protocols to prevent similar failures
- Add validation steps to catch coordination issues earlier
- Improve cross-agent communication requirements
```

## Protocol Application Guidelines

### For Low Coordination Scenarios (Infrastructure-Independent)

1. **Minimal Overhead:** Basic naming conventions and integration points only
2. **Quality Focus:** Emphasis on individual agent excellence
3. **Simple Integration:** Straightforward coordination with proven patterns
4. **Efficiency Optimization:** Maximize parallel execution benefits

### For High Coordination Scenarios (Contract-Code Integration)

1. **Systematic Architecture:** Full coordination protocol implementation required
2. **Cross-Agent Validation:** Mandatory verification of coordination success
3. **Integration Focus:** System-level success, not just individual completion
4. **Quality Maintenance:** Professional standards throughout coordination complexity

## Evidence Base: Protocol Effectiveness

### Low Coordination Success Patterns

**What Worked:**

- Infrastructure-independent tasks with minimal coordination requirements
- Basic naming conventions sufficient for integration success
- Quality standards maintained across all parallel agents
- Efficient parallel execution with seamless integration

**Protocol Validation:**

- Low coordination protocols proven effective
- Quality maintenance systems validated
- Integration success achievable with minimal overhead

### High Coordination Failure Patterns

**What Failed:**

- Contract-code integration without systematic coordination architecture
- Field naming mismatches due to lack of cross-agent validation
- Library version coordination failures due to independent decision-making
- Integration validation gap between parallel completion and delivery

**Protocol Development:**

- High coordination protocols developed from failure analysis
- Cross-agent validation requirements identified and systematized
- Integration validation layer protocols designed
- Quality standards maintenance throughout coordination complexity

## Protocol Status: Continuously Refined Through Evidence

** Low Coordination Protocols:** Proven effective through success patterns
** High Coordination Protocols:** Systematic solutions developed from failure analysis
** Integration Validation:** System-level testing protocols designed and validated
** Quality Standards:** Professional development practices maintained throughout all protocols
** Pre-Completion Validation:** All five gates mandatory

**Methodology Validation:**

- Parallel agent orchestration achievable with systematic coordination
- Professional quality standards maintainable throughout coordination complexity
- Teaching value extracted from both success and failure patterns
- Evidence-based protocols continuously refined through feature implementation
- Pre-completion validation prevents false "complete" claims

**Evolution:**

- Low coordination protocols validated through infrastructure-independent tasks
- High coordination protocols developed from contract-code integration failures
- Two-tier testing strategy added for comprehensive validation
- Type / compile check gate added to prevent false completion claims

**Ready for:** Future implementations using continuously refined coordination protocols with comprehensive validation
gates.

---

## Quick Protocol Validation Checklist

### When Creating Agent Prompts, Verify All Required Protocols Included:

** SESSION LOGGING REQUIREMENT (MANDATORY)**

- [ ] Log file creation instruction: `.claude/workspace/[feature]/agent-logs/[agent-name]-session.md`
- [ ] Template reference specified (Infrastructure/Parallel/Sequential)
- [ ] Critical logging points listed for agent's role
- [ ] Validation checklist included
- [ ] "Failure to log = incomplete" emphasis included

** GIT COMMIT GUIDELINES (MANDATORY)**

- [ ] Four atomic commit principles included
- [ ] Pre-commit hook requirements specified
- [ ] Feature-specific suggested commit sequence (5-7 commits)
- [ ] Good vs bad commit message examples
- [ ] "Each commit must pass pre-commit checks" emphasis

** COORDINATION REQUIREMENTS (When Applicable)**

- [ ] Cross-agent dependencies documented
- [ ] Integration points specified
- [ ] Field naming conventions defined, and the same one for every agent
- [ ] Technology stack alignment requirements
- [ ] Validation checkpoints specified

** TECHNOLOGY STACK SPECIFICATIONS (MANDATORY)**

- [ ] Exact library versions specified
- [ ] Specific import patterns defined
- [ ] Framework patterns required
- [ ] Language standards, including the strictness setting
- [ ] Validation libraries specified

** QUALITY STANDARDS**

- [ ] Type safety requirements
- [ ] Testing requirements (unit + integration)
- [ ] Error handling patterns
- [ ] Performance considerations
- [ ] Accessibility standards (if UI)

** SUCCESS CRITERIA**

- [ ] Functional completeness validation
- [ ] Integration success verification
- [ ] Quality standards validation
- [ ] Demo readiness confirmation

### The "An Engineer Never Has To" Principle

An engineer should NEVER have to:

-  Remember to add session logging requirements
-  Remind agents about atomic commit practices
-  Specify coordination protocols
-  Add quality standards
-  Include technology stack specifications
-  Define integration validation checkpoints

**Methodology partner handles ALL systematic coordination architecture automatically.**

### Evidence Base

**Low Coordination Success:** Session logging captured methodology insights from parallel execution
**High Coordination Prevention:** Coordination protocols prevent field naming and library version mismatches
**Protocol Integration Success:** All protocols integrated automatically - results praised as "amazing"
**Testing Success:** Two-tier testing + integration validation caught bugs before delivery

**Why This Works:**

- Agents get complete, autonomous instructions
- An engineer never has to remember protocol requirements
- Code review efficient with atomic commits
- Methodology insights captured for reuse on the next feature
- Integration failures prevented through systematic coordination

---

**Status:** All protocols mandatory for every agent prompt. Failure to include = incomplete prompt.
