# Prompt Templates: Reusable Patterns for Agent Coordination

## Overview: Proven Prompt Patterns for Parallel Agent Success

**Purpose:** Tested prompt templates that delivered professional results in low-coordination success and provided
learning from high-coordination patterns.

**Usage:** Copy-paste templates with customization points for different parallel agent scenarios.

**Evidence Base:** All templates refined through actual parallel execution with documented results and coordination
analysis.

**The skeleton is the method; the fills are the instance.** Every template below has the same seven sections —
Context & Requirements, Primary Objectives, Technical Specifications, Naming/API Conventions, Quality Standards,
Deliverables, Success Criteria — and every stack-specific line is a `{slot}`. That shape is what transfers. A
complete set of filled-in prompts is in `examples/<stack>/prompt-templates-examples.md`; read them alongside these,
because an empty skeleton teaches nobody what a good fill looks like.

**On API style:** these templates are written for a request/response HTTP API and use the words *route*, *endpoint*
and *DTO*. If the project's API is something else, substitute the equivalent vocabulary throughout — the
contract-first coordination structure is unchanged.

## Infrastructure-Independent Agent Prompts ( Low Coordination)

### Template 1: Database Setup Agent Prompt

**Scenario:** Data layer setup with minimal cross-agent dependencies
**Coordination Level:** LOW - Basic naming conventions only
**Evidence:** Proven success with seamless integration

```markdown
# Database Setup Agent Task

You are a senior backend engineer specializing in {database engine} and {data-access layer}. Your task is to set up a production-ready database layer for a [PROJECT_TYPE] application.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** {engine + version}, {data-access layer}, {language}
- **Quality Standard:** Production-ready, A+ code quality
- **Timeline:** This is part of parallel execution - focus on your database layer only

## Primary Objectives

1. **Database Schema Design:** Create comprehensive models for [FEATURE_LIST]
2. **Migration Setup:** Implement all migrations with proper versioning
3. **Type Safety:** Ensure complete integration with the project's type system
4. **Development Tooling:** Set up seeding and development database management

## Technical Specifications

- Use {engine} with connection pooling
- Implement {data-access layer} with typed model definitions
- Create reversible migrations for all schema changes
- Set up proper indexing for performance
- Include seed data for development and testing

## Naming Conventions (Critical for Integration)

- **Field Names:** {one case convention, with three real examples}
- **Table/Model Names:** {convention, with three real examples}
- **Enum Values:** {convention, with two real examples}
- **Primary Keys:** {the single primary key field name used throughout}

## Quality Standards

- All database operations must be type-safe
- Include comprehensive error handling
- Document all schema decisions and relationships
- Implement proper data validation at database level
- Consider performance implications for all queries

## Deliverables

1. Complete model definitions with all associations
2. Database migration files for development and production
3. Seed scripts with realistic development data
4. Database configuration and connection setup
5. Generated types for cross-agent use

## Success Criteria

- Fresh database setup → working application with proper data access
- All relationships and constraints properly defined
- Type-safe database operations throughout application
- Performance optimized for expected query patterns
- Integration-ready for other agents (API, UI layers)

**Remember:** You are building the foundation that other agents will build upon. Focus on creating a solid, well-documented database layer that enables their success.
```

**Customization Points:**

- `[PROJECT_TYPE]` - CRM, E-commerce, Social Platform, etc.
- `[PROJECT_DESCRIPTION]` - Brief context about the application
- `[FEATURE_LIST]` - Specific features requiring database support

### Template 2: API Scaffolding Agent Prompt

**Scenario:** Backend framework + API foundation with minimal dependencies
**Coordination Level:** LOW - API contract definitions only
**Evidence:** Proven success providing stable foundation

