# Agent Specs Library: Quick Reference & Decision Guide

## Overview: Understanding Agent Types & When to Use Them

**Purpose:** Quick reference for understanding agent types, coordination requirements, and proven patterns from low/high
coordination experiments.

**For Detailed Specifications:** Two agent types have standalone template files in
`.claude/orchestration/core/templates/agent-prompts/` (`testing-infrastructure-agent.md`, `infrastructure-patterns.md`).
For every other agent type below, the "Specification Template" / "Quick Overview" block in its section **is** the
full spec — copy it directly into your prompt, there's no separate file to look up.

**This File:** Evidence-based overview to help decide which agents to use for your feature.

**Evidence Base:** All agent types tested through actual parallel execution with documented results and methodology
learnings.

**Seven roles, one spec shape.** Every specification below has the same sections — Primary Objectives, Technical
Requirements, Quality Standards, Deliverables, and (for the high-coordination four) COORDINATION REQUIREMENTS —
and every stack-specific line is a `{slot}`. The roles and the shape are the portable part; the fills are not. A
complete set of filled-in specs is in `examples/<stack>/agent-specs-library-examples.md`.

## Infrastructure-Independent Agent Specifications ( Proven Low-Risk)

### 1. Database Setup Agent

**Task Scope:** Database engine + data-access layer setup with complete schema implementation
**Coordination Requirements:** Minimal - basic naming conventions only
**Quality Standards:** Production-ready database configuration + comprehensive migrations
**Evidence:** Proven success - seamlessly integrated with other agents

**Quick Overview:**

```
## Database Setup Agent Task

### Primary Objectives:
- Set up the {database engine} with production-ready configuration
- Implement the {data-access layer} with complete schema definition
- Create all necessary migrations for data model
- Ensure type-safe database access throughout application

### Technical Requirements:
- {database engine} at {minimum version}
- {data-access layer} integrated with the project's type system
- Database migrations in version control
- Seed data for development and testing
- Connection pooling and error handling

### Quality Standards:
- All database operations type-safe
- Migration scripts tested and reversible
- Comprehensive error handling for database operations
- Performance considerations for queries and indexes
- Documentation for schema decisions and relationships

### Deliverables:
- Models with complete data model
- Database migration files
- Seed scripts for development data
- Database configuration and connection setup
- Type definitions generated from models

### SESSION LOGGING REQUIREMENT (MANDATORY):
- Create: `.claude/workspace/[FEATURE]/agent-logs/database-agent-session.md`
- Use: Infrastructure Agent Log template from `.claude/orchestration/core/templates/logging-templates.md`
- Log: Technology decisions, database design choices, integration setup decisions
- Purpose: Teaching material for database setup methodology and coordination patterns
```

**Coordination Integration Points:**

- Schema naming conventions (pick one case convention and name it)
- Primary key patterns (UUID vs integer)
- Timestamp field standards (the created/updated field names, spelled exactly)
- Enum definitions shared with other agents

### 2. API Scaffolding Agent

**Task Scope:** Backend framework API setup with type-safe foundations
**Coordination Requirements:** Minimal - API contract definitions only
**Quality Standards:** Professional API structure + comprehensive error handling
**Evidence:** Proven success - provided stable foundation for other agents

**Specification Template:**

```
## API Scaffolding Agent Task

### Primary Objectives:
- Set up the {backend framework} with modular architecture
- Implement a modular API (the framework's module + handler structure)
- Create type-safe API foundations
- Establish error handling and logging patterns

### Technical Requirements:
- {backend framework} at {exact version} with module-based architecture
- Request handlers registered through the framework's HTTP adapter, with validation applied at the boundary
- The project's type discipline enforced throughout the API layer
- Comprehensive error handling (the framework's error translation layer)
- Request logging and performance monitoring

### Quality Standards:
- All API endpoints type-safe and documented
- Consistent error response patterns (real HTTP status codes)
- Security best practices (CORS, rate limiting)
- Performance monitoring and optimization
- Integration testing setup for API endpoints, at the HTTP level

### Deliverables:
- {backend framework} module structure
- Root API setup (global prefix/versioning, request validation)
- Error handling middleware
- API documentation and type definitions
- Security configuration and middleware
```

