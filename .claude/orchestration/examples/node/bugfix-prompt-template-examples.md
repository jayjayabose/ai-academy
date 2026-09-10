# Bug Fix Prompt Template — worked instance (Node / NestJS / Angular / Sequelize / Jest)

Companion to `core/methodology/bugfix-prompt-template.md`. Section headings match. The template lives there;
the filled-in commands and paths live here, because a command is only ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone and
fill the same slots with the project's own commands, or contribute an `examples/<stack>/` pack.

---

## Bug #1 — the slot fills

- **File:** \`path/to/file.ts\` — this project's source files are TypeScript
- **Current Code / Fix Required fences:** \`\`\`typescript
- **Alternative approach when a type error persists:** type guards rather than type assertions

## PRE-TESTING SETUP — the commands

### 1. Verify Development Database Schema

```bash
# Try starting dev server:
npm run dev
# Check for database connection errors
```

If database errors appear, or features don't work in the browser:

```bash
# Apply migrations to development database:
npm run db:migrate

# Seed with test data:
npm run db:seed
```

**Why, concretely here:** integration tests use the separate test database `new_crm_test`; browser testing uses
the development database `new_crm`. They go out of sync, and only manual testing notices.

### 2. Start Development Server

```bash
npm run dev
```

Wait for the "Ready" message before browser testing.

## PRE-COMPLETION VALIDATION — the gate commands

The commands are the same four in `validation-gates-examples.md`; repeated here only because a bug-fix prompt
is pasted whole and the agent should not have to follow a link mid-task.

| Gate | Command | Passing output |
| --- | --- | --- |
| 1. Type / Compile Check | `npm run type-check` | `✔ No TypeScript errors` |
| 2. Lint | `npm run lint` | `✔ No ESLint warnings or errors` |
| 3. Tests | `npm test` | `Test Files {N} passed ({N})` / `Tests {M} passed ({M})` |
| 4. Process Cleanup | `lsof -i :3000 \| grep LISTEN` | `Port 3000 available ` |

Port cleanup when Gate 4 fails:

```bash
# Find and kill the process using the port
lsof -t -i:3000 | xargs kill -9
echo "Cleaned up lingering dev server process"

# Re-run check to verify cleanup
lsof -i :3000 | grep LISTEN || echo "Cleanup successful "
```

## Session Log Documentation — filled

```markdown
## Pre-Completion Validation Results

### Baseline (Before Fix)

- TypeScript: {X errors}
- ESLint: {X warnings}
- Tests: {X failing / Y passing}
- Resources: {status}

### After Fix

[Paste npm run type-check output]
✔ No TypeScript errors (0 errors) ← MUST show this

[Paste npm run lint output]
✔ No ESLint warnings or errors

[Paste npm test summary]
✔ Tests: {Y+X}/{Y+X} passing ← ALL must pass

[Paste lsof -i :3000 output]
Port 3000 available 

### Comparison

- TypeScript: {X} → 0 
- ESLint: {X} → 0 
- Tests: {X failing} → 0 failing 
- Resources: Clean 

**ALL VALIDATIONS PASSED**
```

## Warning Signs — the instance

- `npm run type-check` shows MORE errors than before
- `npm test` shows MORE failures than before