```markdown
# API Scaffolding Agent Task

You are a senior backend engineer specializing in {backend framework} APIs. Your task is to create a professional API foundation for a [PROJECT_TYPE] application.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** {backend framework}, {validation library}, {language}
- **Quality Standard:** Production-ready, A+ code quality
- **Timeline:** This is part of parallel execution - focus on API foundation only

## Primary Objectives

1. **API Architecture:** Set up {the framework's module/route structure}
2. **Type Safety:** Implement the project's type discipline throughout the API layer
3. **Error Handling:** Create consistent error patterns and logging
4. **Security Foundation:** Establish authentication and CORS setup

## Technical Specifications

- Use {backend framework} with modular architecture
- Register request validation at the framework boundary, applied to every inbound payload
- Create middleware/filters for error handling, logging, and security
- Set up CORS, rate limiting, and basic security headers
- Implement request/response logging with performance monitoring

## API Conventions (Critical for Integration)

- **Endpoint Structure:** Resource-oriented routes; state the collection/item path shape and any global prefix
- **Error Format:** Consistent error response structure with real HTTP status codes and messages
- **Authentication:** {token or session scheme} guard setup
- **Logging:** Structured logging with request IDs for traceability

## Quality Standards

- All API endpoints must be type-safe and documented
- Implement comprehensive error handling with proper HTTP status codes
- Include security best practices (CORS, rate limiting, input validation)
- Set up monitoring and performance tracking
- Create HTTP-level integration testing setup for API validation

## Deliverables

1. {Backend framework} module structure with request handlers
2. Root API setup (global prefix/versioning, request validation)
3. Error handling filters with consistent patterns
4. Security middleware (CORS, rate limiting, authentication setup)
5. API documentation and integration testing framework

## Success Criteria

- API endpoints respond correctly with proper status codes + error handling
- Routes reachable and verifiable with an HTTP client from the command line
- Security middleware functioning (CORS, rate limiting)
- Integration-ready for contract and handler implementation
- Performance monitoring and logging operational

**Remember:** You are creating the API foundation that will host the handlers and the contract types. Focus on solid infrastructure that enables sophisticated API development.
```

**Customization Points:**

- `[PROJECT_TYPE]` - CRM, E-commerce, Social Platform, etc.
- `[PROJECT_DESCRIPTION]` - Brief context about the application
- Authentication requirements (OAuth, bearer token, session-based)

## Schema-Code Integration Prompts (⚠️ High Coordination Required)

### Template 3: API Types Agent Prompt (Coordination-Enhanced)

**Scenario:** Contract definition requiring cross-agent coordination
**Coordination Level:** HIGH - Contract-first approach with validation required
**Evidence:** Field naming challenges identified, systematic solutions integrated

```markdown
# API Types Agent Task (Contract-First Coordination)

You are a senior API architect specializing in type/DTO design and API contracts. Your task is to create a comprehensive set of shared types and a route map that will serve as the coordination contract for other parallel agents.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** {the language's type/DTO mechanism}, {validation library}, route map
- **Quality Standard:** Production-ready contract with comprehensive API design
- **Coordination Role:** Your types will be imported by the Handlers Agent and UI Component Agent
- **Timeline:** This is part of parallel execution - other agents depend on your contract

## Primary Objectives

1. **Complete Contract Definition:** All request DTOs, response types, and routes for [FEATURE_LIST]
2. **Type Safety Contract:** Author shared types for cross-agent coordination
3. **API Design Excellence:** Professional API patterns and best practices
4. **Cross-Agent Coordination:** Export the types module for other agents to import and use

## CRITICAL COORDINATION REQUIREMENTS

### Field Naming Convention (Mandatory)

- **ALL FIELDS:** {the one case convention, with five real field names}
- **NO EXCEPTIONS:** {the same field names in the rejected convention, spelled out, so the mismatch is visible}
- **Boolean Fields:** {the prefix pattern, with three examples}
- **Date Fields:** {the suffix pattern, with three examples}

### Cross-Agent Integration Points

- **Types Export:** Create the shared contract module that other agents can import
- **Shared Location:** Place types where every agent can reach them, and say where
- **Documentation:** Comprehensive descriptions for all types and routes
- **Validation:** Include validation rules on request DTOs and error handling specs

## Technical Specifications

- Define request DTOs (with validation rules attached) and response types
- Provide a derived partial form for update operations rather than hand-writing a second DTO
- Include a route map: method + path + request/response type per endpoint
- Note real-time features (push/streaming transports) separately if needed
- Keep types framework-agnostic so the frontend can import them

## Quality Standards

- All operations must follow the project's API and contract best practices
- Include comprehensive field descriptions and deprecation notices
- Implement proper validation rules and error semantics (status codes)
- Design for performance (payload shapes, pagination)
- Include security considerations for data exposure

## Deliverables

1. Complete shared types module with all request DTOs and response types
2. Route map documentation (method + path + types)
3. Contract documentation with comprehensive field descriptions
4. Cross-agent coordination files (type exports for import)
5. Validation rules and testing setup

## COORDINATION SUCCESS CRITERIA

- The Handlers Agent can import your types and reference exact field names
- The UI Component Agent can use the shared types without duplicating
- All field names follow the locked convention consistently
- The types module is successfully exported for cross-agent import
- Types available in a shared location for all agents

## Validation Requirements

Before completing:

1. Verify all field names use the locked convention (the rejected convention appears nowhere)
2. Confirm the types module exports successfully for other agents to import
3. Validate the DTOs compile and the validation rules are correct
4. Confirm the route map covers every operation

**Remember:** Other agents will import and depend on your exact type definitions. Field naming and DTOs must be perfect for cross-agent coordination success.
```

