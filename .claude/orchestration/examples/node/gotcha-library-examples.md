# Gotcha Library — worked symptoms (Node / NestJS / Angular / Sequelize / Jest)

Companion to `core/playbook/gotcha-library.md`. Section and gotcha headings match. The shape of each
problem lives there; the symptom exactly as it appeared here lives in this file, because a symptom is
only ever true of one stack.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/`
alone — the shapes transfer, the symptoms do not — and add an `examples/<stack>/` pack as your own
project accumulates them.

---

## Frontend Gotchas

### Field Naming Mismatches

Backend used `lead_id`; the frontend expected `leadId`. The fix in this project was `camelCase`
everywhere above the database, with the models/services as the single conversion boundary, and
agents importing the shared TypeScript API types instead of retyping field names.

See `pattern-library-examples.md` §3 for the full convention table and the prompt block that
enforced it.

---

## Backend Gotchas

### Database Type Mismatches

PostgreSQL returned strings where the TypeScript code expected `Date` objects. Reads went through
Sequelize; the mocked Jest tier returned real `Date` instances and so never saw it. The integration
tier, running against a real PostgreSQL database with no `jest.mock` of the service under test,
failed immediately.

---

## Testing Gotchas

### Long-Running Test Processes

Jest workers accumulated after tests that ran past two minutes. RAM exhaustion at 10GB+ made the
development machine unusable. The fix was a Jest `testTimeout` plus `--runInBand` for the
resource-intensive suites:

```bash
npx jest --runInBand path/to/heavy.spec.ts
```

Gate 4 exists because of this one. See `validation-gates-examples.md` for the `lsof` check.

### Type Errors While Tests Pass

`npm test` was green while `npm run type-check` reported 221 TypeScript errors — test files carry
type errors of their own, and Jest's transform does not type-check.

```bash
npm run type-check   # must be run separately; npm test will not catch this
```

---

## PWA Gotchas

### Service Worker Doesn't Register in Dev

`ng serve` never registers the Angular service worker — `@angular/service-worker` is wired up only
in a production build. Offline and install behaviour therefore "doesn't work" for the whole of
development, which reads as a broken feature rather than a disabled one.

```bash
ng build --configuration production
npx http-server dist/<app>/browser -p 8080
```

Test the PWA behaviour against that, not against `ng serve`.

### HTTPS Required on Real Devices

Install and offline worked on desktop `localhost` (which the browser exempts from the HTTPS
requirement) but not on a phone hitting `http://192.168.X.X`. Tunnelled with `ngrok` or
`cloudflared` to get an HTTPS origin for on-device testing.
