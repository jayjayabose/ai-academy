# Agent Specs Library — worked specs (Node / NestJS / Angular / Sequelize / Jest)

Companion to `core/methodology/agent-specs-library.md`. Section numbers and headings match. The seven roles and
the spec shape live there; these are the same seven specs with every slot filled for one project.

**For the course:** read this alongside core. The role is the decision — which agents does this feature need.
These fills are what those agents were actually told.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone and
fill the slots with the project's own stack, or contribute an `examples/<stack>/` pack.

---

## 1. Database Setup Agent — filled

**Task Scope:** PostgreSQL + Sequelize setup with complete schema implementation

```
## Database Setup Agent Task

### Primary Objectives:
- Set up PostgreSQL database with production-ready configuration
- Implement Sequelize ORM with complete schema definition
- Create all necessary migrations for data model
- Ensure type-safe database access throughout application

### Technical Requirements:
- PostgreSQL database (version 14+)
- Sequelize ORM with TypeScript integration
- Database migrations in version control
- Seed data for development and testing
- Connection pooling and error handling

### Deliverables:
- Sequelize models with complete data model
- Database migration files
- Seed scripts for development data
- Database configuration and connection setup
- Type definitions generated from models
```

**Coordination Integration Points, filled:** schema naming conventions camelCase; timestamp fields `createdAt`
and `updatedAt`.

## 2. API Scaffolding Agent — filled

**Task Scope:** NestJS modular REST API setup with type-safe foundations

```
## API Scaffolding Agent Task

### Primary Objectives:
- Set up NestJS backend with modular architecture
- Implement a modular REST API (feature modules + controllers)
- Create type-safe API foundations with TypeScript
- Establish error handling and logging patterns

### Technical Requirements:
- NestJS 11.x with module-based architecture
- REST controllers (`@nestjs/platform-express`) with a global `ValidationPipe`
- TypeScript integration throughout API layer
- Comprehensive error handling (exception filters)
- Request logging and performance monitoring

### Quality Standards:
- Integration testing setup for API endpoints (Supertest)

### Deliverables:
- NestJS module structure
- Root REST setup (global prefix/versioning, `ValidationPipe`)
- Error handling middleware (exception filters)
- API documentation and type definitions
- Security configuration and middleware
```

**Coordination Integration Points, filled:** REST route naming conventions; shared DTO/type extension points.

## 3. UI Foundation Agent — filled

**Task Scope:** Angular app structure + component library + routing setup

```
## UI Foundation Agent Task

### Primary Objectives:
- Set up Angular application structure with modern tooling
- Implement component library (Angular Material) with customization
- Create routing structure with Angular Router
- Establish design system and styling conventions

### Technical Requirements:
- Angular with TypeScript and modern build tools
- Angular Material component library implementation
- Tailwind CSS with custom design tokens
- Responsive design patterns and accessibility standards
- Angular Router for navigation and routing

### Deliverables:
- Angular application structure and configuration
- Component library setup and customization
- Design system with tokens and variables
- Navigation components and routing setup
- Accessibility standards and testing setup
```

## 4. Deployment Configuration Agent — filled

**Task Scope:** Vercel deployment + CI/CD + environment management

```
## Deployment Configuration Agent Task

### Primary Objectives:
- Set up production deployment configuration for Vercel
- Implement environment management for development/staging/production
- Create CI/CD pipeline with quality checks
- Establish monitoring and error tracking

### Technical Requirements:
- Vercel deployment configuration
- Environment variable management
- Database hosting setup (external PostgreSQL)
- CI/CD pipeline with testing and linting
- Error monitoring and performance tracking

### Deliverables:
- Vercel deployment configuration
- Environment management setup
- CI/CD pipeline configuration
- Monitoring and error tracking setup
- Production database configuration
```

## 5. API Types Agent — filled

**Task Scope:** Complete shared TypeScript DTO/interface types + REST route map