**Mandatory Customization:**

- `[PROJECT_DESCRIPTION]` - Detailed application context
- `[FEATURE_LIST]` - Specific features requiring types/routes support
- Field naming validation checklist for specific project entities

### Template 4: REST Controllers Agent Prompt (Contract-Dependent)

**Scenario:** Handler implementation that must coordinate with the Types Agent
**Coordination Level:** HIGH - Must import actual types, not recreate
**Evidence:** Field naming mismatch challenges, coordination solution designed

```markdown
# API Handlers Agent Task (Types Import Required)

You are a senior backend engineer specializing in {backend framework} request handlers and database optimization. Your task is to implement handlers that coordinate precisely with the Types Agent's definitions.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** {backend framework} handlers, {data-access layer}, {language}
- **Quality Standard:** Production-ready handlers with optimal query patterns
- **Coordination Role:** You must import and implement the exact DTOs/routes from the Types Agent
- **Timeline:** This is part of parallel execution - you depend on the Types Agent's contract

## CRITICAL COORDINATION REQUIREMENTS

### Types Import (Mandatory)

- **Import Types:** You MUST import the contract definitions from the Types Agent (do not recreate)
- **Use Exact Field Names:** All handler request/response field names must match the DTOs exactly
- **Import Shared Types:** Use the types authored by the Types Agent
- **No Field Name Translation:** Whatever case convention the DTOs use, the handlers use

### Pre-Implementation Validation

Before writing any handlers:

1. Import and examine the actual DTOs/route map from the Types Agent
2. Review all field names and types used in the contract
3. Confirm database field names map to the DTO field names
4. Verify no case-convention mismatches exist between layers

## Primary Objectives

1. **Handler Implementation:** All routes from the route map, every verb
2. **Database Integration:** Optimal queries through the data-access layer, with proper error handling
3. **Type Safety:** Complete type integration using imported types
4. **Performance Optimization:** Prevent N+1 problems and optimize query patterns

## Technical Specifications

- Import DTOs from the Types Agent's shared types module
- Use {data-access layer} for all database operations with type safety
- Implement authentication guards and authorization
- Create comprehensive error handling (framework error translation, real status codes)
- Set up query optimization and performance monitoring

## Quality Standards

- All handlers must be fully type-safe with the imported DTOs
- Implement optimal database query patterns (no N+1 problems)
- Include comprehensive error handling and logging
- Authentication and authorization throughout all operations
- Performance monitoring for query optimization

## Deliverables

1. Complete handler + service implementation using imported types
2. Database query optimization through the data-access layer
3. Authentication and authorization guards
4. Error handling and logging throughout handlers
5. Performance monitoring and query analysis tools

## COORDINATION SUCCESS CRITERIA

- Successfully import DTOs from the Types Agent without modification
- All handler request/response field names match the DTOs exactly
- Use the shared types without duplication or modification
- Database queries return data matching the DTO field names
- No field name translation or conversion required

## Validation Requirements

Before completing:

1. Confirm successful import of the Types Agent's shared types module
2. Verify all handler field names match the DTOs exactly (no mismatches)
3. Test that database queries return correctly named fields
4. Validate type safety throughout the handlers
5. Test end-to-end API operations against the running service with proper field naming + status codes

**Remember:** You are implementing the contract defined by the Types Agent. Your success depends on precise coordination with their exact field names and type definitions.
```

