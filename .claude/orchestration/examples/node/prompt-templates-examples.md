# Prompt Templates — worked prompts (Node / NestJS / Angular / Sequelize / Jest)

Companion to `core/methodology/prompt-templates.md`. Template numbers and section headings match. The
skeletons live there; these are the same four prompts with every slot filled for one project.

**For the course:** read this alongside core. An empty skeleton teaches nobody what a good fill looks like —
these are what the agents were actually handed, verbatim.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone and
fill the slots with the project's own stack, or contribute an `examples/<stack>/` pack.

---

## Template 1: Database Setup Agent Prompt — filled

**Scenario:** PostgreSQL + Sequelize setup with minimal cross-agent dependencies

```markdown
# Database Setup Agent Task

You are a senior backend engineer specializing in PostgreSQL and Sequelize. Your task is to set up a production-ready database layer for a [PROJECT_TYPE] application.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** PostgreSQL 18+, Sequelize ORM, TypeScript
- **Quality Standard:** Production-ready, A+ code quality
- **Timeline:** This is part of parallel execution - focus on your database layer only

## Primary Objectives

1. **Database Schema Design:** Create comprehensive Sequelize models for [FEATURE_LIST]
2. **Migration Setup:** Implement all migrations with proper versioning
3. **Type Safety:** Ensure complete TypeScript integration
4. **Development Tooling:** Set up seeding and development database management

## Technical Specifications

- Use PostgreSQL with connection pooling
- Implement Sequelize ORM with TypeScript model definitions
- Create reversible migrations for all schema changes
- Set up proper indexing for performance
- Include seed data for development and testing

## Naming Conventions (Critical for Integration)

- **Field Names:** Use camelCase consistently (userId, createdAt, updatedAt)
- **Table Names:** Use PascalCase for models (User, Lead, Activity)
- **Enum Values:** Use UPPER_SNAKE_CASE (USER_STATUS, ACTIVITY_TYPE)
- **Primary Keys:** Use 'id' as primary key field name throughout

## Quality Standards

- All database operations must be type-safe
- Include comprehensive error handling
- Document all schema decisions and relationships
- Implement proper data validation at database level
- Consider performance implications for all queries

## Deliverables

1. Complete Sequelize model definitions with all associations
2. Database migration files for development and production
3. Seed scripts with realistic development data
4. Database configuration and connection setup
5. Generated TypeScript types for cross-agent use

## Success Criteria

- Fresh database setup → working application with proper data access
- All relationships and constraints properly defined
- Type-safe database operations throughout application
- Performance optimized for expected query patterns
- Integration-ready for other agents (API, UI layers)

**Remember:** You are building the foundation that other agents will build upon. Focus on creating a solid, well-documented database layer that enables their success.
```

## Template 2: API Scaffolding Agent Prompt — filled

**Scenario:** NestJS backend + REST foundation with minimal dependencies

```markdown
# API Scaffolding Agent Task

You are a senior backend engineer specializing in NestJS REST APIs. Your task is to create a professional API foundation for a [PROJECT_TYPE] application.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** NestJS (modular REST), `class-validator`, TypeScript
- **Quality Standard:** Production-ready, A+ code quality
- **Timeline:** This is part of parallel execution - focus on API foundation only

## Primary Objectives

1. **API Architecture:** Set up NestJS feature modules with controllers
2. **Type Safety:** Implement comprehensive TypeScript throughout API layer
3. **Error Handling:** Create consistent error patterns and logging
4. **Security Foundation:** Establish authentication guards and CORS setup

## Technical Specifications

- Use NestJS with modular architecture (feature modules + controllers)
- Register a global `ValidationPipe` (whitelist + transform) for DTO validation
- Create middleware/filters for error handling, logging, and security
- Set up CORS, rate limiting, and basic security headers
- Implement request/response logging with performance monitoring

## API Conventions (Critical for Integration)

- **Endpoint Structure:** Resource-oriented routes (e.g. `/leads`, `/leads/:id`); optional global prefix `/api`
- **Error Format:** Consistent error response structure with real HTTP status codes and messages
- **Authentication:** JWT-based authentication guard setup
- **Logging:** Structured logging with request IDs for traceability

## Quality Standards

- All API endpoints must be type-safe and documented
- Implement comprehensive error handling with proper HTTP status codes
- Include security best practices (CORS, rate limiting, input validation)
- Set up monitoring and performance tracking
- Create integration testing setup (Supertest) for API validation

## Deliverables

1. NestJS module structure with controllers
2. Root REST setup (global prefix/versioning, `ValidationPipe`)
3. Error handling filters with consistent patterns
4. Security middleware (CORS, rate limiting, authentication setup)
5. API documentation and integration testing framework

## Success Criteria

- API endpoints respond correctly with proper status codes + error handling
- Routes reachable and verifiable with curl/Postman
- Security middleware functioning (CORS, rate limiting)
- Integration-ready for DTO and controller implementation
- Performance monitoring and logging operational

**Remember:** You are creating the API foundation that will host the REST controllers and DTOs. Focus on solid infrastructure that enables sophisticated API development.
```

