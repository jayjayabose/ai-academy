# Testing as Infrastructure — worked examples (Node / NestJS / Angular / Jest / Vitest)

Companion to `core/methodology/testing-as-infrastructure.md`. Section headings match. The pattern — testing framework
as a Task 0 deliverable — lives there; the six filled-in deliverables live here, because a test runner config is only
ever true of one stack.

**For the course:** read this alongside core. "Set up the testing framework first" is an instruction nobody argues
with and nobody follows; the six concrete artefacts below are what following it actually costs.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone and write
the six deliverables against the project's own runner.

**The coverage numbers below are this project's chosen values, not a bar.** `core/methodology/
testing-as-infrastructure.md` explains why a fixed percentage is a poor target; copying these thresholds without
deciding they suit your risk profile is the mistake that section warns about.

---

## Updated Task 0 Responsibilities — the stack-specific list

### OLD Task 0 (Early Iterations)

```
1. Project scaffolding (NestJS/Angular)
2. Database setup (PostgreSQL + Sequelize)
3. Development scripts (setup, seed, reset)
4. Environment configuration (.env templates)
```

### NEW Task 0 (Current Standard)

```
1. Project scaffolding (NestJS/Angular)
2. Database setup (PostgreSQL + Sequelize)
3. Development scripts (setup, seed, reset)
4. Testing framework (Jest + Testing Library) ← NEW
5. Test scripts (test, test:watch, test:coverage) ← NEW
6. Example tests proving framework works ← NEW
7. CI configuration for automated testing ← NEW
8. Environment configuration (.env templates)
```

## Technology Stack Detection — the selections this project made

**Backend-Heavy (NestJS APIs, Services):**

- Jest (NestJS standard)
- Supertest for API testing
- Database mocking utilities

**Frontend-Heavy (Angular, UI Components):**

- Vitest via Angular CLI (`ng test`) — the default runner in Angular 22+
- Angular `TestBed` + `ComponentFixture`
- `HttpTestingController` for HTTP mocking

**Full-Stack NestJS + Angular REST (Our Case):**

- Backend: Jest (NestJS default) + Supertest for API/E2E
- Frontend: Vitest (`ng test`) with Angular `TestBed`
- `HttpTestingController` (`@angular/common/http/testing`) for REST client tests
- Angular CLI `--coverage` (Vitest V8 provider) for frontend; Jest coverage for backend

**PWA (Angular service worker):**

- Vitest (`ng test`)
- Mock `SwPush` / `SwUpdate` from `@angular/service-worker`
- Fake `navigator.onLine` for offline-path tests

---

## Task 0 Testing Infrastructure Deliverables

### 1. Test Scripts in the Project's Task Runner

`package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### 2. Test Runner Configuration (Backend)

> The frontend uses Angular CLI (`ng test`, Vitest) and needs no hand-written
> config. The config below is for the NestJS backend.

**File:** `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  // These numbers are a starting point — tune them (up or down) to what this project needs.
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### 3. Test Setup File (Backend)

**File:** `tests/setup.ts`

```typescript
// Mock environment variables for the backend test run
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.OPENAI_API_KEY = 'test-key';
```

> Angular's frontend test environment is bootstrapped by the CLI's Vitest `unit-test`
> builder — provide test values through `environment.ts` or `TestBed` provider overrides,
> not `process.env`.

### 4. Example Tests (Proof Framework Works)

**File (backend):** `src/example.spec.ts`

```typescript
describe('Testing Framework Validation', () => {
  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
```

**File (frontend):** `src/app/example.component.spec.ts`

```typescript
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({ standalone: true, template: '<div>Testing Framework Works</div>' })
class TestComponent {}

describe('Component Testing Validation', () => {
  it('should render components', () => {
    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Testing Framework Works');
  });
});
```

### 5. CI Configuration

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 6. README Documentation

````markdown
## Testing

### Running Tests

```bash
npm test                  # Run all tests once
npm run test:watch        # Run tests in watch mode
npm run test:debug        # Debug tests
npm run test:cov          # Generate coverage report
```
````

### Writing Tests

- **Unit tests (services/utils):** `src/app/**/*.spec.ts`
- **Component tests:** `src/app/**/*.component.spec.ts`
- **Integration/E2E tests:** backend `test/**/*.e2e-spec.ts`; frontend Playwright `e2e/`

---

## Coverage Requirements by Code Type

### Service Layer (Backend Business Logic)

**Example (LeadSummaryService):**

```typescript
describe('LeadSummaryService', () => {
  it('should generate summary with valid interactions', async () => {
    // Mock OpenAI response
    // Test successful generation
    // Verify Zod validation
  });

  it('should retry on failure with exponential backoff', async () => {
    // Mock API failure on attempt 1
    // Mock success on attempt 2
    // Verify retry logic
  });

  it('should throw after max retries', async () => {
    // Mock failures on all attempts
    // Verify error thrown
  });
});
```

### REST Controllers

**Test Types:** Integration tests with mocked database (+ Supertest e2e against routes)

### UI Components

**Test Types:** Angular `TestBed` component tests with user event simulation

---

## Agent Prompt Template: Testing Requirements — the filled-in block

```markdown
### Writing Tests

**Location Pattern:**

- Services: `src/app/**/[service-name].service.spec.ts`
- Components: `src/app/**/[component-name].component.spec.ts`
- Utils: `src/app/**/[util-name].spec.ts`
- Controllers (backend): `src/**/[name].controller.spec.ts`

**Running Tests:**

npm test              # Run all tests
npm run test:watch    # Watch mode during development
npm run test:cov      # Check coverage
```

### Pre-Completion Validation

- [ ] All tests passing (`npm test`)
- [ ] Coverage meets this project's testing guideline for new code (`npm run test:cov`)

---

## Session Logging: Testing Strategy Section — the coverage table format

```
File                       | % Stmts | % Branch | % Funcs | % Lines
lib/services/my-service.ts |    85.2 |     78.5 |    90.0 |    84.8
```

---

## Evidence: Testing Framework Evolution — the project specifics

The separate test database in this project was `new_crm_test`, distinct from the `new_crm` development database. The
two-tier split ran the integration tier against a real PostgreSQL instance through Sequelize.

---

## Infrastructure Agent Task Specification — the stack-specific deliverables

**Technical Requirements:**

- Backend: Jest as test runner (NestJS standard) + Supertest for API/E2E
- Frontend: Vitest via Angular CLI (`ng test`) with `TestBed`
- `HttpTestingController` (`@angular/common/http/testing`) for REST client tests
- Angular CLI `--coverage` (Vitest V8 provider) + Jest coverage for the backend

**Deliverables:**

1. `jest.config.js` - Backend test configuration
2. `tests/setup.ts` - Backend global test setup
3. `src/example.spec.ts` - Example backend unit test
4. `src/app/example.component.spec.ts` - Example Angular component test
5. Updated `package.json` with test scripts
6. `.github/workflows/test.yml` - CI test automation
7. README section on testing

**Validation:**

- [ ] `npm test` runs successfully

---

## Curriculum Integration — the source project

The evidence in core comes from the `new-crm` project: Angular frontend, NestJS backend, PostgreSQL via Sequelize.

---

## Deliberately not here: the pre-completion validation commands

`core/methodology/testing-as-infrastructure.md` used to restate the type-check / lint / test / build commands under
"Pre-Completion Validation Enhanced". That was another copy of `core/methodology/validation-gates.md`, not an
example, so it was replaced with a cross-reference rather than moved into this pack. The commands themselves are in
`validation-gates-examples.md`, where there is exactly one copy of them.
