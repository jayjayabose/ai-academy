# Environment Validation — worked searches (Node / NestJS / TypeScript / Docker / PostgreSQL)

Companion to `core/methodology/environment-validation.md`. Section headings match. The protocol lives
there; the accessor, the searches and the connection strings live here, because a connection string is
only ever true of one project.

**For the course:** read this alongside core. Core writes every search against `<env-accessor>`; this
pack is what happens when you substitute the real one and run it.

**For an install:** take this pack only if the target is Node. Otherwise take `core/` alone and
substitute your own accessor — `ENV[` in Ruby, `os.environ[` in Python, `os.Getenv(` in Go,
`getenv(` in PHP/C. Everything else in the protocol is unchanged.

---

## The accessor

| Core placeholder | This project |
| --- | --- |
| `<env-accessor>` | `process.env.` |
| `<source root>` | `src/` |
| environment naming | `NODE_ENV` where core says `APP_ENV` |

---

## Environment Variable Detection (Code Analysis)

### Finding Required Environment Variables

```bash
# Find all process.env usage
grep -r "process.env" src/ --include="*.ts" --include="*.js"

# Common patterns:
# process.env.DATABASE_URL
# process.env.JWT_SECRET
# process.env.PORT
# process.env.NODE_ENV
```

The `--include` filters matter here: without them the search walks `node_modules` and `dist`.

### Extract variable names from code

The three hits behind core's required/optional table:

```typescript
// Found in src/config/database.ts
const dbUrl = process.env.DATABASE_URL;  // → Required: DATABASE_URL

// Found in src/auth/jwt.service.ts
const secret = process.env.JWT_SECRET;   // → Required: JWT_SECRET

// Found in src/main.ts
const port = process.env.PORT || 3000;   // → Optional: PORT (has default)
```

### Categorize Variables

- PORT (defaults to 3000)
- NODE_ENV (defaults to 'development')

---

## Validation Protocol (Run Before Creating Prompts)

### Step 1: Scan Code for Environment Variables

```bash
# Find all process.env usage
grep -r "process.env\." src/ -o | sort -u

# Example output:
# process.env.DATABASE_URL
# process.env.JWT_SECRET
# process.env.PORT
# process.env.REDIS_URL
```

### Step 4: Alert Engineer + Auto-Update .env.example

The alert cited the exact source location:

```
- REDIS_URL (used in src/cache/redis.service.ts:12)
```

---

## Environment Variable Validation in Agent Prompts

The check every agent was told to run over its own new code before starting:

```bash
# Search your implementation for process.env usage
grep -r "process.env" <files-you-will-create>
```

The good/bad pair core states in prose, as TypeScript:

```typescript
//  BAD - Silent failure if missing
const jwtSecret = process.env.JWT_SECRET;

//  GOOD - Clear error if required variable missing
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required. Add to .env file.');
}

//  GOOD - Safe default for optional variable
const port = process.env.PORT || 3000;
```

---

## Pre-Execution Environment Validation (Orchestration Partner)

```bash
# Find all variables currently used
grep -r "process\.env\.[A-Z_]" src/ -oh | sort -u > current-env-vars.txt
```

---

## Environment Variable Schema (Not Secret Values)

The two documented placeholder connection strings — they differ only in port, because the
containerised PostgreSQL was deliberately moved off 5432 to coexist with a locally installed one:

```markdown
**Database:**
- DATABASE_URL: PostgreSQL connection string
  - Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
  - Docker default: postgresql://postgres:password@localhost:5433/new_crm
  - Local PostgreSQL: postgresql://postgres:password@localhost:5432/new_crm

**Server:**
- PORT: Backend server port (optional, defaults to 3000)
- NODE_ENV: Environment (development/production/test)
```

### What Orchestration Partner CANNOT Document

```markdown
 DON'T: DATABASE_URL=postgresql://user:MyP@ssw0rd@... (actual password)
 DO: DATABASE_URL=postgresql://postgres:password@localhost:5433/new_crm (placeholder)
```

---

## Developer .env.local Override Pattern

Default: `DATABASE_URL` points at Docker PostgreSQL on port 5433. The override:

```
DATABASE_URL=postgresql://localhost:CUSTOM_PORT/new_crm
```

---

## Automatic .env.example Updates

```bash
# Agent adds new variable with descriptive comment
echo "\n# Redis Cache Configuration (added by <feature-name>)" >> .env.example
echo "REDIS_URL=redis://localhost:6379" >> .env.example
```

Engineer action, as written for this project:

```
1. If using Docker: Update docker-compose.yml to include Redis service
2. Copy REDIS_URL to your .env.local if you need custom Redis configuration
3. Default value works for Docker setup (no action needed for standard setup)
```

---

## Port Conflict Resolution Pattern

```markdown
**If docker-compose up fails with "port already allocated":**

1. Check what's using the port:
   ```bash
   lsof -i :5433
   ```

2. Option A: Stop conflicting service
   ```bash
   # Stop local PostgreSQL if you don't need it
   brew services stop postgresql
   ```

3. Option B: Use different port for Docker
   ```bash
   # Create .env.local with custom port
   echo "DATABASE_URL=postgresql://postgres:password@localhost:5434/new_crm" > .env.local

   # Update docker-compose.yml port mapping to 5434:5432
   ```
```

`lsof -i :5433` is the same check as Gate 4 — see `validation-gates-examples.md`.

---

## Success Criteria for Environment Configuration

```bash
# 1. All code variables documented
grep -r "process\.env\.[A-Z_]" src/ -oh | sort -u > code-vars.txt
grep -E "^[A-Z_]+=" .env.example | cut -d'=' -f1 > example-vars.txt
comm -23 code-vars.txt example-vars.txt  # Should be empty (no missing vars)

# 3. Required variables have validation
grep -r "process.env.DATABASE_URL" src/ -A2 | grep "throw"  # Should show validation
```