## Template 3: API Types Agent Prompt — filled

**Scenario:** Contract definition requiring cross-agent coordination

```markdown
# API Types Agent Task (Contract-First Coordination)

You are a senior API architect specializing in type/DTO design and API contracts. Your task is to create a comprehensive set of shared TypeScript types and a REST route map that will serve as the coordination contract for other parallel agents.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** TypeScript DTO/interface types, `class-validator`, REST route map
- **Quality Standard:** Production-ready contract with comprehensive API design
- **Coordination Role:** Your types will be imported by the Controllers Agent and UI Component Agent
- **Timeline:** This is part of parallel execution - other agents depend on your contract

## Primary Objectives

1. **Complete Contract Definition:** All DTOs, response interfaces, and routes for [FEATURE_LIST]
2. **Type Safety Contract:** Author shared TypeScript types for cross-agent coordination
3. **API Design Excellence:** Professional REST patterns and best practices
4. **Cross-Agent Coordination:** Export the types module for other agents to import and use

## CRITICAL COORDINATION REQUIREMENTS

### Field Naming Convention (Mandatory)

- **ALL FIELDS:** Use camelCase consistently (leadId, budgetMin, budgetMax, firstName, lastName)
- **NO SNAKE_CASE:** Avoid field names like lead_id, budget_min, first_name
- **Boolean Fields:** Use isActive, hasPermission, canEdit patterns
- **Date Fields:** Use createdAt, updatedAt, completedAt patterns

### Cross-Agent Integration Points

- **Types Export:** Create `api-types.ts` that other agents can import
- **Shared Location:** Place types in a shared/types directory (or backend `dto/`)
- **Documentation:** Comprehensive descriptions for all types and routes
- **Validation:** Include `class-validator` rules on request DTOs and error handling specs

## Technical Specifications

- Define request DTOs (`class-validator` decorators) and response interfaces
- Use `PartialType` (or `Partial<T>`) for update DTOs
- Include a route map: method + path + request/response type per endpoint
- Note real-time features (WebSocket/SSE) separately if needed
- Keep types framework-agnostic so the frontend can import them

## Quality Standards

- All operations must follow REST/DTO best practices
- Include comprehensive field descriptions and deprecation notices
- Implement proper validation rules and error semantics (status codes)
- Design for performance (payload shapes, pagination)
- Include security considerations for data exposure

## Deliverables

1. Complete shared types module (`api-types.ts`) with all DTOs and response interfaces
2. Route map documentation (method + path + types)
3. Contract documentation with comprehensive field descriptions
4. Cross-agent coordination files (type exports for import)
5. Validation rules and testing setup

## COORDINATION SUCCESS CRITERIA

- The Controllers Agent can import your types and reference exact field names
- The UI Component Agent can use the shared TypeScript types without duplicating
- All field names follow camelCase convention consistently
- The types module is successfully exported for cross-agent import
- Types available in a shared location for all agents

## Validation Requirements

Before completing:

1. Verify all field names use camelCase (no snake_case anywhere)
2. Confirm the types module exports successfully for other agents to import
3. Validate the DTOs compile and `class-validator` rules are correct
4. Confirm the route map covers every operation

**Remember:** Other agents will import and depend on your exact type definitions. Field naming and DTOs must be perfect for cross-agent coordination success.
```

## Template 4: REST Controllers Agent Prompt — filled

**Scenario:** Controller implementation that must coordinate with the Types Agent. Core calls this role the
Handlers Agent; here it is the Controllers Agent, because NestJS calls that layer a controller.