**Coordination Integration Points:**

- Route naming conventions
- Error response format standards
- Authentication middleware interfaces
- Shared DTO/type extension points

### 3. UI Foundation Agent

**Task Scope:** Frontend app structure + component library + routing setup
**Coordination Requirements:** Minimal - design system + routing conventions only
**Quality Standards:** Professional UI architecture + accessibility standards
**Evidence:** Proven success - enabled parallel component development

**Specification Template:**

```
## UI Foundation Agent Task

### Primary Objectives:
- Set up the {frontend framework} application structure with modern tooling
- Implement the {component library} with customization
- Create routing structure with the {router}
- Establish design system and styling conventions

### Technical Requirements:
- {frontend framework} with the project's language and build tools
- {component library} implementation
- {styling system} with custom design tokens
- Responsive design patterns and accessibility standards
- {router} for navigation and routing

### Quality Standards:
- All UI components accessible (WCAG 2.1 AA)
- Responsive design across all screen sizes
- Consistent design system throughout application
- Professional typography and spacing patterns
- SEO optimization and meta tag management

### Deliverables:
- Application structure and configuration
- Component library setup and customization
- Design system with tokens and variables
- Navigation components and routing setup
- Accessibility standards and testing setup
```

**Coordination Integration Points:**

- Component naming conventions
- Design token definitions (colors, spacing, typography)
- Page routing structure
- State management patterns

### 4. Deployment Configuration Agent

**Task Scope:** Production deployment setup + CI/CD + environment management
**Coordination Requirements:** Minimal - environment variable conventions only
**Quality Standards:** Production-ready deployment + monitoring setup
**Evidence:** Proven success - enabled seamless production deployment

**Specification Template:**

```
## Deployment Configuration Agent Task

### Primary Objectives:
- Set up production deployment configuration for the {deployment platform}
- Implement environment management for development/staging/production
- Create CI/CD pipeline with quality checks
- Establish monitoring and error tracking

### Technical Requirements:
- {deployment platform} configuration
- Environment variable management
- Database hosting setup (managed instance of the {database engine})
- CI/CD pipeline running the project's gates
- Error monitoring and performance tracking

### Quality Standards:
- Zero-downtime deployment patterns
- Comprehensive environment variable management
- Automated testing in CI/CD pipeline
- Production monitoring and alerting
- Security scanning and vulnerability checking

### Deliverables:
- {deployment platform} configuration
- Environment management setup
- CI/CD pipeline configuration
- Monitoring and error tracking setup
- Production database configuration
```

**Coordination Integration Points:**

- Environment variable naming conventions
- Build script requirements
- Testing pipeline integration points
- Production URL and domain configuration

## Contract-Code Integration Specifications (⚠️ Requires Coordination Architecture)

### 5. API Types Agent (with Coordination Mechanisms)

**Task Scope:** Complete shared contract types + route map
**Coordination Requirements:** HIGH - Contract-first approach with cross-agent validation required
**Quality Standards:** Type-safe contract + comprehensive API design
**Evidence:** Coordination challenges identified, systematic solutions developed

**Quick Overview:**

