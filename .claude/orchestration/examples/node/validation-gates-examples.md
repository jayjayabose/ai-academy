# 5 Validation Gates — worked commands (Node / NestJS / Angular / Sequelize / Jest)

Companion to `core/methodology/validation-gates.md`. Gate numbers match. The gates live there; the commands that
satisfy them live here, because a command is only ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone and write
the four commands your project actually runs. There are only four, and getting them wrong is obvious immediately.

---

## Gate 1: Type / Compile Check

```bash
npm run type-check
```

**Expected output:** `✔ No TypeScript errors`

## Gate 2: Lint

```bash
npm run lint
```

**Expected output:** `✔ No ESLint warnings or errors`

## Gate 3: Tests Passing

```bash
npm test
```

The two tiers in this project are both Jest. The integration tier runs against a real PostgreSQL database through
Sequelize, with no `jest.mock` of the service under test.

The bug class it caught that the mocked tier could not: PostgreSQL returning strings where the code expected `Date`
objects, and malformed UUIDs passing validation that never ran.

## Gate 4: Process Cleanup (Resource Check)

```bash
# Check what's running on this project's dev ports
lsof -i :3000  # Backend server
lsof -i :3001  # Frontend server
```

Fix:

```bash
# See what's using a port
lsof -i :3000

# Kill specific process by PID
kill <PID>

# Or kill by process name
pkill -f "nest start"
```

## Gate 5: Manual Testing

**Frontend** — Playwright MCP against the running dev server:

```bash
npm run dev
# Open http://localhost:3000
```

Browser console is opened with Cmd+Option+J (macOS) or F12.

**Backend** — curl against the running API:

```bash
# Example: REST login endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

Verified: status 200, body contains `token` and `user.email`.

---

## Session log block, filled in

```markdown
## Pre-Completion Validation Results

### Gate 1: Type / Compile Check
$ npm run type-check
✔ No TypeScript errors

### Gate 2: Lint
$ npm run lint
✔ No ESLint warnings or errors

### Gate 3: Tests
$ npm test
✔ Tests: X/X passing

### Gate 4: Process Cleanup
$ lsof -i :3000
(no output — no hanging processes)
✔ Clean development environment

### Gate 5: Manual Testing
- Browser testing (Playwright MCP):  All features work
- Console errors: None
- curl testing:  API returns expected responses

**All 5 gates passed: YES**
```
