# Database Migration Strategy: Preventing Data Loss

## Critical Problem Identified

**What Happened:** Running the project's migrate command during feature migration work deleted all production data,
because the command ran the initial schema file and that file contains `DROP TABLE IF EXISTS` statements.

**Impact:** Fresh database required re-seeding, loss of any custom/test data, potential production disaster if this
pattern continues.

**Root Cause:** No distinction between "initial schema setup" vs "incremental migrations" in project structure.

**Commands and paths are per-project.** This page names two roles -- an initial schema file and a migrations
directory -- and the examples below use `src/db/schema.sql` and `scripts/migrations/` for them. Substitute the
project's own. A worked set of commands is in `examples/<stack>/database-migration-strategy-examples.md`.

---

## The Two-Track Migration Pattern (MANDATORY)

### Track 1: Initial Schema (Destructive)

**File:** the initial schema file (`src/db/schema.sql`)
**Purpose:** Create database from scratch for fresh setups
**Contains:** `DROP TABLE IF EXISTS` + `CREATE TABLE` statements
**Used For:**

- Fresh project setup
- Development database resets
- Test database initialization
- CI/CD pipeline fresh environments

**Command:** the project's fresh-schema command
**⚠️ WARNING:** This DESTROYS all existing data

**Example:**

```sql
-- Drop existing tables for clean re-runs
DROP TABLE IF EXISTS interactions;
DROP TABLE IF EXISTS leads;

-- Create leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    ...
);
```

### Track 2: Incremental Migrations (Safe)

**Directory:** the migrations directory (`scripts/migrations/`)
**Purpose:** Add columns/indexes to existing tables WITHOUT data loss
**Contains:** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements ONLY
**Used For:**

- Adding new feature columns to production
- Adding indexes for performance
- Modifying existing schemas incrementally

**Command:** apply that one migration file against the target database, using the database's own client
** SAFE:** Preserves all existing data

**Example:**

```sql
-- Migration: Add AI Summary columns to leads table
-- Feature: AI Summaries
-- Date: 2025-10-01

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS ai_summary_text TEXT,
ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_summary_metadata JSON;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_ai_summary_generated_at
ON leads(ai_summary_generated_at)
WHERE ai_summary_generated_at IS NOT NULL;
```

---

## File Organization Structure

```
src/db/
  schema.sql                    # Initial schema (includes DROP commands)

scripts/
  run-schema                    # Executes schema.sql (DESTRUCTIVE)
  migrations/                   # Incremental migrations (SAFE)
    001-add-summary-columns.sql
    002-add-notification-tables.sql
    003-add-auth-tables.sql
```

---

## Migration Naming Convention

**Pattern:** `XXX-feature-description.sql`

**Examples:**

- `001-add-summary-columns.sql`
- `002-add-notification-tables.sql`
- `003-add-auth-tables.sql`
- `004-add-user-preferences.sql`

**Rules:**

1. Sequential numbering (001, 002, 003...)
2. Descriptive name (feature or purpose)
3. Always use `IF NOT EXISTS` clauses
4. Include header comment with feature context

---

## Agent Guidelines: When to Use Which Track

### Infrastructure Agents (Initial Setup) → Update schema.sql

**Scenario:** Setting up initial database tables for the first time

**What to do:**

- Add table definitions to `src/db/schema.sql`
- Include DROP statements for clean re-runs
- Update both `schema.sql` AND create a migration file

**Example (Initial Infrastructure):**

```sql
-- In src/db/schema.sql:
DROP TABLE IF EXISTS leads;
CREATE TABLE leads (...);

-- Also create scripts/migrations/001-initial-leads-table.sql:
CREATE TABLE IF NOT EXISTS leads (...);
```

### Feature Agents → Create Migration File

**Scenario:** Adding new columns/indexes to existing tables for a new feature

**What to do:**

- Create new file in `scripts/migrations/`
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Use `CREATE INDEX IF NOT EXISTS`
- **Never include DROP commands**
- Update `src/db/schema.sql` to reflect final state (for fresh setups)

**Example (AI Summaries Feature):**

```sql
-- scripts/migrations/003-add-summary-columns.sql
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS ai_summary_text TEXT;

-- Also update src/db/schema.sql to include these columns
-- (so fresh setups have them from the start)
```

---

## Task Runner Script Strategy

### Current Scripts (Need Enhancement)

Whatever the project's task runner is, the usual starting state is three commands that all destroy data and only
one name that admits it:

- `db:migrate` — runs the initial schema file. DESTRUCTIVE, and named as though it were not.
- `db:reset` — drops and recreates. DESTRUCTIVE, and honestly named.
- `reset` — reset plus re-seed. DESTRUCTIVE, and honestly named.