```
## API Types Agent Task (Coordination-Enhanced)

### Primary Objectives:
- Define complete request/response types for all resources and operations
- Implement a contract-first development approach
- Create comprehensive API documentation (route map)
- Establish type safety contracts for other agents

### Technical Requirements:
- Shared type definitions with full coverage (request DTOs + response types)
- {validation library} rules attached to request DTOs; a derived partial form for updates
- A route map (method + path + request/response type) for all operations
- Type safety integration with the project's type system
- Documentation for every type/route

### COORDINATION REQUIREMENTS (Critical):
- **Field Naming Convention Lock:** {the one case convention, with three real field names}
- **Cross-Agent Validation:** Provide the shared types module for the handler and UI agents
- **Type Definition Sharing:** Export the contract types for cross-agent use
- **Contract Review Protocol:** Other agents must validate against the actual types, not assumptions

### Quality Standards:
- All operations fully typed (request + response)
- Types follow the project's API and contract best practices
- Comprehensive documentation for all types
- Performance considerations for payload shapes
- Security considerations for data exposure

### Deliverables:
- Complete shared types module
- Request DTOs with validation rules
- Route map documentation
- Type safety integration setup
- Cross-agent coordination files (type exports)
```

**Mandatory Coordination Integration:**

- Shared types module export for other agents to import
- Contract types that other agents inherit
- Field naming convention documentation
- Contract evolution and versioning protocols

### 6. REST Controllers Agent (Contract-Dependent)

**Task Scope:** Request handlers + service implementation + data access patterns
**Coordination Requirements:** HIGH - Must reference actual DTOs from the Types Agent
**Quality Standards:** Type-safe handlers + optimal query patterns
**Evidence:** Field naming mismatch challenges, systematic coordination solution designed

**Enhanced Specification Template:**

```
## API Handlers Agent Task (Contract-Coordination Required)

### Primary Objectives:
- Implement request handlers for all routes in the route map
- Create efficient database query patterns through the data-access layer
- Establish data access and caching strategies
- Implement authentication and authorization logic

### Technical Requirements:
- {backend framework} handlers (one per route in the map) + services
- {data-access layer} integration for database operations
- Query optimization and N+1 problem prevention
- Authentication guards and request context setup
- Error handling for database operations (framework error translation, real status codes)

### COORDINATION REQUIREMENTS (Critical):
- **Types Import Mandatory:** Must import and reference the actual DTOs from the Types Agent
- **Field Name Validation:** All handler request/response field names must match the DTOs exactly
- **Type Inheritance:** Use the shared types from the Types Agent, never duplicate
- **Cross-Validation Protocol:** Verify field compatibility before implementation

### Quality Standards:
- All handlers fully type-safe with the shared DTOs
- Optimal database query patterns (no N+1 problems)
- Comprehensive error handling and logging
- Authentication and authorization throughout
- Performance monitoring for query optimization

### Deliverables:
- Complete handler + service implementation
- Database query optimization
- Authentication and authorization logic
- Error handling and logging setup
- Performance monitoring integration
```

**Mandatory Coordination Requirements:**

- Import contract types from the Types Agent (not recreate)
- Use exact field names from the DTOs (automated validation recommended)
- Inherit types from the shared types module
- Cross-agent field compatibility verification

### 7. UI Component Agent (Data-Layer Dependent)

**Task Scope:** Frontend components + services + API data integration
**Coordination Requirements:** HIGH - Must use the actual endpoints and shared types
**Quality Standards:** Professional UI + type-safe data integration
**Evidence:** Data structure assumption challenges, coordination solutions identified

**Enhanced Specification Template:**

```
## UI Component Agent Task (Data-Coordination Required)

### Primary Objectives:
- Implement {frontend framework} components for all application features
- Create data services on top of the project's HTTP client for data management and state
- Integrate with the documented endpoints for data fetching
- Establish UI patterns and component composition

### Technical Requirements:
- {frontend framework} components with the project's type integration
- Data services for fetching and state management, using the framework's reactivity primitive
- HTTP client calls to the documented routes
- Component composition and reusability patterns
- Responsive design and accessibility standards

### COORDINATION REQUIREMENTS (Critical):
- **Endpoint Reuse:** Must call the actual routes from the Handlers Agent's route map
- **Type Inheritance:** Use the shared types from the Types Agent for all component inputs
- **Library Version Alignment:** Use the HTTP client service patterns consistently
- **Data Structure Validation:** Verify component data expectations match the actual DTOs

### Quality Standards:
- All components fully type-safe with the API response types
- Consistent component patterns and composition
- Accessibility standards (WCAG 2.1 AA) throughout
- Responsive design across all screen sizes
- Professional UI patterns and user experience

### Deliverables:
- Complete component implementation
- Data services for data management
- HTTP client registration and base-URL configuration
- Component documentation and usage examples
- Accessibility and responsive design validation
```

