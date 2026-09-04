# Pattern Library — worked examples (Node / NestJS / Angular / Sequelize)

Companion to `core/methodology/pattern-library.md`. Section numbers match. The patterns live there; the
concrete instances live here, because an instance is only ever true of one stack.

**For the course:** read this alongside core. The examples are the teaching material — a
pattern without an instance is an aphorism.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take
`core/` alone and write the instances against the project's own stack, or contribute an
`examples/<stack>/` pack.

---

## 1. Infrastructure-First — what qualified as infrastructure here

- Database setup and migrations (Sequelize ORM)
- Testing framework with example tests (Jest)
- Development scripts (setup, seed, reset, dev)
- Project scaffolding (NestJS backend, Angular frontend)
- Environment configuration
- MCP server configuration (Filesystem, Playwright, Context7)

Demo readiness, concretely:

```bash
git clone <repo> && npm install && npm run setup && npm run dev   # = working app
```

Context7 in this project provided current docs for Sequelize, NestJS and Angular.

## 3. Field Naming Convention Locks — the instance

The convention this project locked:

| Layer | Convention |
| --- | --- |
| API fields (DTOs) | `camelCase` — `leadId`, `budgetMin`, `lastContactDate` |
| Database | `snake_case`, mapped in the models/services |
| Frontend | `camelCase` only, matching the shared API types exactly |
| Enforcement | TypeScript compilation |

The block that went verbatim into every agent prompt:

```markdown
## FIELD NAMING CONVENTION (MANDATORY)

You MUST use these exact field names matching the shared API types:

- leadId (NOT lead_id)
- budgetMin (NOT budget_min)
- createdAt (NOT created_at)

Import schema types and use them directly.
```

**Note the shape, not the values.** A Rails project inverts this table entirely —
`snake_case` end to end, including JSON, with the serializer as the single conversion
boundary. What transfers is: one convention per layer, one named boundary, one enforcement
mechanism.

This table is also what filled the **Field Naming Convention** block of
`core/templates/execution-plan-template.md` on every high-coordination feature here. That block
used to carry these three rows inline, inside `core/`; it now asks for the three rows and points
here for a filled-in one. There is one copy of the instance, and this is it.

## 5. Two-Tier Testing — mock vs real, in Jest + Sequelize

```typescript
//  WRONG: All mocked (hides type mismatches)
jest.mock('@/lib/services/notification.service');

//  CORRECT: Real database, real services
test('integration: create notification end-to-end', async () => {
  // No mocks - executes actual SQL
  const notification = await notificationService.createAndPublish({...});

  // Verify in real database
  const dbRecord = await Notification.findOne({where: {...}});
  expect(dbRecord).toBeDefined();
});
```

The bug class this catches here: database types not matching TypeScript assumptions —
strings arriving where `Date` was expected, decimals as strings.

## 9. Import Chain Parallelization — the sequential case

```
Task A: REST Backend
    ↓ exports: LOGIN_MUTATION, User type
Task B: Angular Context
    ↓ imports from A, exports: useAuth hook
Task C: UI Components
    ↓ imports from B
```

No parallelisation possible — each task builds on the previous.

---

## Deliberately not here: the validation gates

`core/methodology/pattern-library.md` §4 and §10 each enumerated the five gates with their
commands -- a *third* copy of `core/methodology/validation-gates.md`. Earlier in this PR both
were replaced with a cross-reference rather than moved into this pack, because a restated
definition is not an example.

Duplicating a gate definition is how a project ends up with two answers to "did it pass".
