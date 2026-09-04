# Environment Variable Validation Protocol

**Purpose:** Ensure environment variables are correctly configured WITHOUT reading secret values

**Pattern:** Validate schema, detect missing variables, automatically update .env.example

**`<env-accessor>` throughout this page** means the token your language uses to read the environment. Substitute
it before running any search below; it is the only stack-dependent part of the protocol. A worked set of searches
and code is in `examples/<stack>/environment-validation-examples.md`.

---

## Core Principle: Schema Validation, Not Secret Reading

**DON'T read:** `.env`, `.env.local`, `.env.development` (contain secrets)

**DO read:** `.env.example` (template, no secrets), code files (to find required variables)

**DO validate:** Required variables exist, schema is complete, new variables documented

---

## Environment Variable Detection (Code Analysis)

### Finding Required Environment Variables

**Search codebase for environment variable usage:**

```bash
# Find every read of the environment
grep -r "<env-accessor>" <source root>

# Common patterns:
# <env-accessor>DATABASE_URL
# <env-accessor>JWT_SECRET
# <env-accessor>PORT
# <env-accessor>APP_ENV
```

**Extract variable names from code.** For each hit, record where it was found, the variable name, and -- the part
that matters -- whether the code supplies a fallback at the read site:

| Where found | Variable | Verdict |
| --- | --- | --- |
| the database config module | `DATABASE_URL` | Required — no fallback |
| the auth/token service | `JWT_SECRET` | Required — no fallback |
| the server entry point | `PORT` | Optional — falls back to a default |

A read with no fallback and no explicit check is the failure case this protocol exists to catch. It does not fail
at startup; it fails later, somewhere unrelated, with an error that does not name the variable.

### Categorize Variables

**Required (no default value):**

- DATABASE_URL
- JWT_SECRET

**Optional (has default):**

