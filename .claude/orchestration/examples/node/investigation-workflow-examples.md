# Investigation-First Workflow — worked searches (Node / NestJS / Angular / Sequelize)

Companion to `core/methodology/investigation-workflow.md`. Section headings match. The two-phase
workflow lives there; the directory roles resolved into real paths live here, because a path is only
ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/`
alone and resolve the same six roles — pages, widgets/components, services, shared API types, models,
source root — against your own layout. Write them down once; every later investigation reuses them.

---

## Phase 1: INVESTIGATE (Search Codebase - Don't Ask)

### Technical Reality to Discover

Core asks "which UI framework, which server framework, which API style, which ORM?". The line as this
project wrote it named the candidates it was actually choosing between:

```
- What's the tech stack? (Angular? Vue? NestJS? REST?)
```

### Directory roles, resolved

| Role in core | This project |
| --- | --- |
| `<pages directory>` | `src/app/pages/` |
| `<widgets directory>` | `src/components/widgets/` |
| `<services directory>` | `src/services/` |
| shared API type definitions | `api-types.ts` and the NestJS `dto/` folders |
| `<models directory>` | `src/models/` (Sequelize models) |
| `<source root>` | `src/` |

### Example Investigations

```bash
# Find if Dashboard exists
grep -r "Dashboard" src/app/pages/

# Understand Dashboard structure
# Read dashboard.component.ts to see current layout, existing widgets

# Check widget patterns
ls src/components/widgets/
# Read existing widget to understand integration pattern

# Find authentication service
grep -r "auth" src/services/

# Check the shared API types
# Read api-types.ts / the dto/ folders to see existing types

# Find database models
ls src/models/
# Read user.model.ts to see field names

# Check for JWT implementation
grep -r "jwt" src/
```

---

## Complete Example: Dashboard Analytics Widgets

### Phase 1: INVESTIGATE (You Do This)

```bash
# Check if Dashboard exists
grep -r "dashboard" src/app/pages/ → YES, dashboard.component.ts exists

# Read Dashboard structure
# Read dashboard.component.ts → Grid layout, imports components

# Check existing widget patterns
ls src/components/widgets/ → See 2 existing widgets
# Read existing widget → Each imported directly into Dashboard
```

**What you learned:** `dashboard.component.ts` exists, uses a grid layout, and imports each widget
component individually — so a new widget is a new standalone Angular component plus one import line.

### Phase 3: DETERMINE (Your Analysis)

Each widget agent imports into `dashboard.component.ts`. That single shared file is what makes the
coordination level medium rather than low: three parallel agents all edit its import block.

---

## Complete Example: Backend REST Authentication

### Phase 1: INVESTIGATE (You Do This)

```bash
# Check the shared API types
# Read api-types.ts / the dto/ folders → YES, User type exists

# Check for auth service
ls src/services/ → YES, auth.service.ts exists
# Read auth.service.ts → bcrypt implementation exists

# Check database User model
# Read user.model.ts → email, passwordHash fields exist

# Find JWT implementation
grep -r "jwt" src/ → JWT service already configured
```

**What you learned:** the password hashing core refers to was `bcrypt` in `auth.service.ts`, and the
User model was a Sequelize model with `email` and `passwordHash` already defined — so the login
endpoint was assembly, not construction.

### Phase 3: DETERMINE (Your Analysis)

Manual testing was `curl` POST against the running NestJS server with valid and invalid credentials,
checking the JWT came back and that the third failed attempt returned the error.

---

## Anti-Pattern: Asking Before Investigating

The "DO" line, with the real filename in it:

```
Agent: "I found dashboard.component.ts exists with grid layout. Current pattern: widgets imported individually."
```

The filename is the whole point of the line — it is the proof the agent actually looked.
