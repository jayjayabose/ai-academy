# Coordination Protocols — worked instances (Node / NestJS / Angular / Sequelize / Jest)

Companion to `core/methodology/coordination-protocols.md`. Section headings match. The protocols live there;
the filled-in slots live here, because a library version is only ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone
and fill the same slots with the project's own stack, or contribute an `examples/<stack>/` pack.

---

## 1.2 Technology Stack Coordination Lock — the filled template

```markdown
## Technology Stack Template (Pre-Execution)

### Required Before Any Parallel Execution

#### Library Versions (Exact Specifications)

- **Frontend:** Angular (standalone SPA with `HttpClient`)
- **Backend:** NestJS (modular REST API — feature modules + controllers)
- **TypeScript:** Version 6.0+ with strict mode enabled
- **API:** REST over HTTP (JSON); shared TypeScript DTO/interface types as the contract
- **Database:** PostgreSQL 18+ with Sequelize ORM
- **UI Components:** Angular Material with specific component patterns
- **Testing:** Jest for all test suites
- **Package Manager:** npm

#### Naming Conventions (Mandatory Consistency)

- **Field Names:** camelCase throughout (leadId, budgetMin, firstName)
- **File Names:** kebab-case for components (user-profile.component.ts)
- **Function Names:** camelCase with descriptive patterns
- **Type Names:** PascalCase for interfaces and types

#### Import Patterns (Consistency Required)

- **HttpClient:** `import { HttpClient } from '@angular/common/http'` (services use `inject(HttpClient)`)
- **NestJS:** Consistent decorator and module imports
- **TypeScript:** Explicit type imports and exports
- **Component Library:** Consistent component import patterns
- **Sequelize:** Model and migration pattern consistency

#### Error Handling Patterns

- **API Errors:** Consistent error response format with real HTTP status codes (400/401/404/409)
- **HTTP Errors:** NestJS exception filters + Angular `HttpErrorResponse` handling
- **UI Errors:** Consistent error boundary and display patterns
- **Validation:** Consistent input validation and error messaging
```

## 2.2 Shared Context Management System — the actual filenames

| Core slot | This project |
| --- | --- |
| API contract module | `api-types.ts` — shared TypeScript DTO/interface types authored by the Types Agent |
| Integration points module | `integration-points.ts` |
| Conventions | `conventions.md` |
| HTTP client the UI Agent uses | Angular `HttpClient` |

## Step 1: Types Agent — the instance

- **Field Naming Lock:** camelCase (`leadId`, `budgetMin`, `budgetMax`)
- **Type Export Setup:** DTO/interface types exported from `api-types.ts`
- **Validation Setup:** `class-validator` rules defined on the request DTOs

## Step 2: Handler Agent — the instance

Named the **Controller Agent** here, because NestJS calls that layer a controller.

- **Error Handling Consistency:** NestJS exception filters + real HTTP status codes
- **Integration testing setup:** Supertest, so the UI Agent can validate against real routes

## Step 3: UI Agent — the instance

- **Library Version Verification:** confirm `HttpClient` patterns are used consistently
- **Endpoint Reuse Only:** call the documented REST routes via `HttpClient`, never invent paths
- **Error handling:** verify against actual Angular `HttpErrorResponse` status codes

## Integration Validation Checklist — the instance

- REST specifics: all `GET` endpoints return expected data; all `POST`/`PATCH`/`DELETE` endpoints execute
  with proper status codes and error handling.
- `HttpClient` service patterns used consistently across all Angular components.
- End-to-end: `git clone` → `npm install` → `npm run dev` → working application.
- Quality: TypeScript compilation successful with no errors; ESLint and formatting standards consistent.

---

## Deliberately not here: the validation gates

Core §"Pre-Completion Validation Protocol" used to enumerate TypeScript compilation, ESLint and the test
suite with their `npm` commands, plus a full manual-browser-testing walkthrough with `npm run dev` and the
DevTools shortcut. That was another copy of `core/methodology/validation-gates.md`, not an example, so it was
replaced with a cross-reference rather than moved into this pack.

The commands themselves already live in `validation-gates-examples.md` in this directory, once.