- PORT (defaults to the server's conventional port)
- APP_ENV (defaults to 'development')

**By service:**

- Database: DATABASE_URL, DB_POOL_SIZE
- Authentication: JWT_SECRET, JWT_EXPIRES_IN
- Server: PORT, HOST
- External services: REDIS_URL, STRIPE_API_KEY

---

## Validation Protocol (Run Before Creating Prompts)

### Step 1: Scan Code for Environment Variables

```bash
# Find every read of the environment, deduplicated
grep -r "<env-accessor>" <source root> -o | sort -u

# Example output:
# <env-accessor>DATABASE_URL
# <env-accessor>JWT_SECRET
# <env-accessor>PORT
# <env-accessor>REDIS_URL
```

### Step 2: Check .env.example Completeness

```bash
# Read .env.example (safe - no secrets)
cat .env.example

# Compare with variables found in code
# Missing from .env.example? → Flag for addition
```

### Step 3: Identify Missing Variables

**Variables used in code but NOT in .env.example:**

Example:

```
Code uses: DATABASE_URL, JWT_SECRET, PORT, REDIS_URL
.env.example has: DATABASE_URL, JWT_SECRET, PORT
Missing: REDIS_URL ← FLAG THIS
```

### Step 4: Alert Engineer + Auto-Update .env.example

**Orchestration partner should:**

```markdown
**ENVIRONMENT VALIDATION ALERT:**

I found environment variables used in code that are NOT in .env.example:

Missing variables:
- REDIS_URL (used in the cache service, with the file and line number)

I will add these to .env.example with placeholder values.

**Action required from you:**
After I update .env.example, please:
1. Review the new variables
2. Add actual values to your .env.local (if needed)
3. Update team documentation if this is a new service dependency
```

**Then automatically update .env.example:**

```bash
# Add to .env.example
echo "\n# Redis Configuration" >> .env.example
echo "REDIS_URL=redis://localhost:6379" >> .env.example
```

---

## Environment Variable Validation in Agent Prompts

### Add to EVERY Agent Prompt

```markdown
## ENVIRONMENT VARIABLE VALIDATION (MANDATORY)

### Before Starting Implementation

**1. Check if your feature introduces NEW environment variables:**

```bash
# Search your implementation for environment reads
grep -r "<env-accessor>" <files-you-will-create>
```

**2. If you introduce NEW variables, you MUST:**

- [ ] Add to .env.example with descriptive comment and placeholder value
- [ ] Alert engineer in session log: "NEW environment variable added: {VAR_NAME}"
- [ ] Document in README if it's a new service dependency
- [ ] Verify variable has safe default OR clear error message if missing

**Example:**

 BAD — read the variable and use it. If it is absent the code carries on with nothing, and the failure surfaces
later, somewhere unrelated, in an error that does not name the variable.

 GOOD — read it, and if it is required and absent, fail immediately with a message that names the variable and
says where to set it: `JWT_SECRET environment variable is required. Add to .env file.`

 GOOD — for an optional variable, supply the default at the single point of read, not separately at each use.

### Before Claiming "COMPLETE"

**3. Verify .env.example is up-to-date:**

```bash
# All variables your feature uses must be in .env.example
grep "JWT_SECRET" .env.example  # Should exist if you use it
grep "DATABASE_URL" .env.example  # Should exist if you use it
```

**4. Alert engineer about configuration:**

```markdown
## Session Log: Environment Variables

**New variables introduced:**
- JWT_SECRET (required) - Added to .env.example
- TOKEN_EXPIRY (optional, defaults to '24h') - Added to .env.example

**Engineer action required:**
1. Run: cp .env.example .env (if .env doesn't exist)
2. Update .env with actual JWT_SECRET value (generate random string)
3. Optionally create .env.local for machine-specific overrides
```

**IF YOU INTRODUCE NEW VARIABLES WITHOUT UPDATING .env.example:**

-  Feature is INCOMPLETE
-  Other engineers will get "undefined environment variable" errors
-  Update .env.example first, then re-validate

```

---

## Pre-Execution Environment Validation (Orchestration Partner)

### Before Creating Prompts, Orchestration Partner Should:

**1. Scan codebase for current environment variables:**

```bash
# Find all variables currently used
grep -r "<env-accessor>[A-Z_]" <source root> -oh | sort -u > current-env-vars.txt

# Example output:
# <env-accessor>DATABASE_URL
# <env-accessor>JWT_SECRET
# <env-accessor>PORT
```

**2. Read .env.example (safe - no secrets):**

```bash
cat .env.example
# Extract variable names
grep -E "^[A-Z_]+=" .env.example | cut -d'=' -f1 > documented-vars.txt
```

**3. Compare and identify gaps:**

```bash
# Variables in code but not in .env.example
comm -23 current-env-vars.txt documented-vars.txt
```

**4. Alert engineer BEFORE creating prompts:**

```markdown
**ENVIRONMENT VALIDATION BEFORE STARTING:**

I scanned the codebase and found these environment variables:

**Currently documented in .env.example:**
- DATABASE_URL 
- JWT_SECRET 
- PORT 

**Used in code but MISSING from .env.example:**
- REDIS_URL  (used in the cache service)

**Recommended action:**
Before I create agent prompts, should I:
1. Add REDIS_URL to .env.example? (I can do this now)
2. Is this variable intentional or leftover from old code?

This ensures agents have complete environment schema when they start.
```

---

## Environment Variable Schema (Not Secret Values)

### What Orchestration Partner CAN Document

**Variable schema (SAFE):**

```markdown
## Required Environment Variables

**Database:**
- DATABASE_URL: database connection string
  - Format: the driver's connection URL — scheme, user, password, host, port, database name
  - Document one placeholder per supported setup (containerised service, locally installed service); they
    usually differ only in the port

**Authentication:**
- JWT_SECRET: Secret key for JWT token signing
  - Format: Random string (min 32 characters)
  - Generate: openssl rand -base64 32

**Server:**
- PORT: Backend server port (optional, has a default)
- APP_ENV: Environment (development/production/test)
```

### What Orchestration Partner CANNOT Document

**Actual secret values (UNSAFE):**

```markdown
 DON'T: JWT_SECRET=abc123supersecret (actual value)
 DO: JWT_SECRET=<generate-with-openssl-rand-base64-32> (template)

 DON'T: DATABASE_URL=<scheme>://user:MyP@ssw0rd@... (the real password)
 DO: DATABASE_URL=<scheme>://user:password@host:port/database (placeholder)
```

---

## Developer .env.local Override Pattern

### Orchestration Partner Should Document

**In every prompt that involves environment variables:**

```markdown
## Environment Configuration

**Default configuration (.env.example):**
- DATABASE_URL: Points to the standard development database the team agreed on

**Developer override pattern (.env.local):**

If you need custom configuration (different port, a locally installed database rather than a containerised one):

1. Create .env.local (gitignored, never committed)
2. Override specific variables:
   ```

DATABASE_URL=<connection string pointing at your own host and port>

   ```

**Precedence:** .env.local > .env.development > .env

**Why .env.local:**
- Gitignored (your machine-specific config never committed)
- Overrides defaults without modifying .env.example
- Team shares .env.example, you keep .env.local private
```

---

## Automatic .env.example Updates

### When Agent Introduces New Environment Variable

**Agent MUST automatically:**

1. **Add to .env.example:**

```bash
# Agent adds new variable with descriptive comment
echo "\n# Redis Cache Configuration (added by <feature-name>)" >> .env.example
echo "REDIS_URL=redis://localhost:6379" >> .env.example
```

2. **Alert in session log:**

```markdown
## Session Log: Environment Variables

**NEW VARIABLE INTRODUCED:**
- REDIS_URL
  - Purpose: Redis cache connection
  - Default: redis://localhost:6379
  - Added to .env.example: 

**Engineer action required:**
1. If you run services in containers: add the Redis service to your container configuration
2. Copy REDIS_URL to your .env.local if you need custom Redis configuration
3. Default value works for the standard setup (no action needed)
```

3. **Update README (if new service):**

```markdown
# Agent updates README.md

## Environment Variables

- `DATABASE_URL`: database connection (required)
- `JWT_SECRET`: JWT signing key (required)
- `REDIS_URL`: Redis cache connection (required) ← NEW
```

4. **Include validation in agent prompt:**

```markdown
## Agent Prompt Instruction

**If you introduce NEW environment variables:**

1. Add to .env.example with comment and safe default
2. Alert engineer in session log
3. Update README environment variable documentation
4. Include clear error message if variable missing at runtime
5. Mark as INCOMPLETE if .env.example not updated
```

---

## Environment Validation Checklist (Orchestration Partner)

**Before creating prompts:**

- [ ] Scan code for all environment reads (`<env-accessor>`)
- [ ] Read .env.example to see documented variables
- [ ] Identify missing variables (code uses but not documented)
- [ ] Alert engineer about missing variables
- [ ] Offer to add missing variables to .env.example

**Include in every prompt:**

- [ ] Environment variable validation section
- [ ] Instruction to update .env.example if introducing new variables
- [ ] Alert requirement if new variables added
- [ ] .env.local override pattern documentation

**After agent completes:**

- [ ] Verify .env.example updated (if new variables introduced)
- [ ] Verify README updated (if new service dependencies)
- [ ] Verify clear error messages for missing required variables

---

## Example: Orchestration Partner Pre-Execution Validation

```
Engineer: "I need to add Redis caching"

Orchestration Partner:

**ENVIRONMENT VALIDATION:**

I scanned the codebase for environment variables:

Current variables in .env.example:
- DATABASE_URL 
- JWT_SECRET 
- PORT 

Your feature will likely need:
- REDIS_URL (for cache connection)

**Before creating prompts, I will:**
1. Include instruction for agent to add REDIS_URL to .env.example
2. Ensure agent alerts you when variable added
3. Document .env.local override pattern for custom Redis setup

**Agent prompt will include:**
"If you introduce REDIS_URL, add to .env.example with default redis://localhost:6379
and alert engineer to update their .env.local if they use custom Redis configuration"

Ready to create prompt with environment validation included.
```

---

## Port Conflict Resolution Pattern

**Document in prompts (don't read .env.local):**

```markdown
## Port Conflict Resolution

**If starting the local service stack fails with "port already allocated":**

1. Check what's using the port:
   ```bash
   lsof -i :5433
   ```

2. Option A: Stop the conflicting service — whatever is already holding the port, if you do not need it

3. Option B: Move the project's service to a different port
   ```bash
   # Create .env.local pointing at the new port
   echo "DATABASE_URL=<connection string on the new port>" > .env.local

   # Update the service definition's port mapping to match
   ```

**Engineer chooses resolution - agent documents both options**

```

---

## Success Criteria for Environment Configuration

**Infrastructure agent is complete when:**

- [ ] .env.example contains ALL variables used in code
- [ ] Each variable has descriptive comment
- [ ] Each variable has safe placeholder value (not actual secret)
- [ ] README documents all environment variables
- [ ] Code has clear error messages for missing required variables
- [ ] .env.local override pattern documented
- [ ] No secrets committed to git (.env files in .gitignore)

**Specific verification:**

```bash
# 1. All code variables documented
grep -r "<env-accessor>[A-Z_]" <source root> -oh | sort -u > code-vars.txt
grep -E "^[A-Z_]+=" .env.example | cut -d'=' -f1 > example-vars.txt
comm -23 code-vars.txt example-vars.txt  # Should be empty (no missing vars)

# 2. .env.example has no actual secrets
cat .env.example | grep -i "production\|actual\|real"  # Should be empty

# 3. Required variables have validation
grep -r "<env-accessor>DATABASE_URL" <source root> -A2 | grep -iE "throw|raise|fatal"  # Should show validation

# 4. .gitignore prevents .env commits
grep ".env" .gitignore  # Should show .env files ignored
```

---

**Status:** Canonical guide for environment validation without reading secrets