The dangerous one is `db:migrate`, because "migrate" is the word every other ecosystem uses for the *safe*
operation.

### Proposed Additional Scripts

Split the name that is doing two jobs:

- `db:migrate:fresh` — runs the initial schema file. The name states that it drops tables.
- `db:migrate:incremental` — runs the pending files in the migrations directory. Additive only.
- `db:migrate` — an alias for the incremental one, so the habitual command is the safe one.

**Rationale:**

- `db:migrate` should be SAFE by default (runs incremental migrations)
- `db:migrate:fresh` explicitly signals destructive behavior
- `db:reset` keeps current behavior (full reset + seed)

---

## Preventing Future Data Loss

### 1. Migration File Validation

**Checklist for all migration files:**

- [ ] No `DROP TABLE` commands (use `ALTER TABLE` instead)
- [ ] All changes use `IF NOT EXISTS` / `IF EXISTS` clauses
- [ ] Header comment documents feature and date
- [ ] File placed in `scripts/migrations/` directory
- [ ] Corresponding update to `src/db/schema.sql` for fresh setups

### 2. Agent Prompt Requirements

**All feature agents working with database changes MUST:**

1. Create migration file in `scripts/migrations/`
2. Use additive-only SQL commands
3. Update `src/db/schema.sql` to match final state
4. Document which command to run in session log
5. **Never suggest the fresh-schema command for feature changes**

### 3. Development Workflow

**Safe workflow for feature development:**

```bash
# 1. Agent creates scripts/migrations/005-new-feature.sql
# 2. Apply that one file against the development database, with the database's own client
# 3. Verify it worked: describe the table and confirm the new columns are there
# 4. Continue development with data intact
```

**Unsafe workflow (avoid):**

```bash
#  DON'T DO THIS if you have data you want to keep:
#    running the fresh-schema command -- it drops all tables
```

---

## Migration File Template

Save this as `scripts/migrations/_TEMPLATE.sql`:

```sql
-- Migration: [Brief description of what this adds]
-- Feature: [Feature name, e.g., AI Summaries]
-- Date: [YYYY-MM-DD]
-- Author: [Agent name or human name]

-- [Detailed explanation of changes and why they're needed]

-- Add new columns
ALTER TABLE [table_name]
ADD COLUMN IF NOT EXISTS [column_name] [data_type] [constraints];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS [index_name]
ON [table_name]([column_name])
WHERE [optional_condition];

-- Add comments for documentation
COMMENT ON COLUMN [table_name].[column_name] IS '[Description of purpose]';

-- Verify changes
-- Run the database client's "describe table" command against [table_name] to verify
```

---

## Testing Strategy

### Before Applying Any Migration

**Safe testing workflow:**

```bash
# 1. Snapshot the current database and restore the snapshot into a scratch copy
# 2. Apply the migration file to the scratch copy
# 3. Verify it worked and the data is intact:
#      SELECT COUNT(*) FROM <table>;   -- row count unchanged
#      describe <table>                 -- new columns present
# 4. If successful, apply the same file to the main database
```

The point is the scratch copy, not the tooling. Every database has a dump/restore pair; the migration you have
not run against a copy of real data is a migration you have not tested.

---

## Implementation Requirements

**For all future features requiring database changes:**

1.  Feature agent creates migration file in `scripts/migrations/`
2.  Migration file uses additive-only commands (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
3.  Agent updates `src/db/schema.sql` to reflect final state (for documentation)
4.  Agent documents the exact command to run, including the migration filename
5.  Session log includes: "Migration tested, data preserved"
6.  Agent NEVER suggests the fresh-schema command for feature changes

---

## Methodology Learning: Infrastructure-First Pattern Gap

**Original Pattern (Initial Implementation):**

- Infrastructure-first: Setup database BEFORE parallel agents run 
- Single schema file with DROP commands  (for fresh setups)

**Gap Discovered:**

- No incremental migration strategy 
- Feature changes triggered full schema rebuild 
- Data loss on feature additions 

**Enhanced Pattern:**

- Infrastructure-first: Setup database BEFORE parallel agents run 
- Initial schema file for fresh setups (`schema.sql` with DROP) 
- **Incremental migration directory for feature additions (`migrations/` without DROP)**  NEW
- **Clear documentation of when to use which approach**  NEW

---

## Status: Critical Gap Identified, Systematic Solution Designed

**Problem:** Feature database changes destroyed all data
**Solution:** Two-track migration pattern (initial schema vs incremental migrations)
**Evidence:** Feature migration required full database reseed due to DROP commands
**Prevention:** Migration directory structure + agent guidelines + validation checklist

**Ready for:** Future implementations with proper migration management preventing data loss