```
## API Types Agent Task (Coordination-Enhanced)

### Technical Requirements:
- Shared TypeScript type definitions with full coverage (request DTOs + response interfaces)
- `class-validator` decorators on request DTOs; `PartialType` for updates
- A route map (method + path + request/response type) for all operations
- Type safety integration with TypeScript
- Documentation for every type/route

### COORDINATION REQUIREMENTS (Critical):
- **Field Naming Convention Lock:** Use camelCase throughout (leadId, budgetMin, budgetMax)
- **Cross-Agent Validation:** Provide the shared types module for controller and UI agents
- **Type Definition Sharing:** Export DTO/interface types for cross-agent use
- **Contract Review Protocol:** Other agents must validate against the actual types, not assumptions

### Quality Standards:
- Types follow REST/DTO best practices

### Deliverables:
- Complete shared types module (`api-types.ts`)
- Request DTOs with validation rules
- Route map documentation
- Type safety integration setup
- Cross-agent coordination files (type exports)
```

## 6. REST Controllers Agent — filled

**Task Scope:** REST controllers + service implementation + data access patterns. Core calls this role the
Handlers Agent; here it is the Controllers Agent, because NestJS calls that layer a controller.

```
## REST Controllers Agent Task (Contract-Coordination Required)

### Primary Objectives:
- Implement REST controllers for all routes in the route map
- Create efficient database query patterns with Sequelize
- Establish data access and caching strategies
- Implement authentication and authorization logic

### Technical Requirements:
- NestJS controllers (`@Controller`/`@Get`/`@Post`/`@Patch`/`@Delete`) + services
- Sequelize integration for database operations
- Query optimization and N+1 problem prevention
- Authentication guards and request context setup
- Error handling for database operations (exception filters, real status codes)

### Deliverables:
- Complete REST controller + service implementation
- Database query optimization
- Authentication and authorization logic
- Error handling and logging setup
- Performance monitoring integration
```

**Mandatory Coordination Requirements, filled:** inherit TypeScript types from the shared types module.

## 7. UI Component Agent — filled

**Task Scope:** Angular components + services + REST data integration

```
## UI Component Agent Task (Data-Coordination Required)

### Primary Objectives:
- Implement Angular components for all application features
- Create data services (HttpClient) for data management and state
- Integrate with the REST endpoints for data fetching
- Establish UI patterns and component composition

### Technical Requirements:
- Angular components with TypeScript integration
- HttpClient data services for fetching and state management (signals)
- `HttpClient` calls to the documented REST routes
- Component composition and reusability patterns
- Responsive design and accessibility standards

### COORDINATION REQUIREMENTS (Critical):
- **Endpoint Reuse:** Must call the actual REST routes from the Controllers Agent's route map
- **Type Inheritance:** Use the shared types from the Types Agent for all props
- **Library Version Alignment:** Use `HttpClient` service patterns consistently
- **Data Structure Validation:** Verify component data expectations match the actual DTOs

### Deliverables:
- Complete Angular component implementation
- HttpClient data services for data management
- `provideHttpClient()` wiring and base-URL configuration
- Component documentation and usage examples
- Accessibility and responsive design validation
```

**Mandatory Coordination Requirements, filled:** `HttpClient` pattern consistency; use the shared TypeScript
types from the Types Agent.

## Quality Standards for All Specifications — the instance

Professional development practices here meant ESLint, TypeScript and Jest throughout. The gate commands that
enforce them are in `validation-gates-examples.md` in this directory.

---

## Slot reference

| Core slot | This project |
| --- | --- |
| `{database engine}` | PostgreSQL 14+ |
| `{data-access layer}` | Sequelize ORM |
| `{backend framework}` | NestJS 11.x, `@nestjs/platform-express` |
| `{validation library}` | `class-validator` + global `ValidationPipe` |
| derived partial form for updates | `PartialType` |
| `{frontend framework}` | Angular |
| `{component library}` | Angular Material |
| `{styling system}` | Tailwind CSS |
| `{router}` | Angular Router |
| framework reactivity primitive | Angular signals |
| HTTP client | Angular `HttpClient`, registered with `provideHttpClient()` |
| `{deployment platform}` | Vercel |
| shared contract module | `api-types.ts` |
| HTTP-level integration testing | Supertest |