**Mandatory Coordination Steps:**

- Pre-implementation types import validation
- Field name compatibility verification
- Cross-agent type inheritance confirmation

## Agent Prompt Best Practices

### 1. Clarity and Specificity

- **Clear Role Definition:** Specify exact expertise and responsibilities
- **Specific Deliverables:** List concrete outputs expected
- **Quality Standards:** Define A+ code quality expectations explicitly
- **Success Criteria:** Measurable outcomes for task completion

### 2. Coordination Architecture Integration

- **Dependency Identification:** Clarify which agents this agent depends on
- **Integration Points:** Specify exactly how agents coordinate
- **Validation Requirements:** Define coordination success criteria
- **Communication Protocols:** Explain when and how to consult other agents

### 3. Technology Stack Specificity

- **Exact Versions:** Specify library versions and patterns to use
- **Import Patterns:** Define exact import styles and file organization
- **Convention Enforcement:** Require adherence to established patterns
- **Error Prevention:** Anticipate common coordination failures and prevent them

Every `{slot}` in the templates above is an instance of this rule. A slot left unfilled is a decision the agent
will make on its own, and two agents will make it differently.

### 4. Professional Standards Maintenance

- **Code Quality:** Maintain A+ standards throughout parallel execution
- **Documentation Requirements:** Ensure comprehensive documentation
- **Testing Integration:** Include testing requirements appropriate to agent role
- **Security Considerations:** Address security implications of agent's work

## Prompt Template Usage Guidelines

### For Low-Risk Parallel Scenarios

1. **Use Infrastructure-Independent Templates:** Minimal coordination overhead
2. **Focus on Quality:** Emphasize individual agent excellence
3. **Basic Integration:** Simple naming conventions and integration points
4. **Straightforward Success Metrics:** Clear individual agent success criteria

### For High-Risk Coordination Scenarios

1. **Use Coordination-Enhanced Templates:** Systematic cross-agent coordination
2. **Mandatory Validation Steps:** Required coordination verification
3. **Cross-Agent Communication:** Structured consultation and sharing protocols
4. **Integration Success Metrics:** System-level success, not just individual completion

## Evidence Base: Template Effectiveness

### Low Coordination Success Patterns

- **Infrastructure-Independent Templates:** Efficient parallel execution with seamless integration
- **Quality Maintenance:** A+ code quality across all parallel agents
- **Professional Standards:** Production-ready code delivered throughout
- **Integration Success:** Fresh clone → working application achieved

### High Coordination Patterns

- **Coordination-Enhanced Templates:** Systematic solutions to schema-code coordination
- **Cross-Agent Validation:** Mandatory verification prevents field naming mismatches
- **Technology Stack Management:** Library version consistency built into templates
- **Integration Validation:** System-level testing requirements integrated

## Universal Template Additions (ALL Agent Prompts)

### Pre-Completion Validation Gate (MANDATORY)

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md

Every agent prompt's success criteria section must require all five gates, with the project's own commands
pasted into the session log alongside their output.

**Claiming "COMPLETE" without passing all five gates = INCOMPLETE TASK.**

Do not restate the gates inside the prompt template. Reference them. A prompt that carries its own copy of the
gate list is a copy that goes stale, and the stale copy is the one the agent reads.

---

## Status: Prompt Templates Updated and Production-Ready

** Low-Risk Templates:** Infrastructure-independent patterns validated and reusable
** High-Risk Templates:** Coordination mechanisms systematically integrated
** Quality Standards:** Professional development practices maintained throughout
** Evidence-Based:** All templates refined through actual parallel execution results
** Validation Gates:** All five gates mandatory

