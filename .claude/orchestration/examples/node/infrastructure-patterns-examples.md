# Infrastructure Prompt Library — filled in (Node / NestJS / Angular / TypeScript / Jest / PostgreSQL / Docker)

Companion to `core/templates/agent-prompts/infrastructure-patterns.md`. Section numbers and headings
match. The prompt skeletons live there with `{role}` placeholders; this pack is the same library with
every placeholder resolved, because a technology choice is only ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/`
alone and resolve each placeholder against your own stack. The resolution is a one-time decision per
project — write it down once and every prompt in the library inherits it.

---

## The placeholder table

| Core placeholder | This project |
| --- | --- |
| backend framework | NestJS |
| frontend framework | Angular |
| language / strict type checking | TypeScript, `strict: true` in `tsconfig.json` |
| containerised database service | PostgreSQL in Docker |
| test runner | Jest |
| component testing library | Angular Testing Library |
| task-runner manifest | `package.json` scripts |
| linter / formatter | ESLint / Prettier |
| CI workflow definition | GitHub Actions, `.github/workflows/test.yml` |
| styling system | Tailwind CSS |
| HTTP client | Angular `HttpClient` via `provideHttpClient()` |

---

## Category 1: Project Foundation

### 1.1 Full-Stack Foundation (Backend + Frontend + Database)

**Deliverables, as written:**

- NestJS backend setup
- Angular frontend setup
- TypeScript strict mode
- PostgreSQL Docker setup
- Database scripts (setup, seed, reset, migrate)
- NestJS REST API (controllers + DTOs)
- Basic UI components (Navigation, layout)

**Key adaptation:** database name — the prompts said `new_crm` throughout.

### 1.2 Testing Framework Infrastructure

**Deliverables:** Jest + Angular Testing Library setup; test scripts (`test`, `test:watch`,
`test:coverage`) in `package.json`.

**Prompt Template, filled in:**

```markdown
# Testing Framework Infrastructure Setup

**Agent Role:** Test Infrastructure Engineer
**Scope:** Moderate

## Context

{Project name} needs comprehensive testing infrastructure with Jest and Angular Testing Library. This infrastructure must be ready BEFORE feature agents begin work.

## Objectives

1. Install and configure Jest + Angular Testing Library
2. Create test scripts in package.json
3. Write example tests (service, component, controller)
4. Configure coverage reporting with 80% thresholds
5. Create test utilities and mocking patterns
6. Document testing patterns in tests/README.md

## Tech Stack

- Jest (test runner)
- Angular Testing Library (component testing)
- TypeScript (strict mode)
- {Add other relevant tech}

{Continue with detailed specifications...}
```

Note what stayed a placeholder even here: `{Project name}` and `{Add other relevant tech}`. Stack
resolution and per-feature resolution are different passes.

### 1.3 Integration Testing Infrastructure

**Reusable as-is:** replace the project name and verify the database setup matches your Docker config.

---

## Category 2: Backend Infrastructure

### 2.1 Database Setup (Containerised Database Service)

**Deliverables:** Docker container for PostgreSQL.

**Key Pattern:**

```javascript
// scripts/db-docker-setup.js
- Check Docker installed
- Clean up existing container
- Start PostgreSQL container
- Wait for database ready
- Update .env.local with connection string
```

### 2.2 REST API Layer

- Shared DTOs / response types foundation
- Global `ValidationPipe` (whitelist + transform)
- Error handling via NestJS exception filters

**Pattern:** NestJS feature module with REST controllers.

### 2.3 WebSocket Server Infrastructure

- WebSocket server (the `ws` library, not Socket.IO)
- Connection management as `Map<userId, Set<WebSocket>>`
- Concurrent server setup: NestJS and the WebSocket server in one process
- PubSub vs Redis — started with in-process PubSub, with Redis as the documented migration path

---

## Category 3: Frontend Infrastructure

Infrastructure for Angular applications.

### 3.1 UI Component Library Foundation

- Tailwind CSS setup
- **Pattern:** start with Angular Material or build custom

### 3.2 HTTP Client Setup (Angular HttpClient)

- `provideHttpClient()` configuration + API base URL
- HTTP interceptor (auth header, error mapping)
- Error handling patterns around `HttpErrorResponse`

---

## Category 4: Quality & Testing

### 4.1 ESLint + Prettier Configuration

- ESLint config with TypeScript support
- Prettier config
- Editor config (`.editorconfig`)
- Scripts for `lint:fix`

### 4.2 CI/CD Pipeline (GitHub Actions)

```yaml
.github/workflows/test.yml:
  - Checkout code
  - Setup Node.js
  - Install dependencies
  - Start test database
  - Run migrations
  - Run tests
  - Upload coverage
```

---

## For Existing Projects

The assessment commands, against this project's real layout:

```bash
# Check testing infrastructure
ls tests/setup.ts         # Test framework?
ls .env.test             # Separate test DB?
ls tests/integration/    # Integration tests?

# Check backend infrastructure
ls lib/db.ts            # Database utilities?
ls src/app/api/         # HTTP data services?
ls realtime/server.ts   # WebSocket server?
```

---

## Quality Standards for Infrastructure Prompts

**Fresh Clone Validation:** a new developer runs `npm run setup` and gets a working app, with no manual
steps.

**Test isolation:** `npm test` had to point at the separate `{project}_test` database, not the dev one —
the two are distinguished only by `.env.test`, so this was checked explicitly rather than assumed.

---

## Future Additions to Library

The candidate list with the products this project would have reached for:

### Backend

- File Upload Infrastructure — S3, or local storage
- Background Job System — Bull, cron
- Email Service — SendGrid, SES
- Caching Layer — Redis

### Frontend

- State Management — Zustand, Context
- Form Handling — Angular Reactive Forms

### DevOps

- Docker Compose (multi-service)
- Monitoring & Logging — Sentry, DataDog

### Quality

- E2E Testing — Playwright, Cypress
- Performance Testing — Lighthouse, load tests
- Security Scanning — `npm run audit`, OWASP
- Accessibility Testing — axe-core

Core keeps the categories and drops the product names, because the category is the decision and the
product is a preference that expires.

---

## Success Metrics

The three lines core replaced with a pointer to the gates, as this project originally wrote them:

```
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] All tests passing (unit + integration)
```

Kept here only as a record of the wording. **Do not copy these into a project checklist** — they are
Gates 1, 2 and 3, and the commands that satisfy them belong in
`validation-gates-examples.md`, which is the single place they are defined.

---

## Current Library Status

-  1.1 Full-Stack Foundation (NestJS + Angular)
-  1.2 Testing Framework (Jest)
-  1.3 Integration Testing
-  2.3 WebSocket Server
