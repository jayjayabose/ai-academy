# Two-Track Migrations — worked commands (Node / NestJS / Sequelize / PostgreSQL)

Companion to `core/methodology/database-migration-strategy.md`. Section headings match. The two-track
pattern lives there; the npm scripts and `psql` invocations live here, because a migrate command is
only ever true of one project.

**For an install:** take this pack only if the target is Node with PostgreSQL. Otherwise take `core/`
alone and name your own two commands. The naming is the whole intervention — a project that calls the
destructive one `db:migrate` will lose data eventually, whatever the docs say.

---

## The Two-Track Migration Pattern (MANDATORY)

### Track 1: Initial Schema (Destructive)

**File:** `src/db/schema.sql`
**Command:** `npm run db:migrate` ← the command that caused the incident

**Used for:**

- Fresh project setup (`npm run setup`)
- Development database resets (`npm run reset`)
- Test database initialization (`npm run test:db:setup`)

PostgreSQL specifics core drops for portability — the UUID default and the JSON column type:

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ...
);

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS ai_summary_metadata JSONB;
```

### Track 2: Incremental Migrations (Safe)

**Command:**

```bash
psql $DATABASE_URL -f scripts/migrations/XXX-description.sql
```

## File Organization Structure

The runner script was Node:

```
scripts/
  run-schema.js                 # Executes schema.sql (DESTRUCTIVE)
  run-migrations.js             # Runs pending files in migrations/ (SAFE)
```

## Task Runner Script Strategy

### Current Scripts (Need Enhancement)

```json
{
  "db:migrate": "node scripts/run-schema.js", // DESTRUCTIVE
  "db:reset": "node scripts/reset-db.js", // DESTRUCTIVE
  "reset": "npm run db:reset && npm run seed" // DESTRUCTIVE
}
```

### Proposed Additional Scripts

```json
{
  "db:migrate:fresh": "node scripts/run-schema.js", // Explicit: DROPS tables
  "db:migrate:incremental": "node scripts/run-migrations.js", // NEW: Runs migration files
  "db:migrate": "npm run db:migrate:incremental" // SAFE default
}
```

## Preventing Future Data Loss

### 3. Development Workflow

```bash
# 1. Agent creates scripts/migrations/005-new-feature.sql
# 2. Apply migration safely:
psql $DATABASE_URL -f scripts/migrations/005-new-feature.sql

# 3. Verify migration worked:
psql $DATABASE_URL -c "\d table_name"

# 4. Continue development with data intact
```

**Unsafe workflow (avoid):**

```bash
#  DON'T DO THIS if you have data you want to keep:
npm run db:migrate  # This drops all tables!
```

## Migration File Template

The verify line at the bottom of the template used the psql describe shortcut:

```sql
-- Verify changes
-- Run: \d [table_name] to verify
```

## Testing Strategy

### Before Applying Any Migration

```bash
# 1. Create a test database with current data
pg_dump new_crm > backup.sql
createdb new_crm_test
psql new_crm_test < backup.sql

# 2. Test migration on test database
psql new_crm_test -f scripts/migrations/XXX-new-migration.sql

# 3. Verify it worked and data is intact
psql new_crm_test -c "SELECT COUNT(*) FROM leads;"
psql new_crm_test -c "\d leads"

# 4. If successful, apply to main database
psql new_crm -f scripts/migrations/XXX-new-migration.sql
```

## Implementation Requirements

The command agents were required to document in the session log:

```bash
psql $DATABASE_URL -f scripts/migrations/XXX.sql
```