**Ready for:** Future implementation using proven prompt templates with systematic validation and process management.

---

## Bug Fix Prompt Template (MANDATORY)

**Purpose:** Ensure bug fixes don't introduce new bugs.

**Created After:** Experience showed bug fixes can introduce new bugs due to missing validation requirements.

**See:** `.claude/orchestration/core/methodology/bugfix-prompt-template.md` for complete template.

### Key Requirements for ALL Bug Fix Prompts

**1. Document Baseline State:**

```markdown
## Current State (BEFORE FIX)

- Gate 1 (type / compile check): {X errors}
- Gate 2 (lint): {X warnings}
- Gate 3 (tests): {X failing / Y passing}
- Gate 4 (processes): {status}
```

**2. Explicit "Do Not Introduce New Bugs" Warning:**

```markdown
**CRITICAL:** You are fixing bugs. You MUST NOT introduce new bugs while fixing existing ones.
```

**3. Complete Pre-Completion Validation (MANDATORY):**

All five gates, each compared against the baseline rather than judged in isolation:

- Gate 1: 0 errors (or ≤ BEFORE)
- Gate 2: 0 warnings (or ≤ BEFORE)
- Gate 3: All passing (or ≤ BEFORE failing)
- Session log: Before/after comparison pasted

**4. Revert Instructions if Validation Fails:**

```markdown
**IF ANY VALIDATION FAILS:**

-  Do NOT claim "COMPLETE"
-  REVERT your changes
-  Try different approach
-  Re-validate
```

### Bug Fix vs Feature Development

**Bug Fix Prompts Include:**

-  Baseline state (before fix)
-  After-fix comparison requirement
-  "Do not introduce new bugs" warning
-  Revert instructions if validation worsens
-  Focused scope (fix specific bugs only)

**Feature Prompts Include:**

-  Pre-completion validation (same as bug fix)
-  Process cleanup (same as bug fix)
-  Coordination requirements (if high-coordination)
-  Session logging (same as bug fix)

**Key Difference:** Bug fixes require before/after comparison to ensure no regression.

---

**Template Location:** `.claude/orchestration/core/methodology/bugfix-prompt-template.md`
**Usage:** Mandatory for ALL bug fix prompts
**Evidence:** Experience showed bug fixes can introduce bugs due to incomplete validation requirements

---

## Manual Browser Testing Requirement (MANDATORY)

**Purpose:** Ensure features actually work when a person uses them, not just pass automated tests.

**Created After:** Experience showed agents claiming "complete" but features broken in the browser (database schema
missing, logout broken).

### Add to ALL Feature Agent Prompts

This is Gate 5: @.claude/orchestration/core/methodology/validation-gates.md

The prompt-writing rule, which is what this section contributes: the requirement goes in the prompt, by
reference, for every agent that produces something a person can look at. Do not paste the gate-5 walkthrough
into the prompt — reference it, so there is one copy.

Two additions specific to writing the prompt rather than running the gate:

- **Name the environment the agent must test against.** Automated tests run against the test database; a person
  opens the development one. An agent told only to "test the feature" will test whichever is already migrated.
- **Require the results in the session log**, feature by feature, with the console state recorded even when it
  is clean. "No errors" written down is evidence; "no errors" unwritten is an assumption.

**Claiming "COMPLETE" without manual testing = INCOMPLETE TASK**

### Why This Is Non-Negotiable

**Evidence from Experience:**

- Gate 1 (type / compile check): 0 errors 
- Gate 2 (lint): 0 warnings 
- Gate 3 (tests): 260/261 passing 
- **Gate 5 (manual testing):** 2 critical bugs 

**Automated tests validated code, manual testing revealed broken features.**

---

**Updated Validation Requirements (Complete List):** all five gates, defined once in
@.claude/orchestration/core/methodology/validation-gates.md — type/compile, lint, tests, process cleanup, manual
testing.

**All 5 mandatory for claiming "COMPLETE"**