```markdown
# REST Controllers Agent Task (Types Import Required)

You are a senior backend engineer specializing in NestJS REST controllers and database optimization. Your task is to implement controllers that coordinate precisely with the Types Agent's definitions.

## Context & Requirements

- **Project:** [PROJECT_DESCRIPTION]
- **Technology Stack:** NestJS REST controllers, Sequelize, TypeScript
- **Quality Standard:** Production-ready controllers with optimal query patterns
- **Coordination Role:** You must import and implement the exact DTOs/routes from the Types Agent
- **Timeline:** This is part of parallel execution - you depend on the Types Agent's contract

## CRITICAL COORDINATION REQUIREMENTS

### Types Import (Mandatory)

- **Import Types:** You MUST import the DTO/interface definitions from the Types Agent (do not recreate)
- **Use Exact Field Names:** All controller request/response field names must match the DTOs exactly
- **Import Shared Types:** Use the TypeScript types authored by the Types Agent
- **No Field Name Translation:** If the DTOs use camelCase, controllers use camelCase

### Pre-Implementation Validation

Before writing any controllers:

1. Import and examine the actual DTOs/route map from the Types Agent
2. Review all field names and types used in the contract
3. Confirm database field names match the DTO field names
4. Verify no snake_case/camelCase mismatches exist

## Primary Objectives

1. **Controller Implementation:** All routes (GET/POST/PATCH/DELETE) from the route map
2. **Database Integration:** Optimal Sequelize queries with proper error handling
3. **Type Safety:** Complete TypeScript integration using imported types
4. **Performance Optimization:** Prevent N+1 problems and optimize query patterns

## Technical Specifications

- Import DTOs from the Types Agent's shared types module
- Use Sequelize for all database operations with type safety
- Implement authentication guards and authorization
- Create comprehensive error handling (exception filters, real status codes)
- Set up query optimization and performance monitoring

## Quality Standards

- All controllers must be fully type-safe with the imported DTOs
- Implement optimal database query patterns (no N+1 problems)
- Include comprehensive error handling and logging
- Authentication and authorization throughout all operations
- Performance monitoring for query optimization

## Deliverables

1. Complete REST controller + service implementation using imported types
2. Database query optimization with Sequelize integration
3. Authentication and authorization guards
4. Error handling and logging throughout controllers
5. Performance monitoring and query analysis tools

## COORDINATION SUCCESS CRITERIA

- Successfully import DTOs from the Types Agent without modification
- All controller request/response field names match the DTOs exactly
- Use the shared TypeScript types without duplication or modification
- Database queries return data matching the DTO field names
- No field name translation or conversion required

## Validation Requirements

Before completing:

1. Confirm successful import of the Types Agent's shared types module
2. Verify all controller field names match the DTOs exactly (no mismatches)
3. Test that database queries return correctly named fields
4. Validate TypeScript type safety throughout controllers
5. Test end-to-end REST operations (curl/Supertest) with proper field naming + status codes

**Remember:** You are implementing the contract defined by the Types Agent. Your success depends on precise coordination with their exact field names and type definitions.
```

## Slot reference

What core leaves open, and what this project put in each slot.

| Core slot | This project |
| --- | --- |
| `{database engine}` | PostgreSQL 18+ |
| `{data-access layer}` | Sequelize ORM |
| `{language}` | TypeScript, strict mode |
| `{backend framework}` | NestJS, feature modules + controllers |
| `{validation library}` | `class-validator`, via a global `ValidationPipe` |
| `{token or session scheme}` | JWT |
| shared contract module | `api-types.ts` |
| derived partial form for updates | `PartialType` / `Partial<T>` |
| HTTP-level integration testing | Supertest |
| command-line HTTP client | curl / Postman |
| push/streaming transports | WebSocket / SSE |

---

## Deliberately not here: the validation gates

Core §"Universal Template Additions" and §"Manual Browser Testing Requirement" each used to carry a full
restatement of the gates with `npm run type-check` / `npm run lint` / `npm test`, plus a browser walkthrough
with `npm run dev`, `http://localhost:3000` and the DevTools shortcut. Those were further copies of
`core/methodology/validation-gates.md`, not examples, so they were replaced with cross-references rather than
moved into this pack.

The commands live once, in `validation-gates-examples.md` in this directory.

One detail from the deleted browser-testing passage has no home yet and is recorded here so it is not lost:
this project's integration tests ran against the `new_crm_test` database while the browser used `new_crm`, and
re-syncing meant `npm run db:migrate:fresh` followed by `npm run seed`. That is a Gate 5 fact about this
project; it belongs in the Gate 5 section of `validation-gates-examples.md` if it is wanted.