**Mandatory Coordination Requirements:**

- Call the actual endpoints (not invent new paths)
- Use the shared types from the Types Agent
- HTTP client pattern consistency
- Data structure expectation validation against the actual DTOs

## Agent Specification Usage Guidelines

### For Low-Risk Parallel Tasks (Infrastructure-Independent)

1. **Direct Implementation:** Use specifications as-is with minimal coordination overhead
2. **Basic Conventions:** Establish naming conventions and basic integration points only
3. **Quality Focus:** Emphasis on individual agent quality and professional standards
4. **Simple Integration:** Integration testing straightforward and low-risk

### For High-Risk Parallel Tasks (Schema-Code Dependencies)

1. **Coordination Architecture First:** Implement systematic coordination mechanisms before parallel execution
2. **Technology Stack Lock:** Establish all library versions and patterns before agent execution
3. **Cross-Agent Validation:** Mandatory verification of compatibility during execution
4. **Integration Validation Layer:** Systematic testing between parallel completion and delivery

### Quality Standards for All Specifications

- **Professional Development Practices:** the project's lint, type and test discipline throughout
  (@.claude/orchestration/core/methodology/validation-gates.md)
- **A/A+ Code Quality:** Professional standards maintained across all parallel agents
- **Documentation Requirements:** Clear documentation for coordination and maintenance
- **Integration Readiness:** All agents deliver integration-ready code, not just functional code

## Evidence Base and Validation

### Low Coordination Success Patterns

- **Infrastructure-Independent Specifications:** All 4 agents completed successfully with seamless integration
- **Professional Quality:** A+ grade code delivered across all parallel agents
- **Integration Success:** Fresh clone → working application achieved

### High Coordination Learning Integration

- **Coordination Architecture Requirements:** Specifications enhanced with systematic coordination mechanisms
- **Technology Stack Management:** Library version and pattern coordination built into specifications
- **Cross-Agent Communication:** Validation and consultation protocols integrated into high-risk specifications
- **Integration Validation:** System-level testing requirements added to all coordination-required specifications

## How to Use This Library

### Quick Reference (This File)

Use this file to:

- **Decide which agents you need** for your feature
- **Understand coordination requirements** (low/medium/high)
- **See proven patterns** from low/high coordination experiments
- **Get quick overview** of agent capabilities

### Detailed Specifications (`.claude/orchestration/core/templates/agent-prompts/` directory)

Two agent types have a standalone file here, for when you want more than the inline "Quick Overview"/"Specification
Template" blocks above:

- Testing Infrastructure Agent (`testing-infrastructure-agent.md`)
- Infrastructure Agent (`infrastructure-patterns.md`)

**Every other agent type in this file (Database Setup, API Scaffolding, UI Foundation, Deployment Config, API
Types, REST Controllers, UI Component) does not have a separate template file.** Its "Quick Overview" /
"Specification Template" block above is the complete, copy-paste-ready spec — use it directly rather than looking
for a file that doesn't exist. If a pattern repeats often enough to be worth extracting into its own file, add it to
`.claude/orchestration/core/templates/agent-prompts/` and update this section.

---

## Status: Agent Specifications Ready for Replication

** Low-Risk Specifications:** Infrastructure-independent patterns validated and reusable
** High-Risk Specifications:** Schema-code coordination mechanisms systematically designed
** Quality Standards:** Professional development practices maintained throughout
** Evidence-Based:** All specifications tested through actual parallel execution with documented results

**Ready for:** Future implementation using proven specifications with appropriate coordination architecture.
