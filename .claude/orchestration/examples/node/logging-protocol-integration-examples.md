# Logging Protocol Block — worked substitutions (Node / NestJS / Angular / Jest)

Companion to `core/methodology/logging-protocol-integration.md`. Section headings match. The blocks that go
into every agent prompt live there; the values you paste into them live here, because a test path is only
ever true of one project.

**For the course:** read this alongside core. Core tells you the prompt must name the test locations and the
three test commands; this pack is what naming them actually looked like.

**For an install:** take this pack only if the target is Node/NestJS/Angular/Jest. Otherwise take `core/`
alone and fill the same four slots — test locations, full run, watch, coverage — with your project's own.

---

## TESTING REQUIREMENTS (MANDATORY)

### Writing Tests

**Location Pattern** — the four paths this project wrote into every prompt:

- Services: `lib/services/__tests__/[service-name].test.ts`
- Components: `src/app/**/[component-name].component.spec.ts`
- Utils: `lib/utils/__tests__/[util-name].test.ts`
- Controllers: `src/**/*.controller.spec.ts`

**Running Tests** — the three modes:

```bash
npm test              # Run all tests once
npm run test:watch        # Watch mode during development
npm run test:cov          # Check coverage metrics
```

### Test Quality Standards

Descriptive test name, in Jest's `it()` form:

```typescript
it('should generate summary when lead has interactions', async () => { /* ... */ });
```

The name states the behaviour (`should generate summary`) and the condition that triggers it
(`when lead has interactions`). A name like `it('works')` costs a reader the whole test body.

### Pre-Completion Validation

- All tests passing: `npm test`
- Coverage ≥ 80% for new code: `npm run test:cov`

---

## API INTEGRATION VALIDATION (MANDATORY FOR FRONTEND AGENTS)

Client-side state in this project meant Angular signals and RxJS observables, so "manages client-side state"
in the trigger list read as: any component holding a `signal()` or subscribing to an `Observable`.

The teaching examples this logging produced were of Angular `HttpClient` usage — injection, typed responses,
`catchError` handling, and where the `async` pipe replaced a manual subscription.

---

## Deliberately not here: the validation gates

`core/methodology/logging-protocol-integration.md` used to end its testing block by pointing at
`coordination-protocols.md` for "type check, lint, process cleanup". That pointer now goes to
`core/methodology/validation-gates.md`, which is the one place those are defined. Nothing was moved into this
pack, because a gate definition is not an example.
