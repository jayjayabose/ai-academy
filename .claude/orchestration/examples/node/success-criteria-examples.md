# Specific Success Criteria — worked examples (Node / NestJS / Angular / Sequelize / Jest / Docker)

Companion to `core/methodology/success-criteria.md`. Section headings match. The transformation — generic claim in,
observable statement out — lives there; the filled-in criteria live here, because a criterion names commands, URLs and
ports, and those are only ever true of one project.

**For the course:** read this alongside core. The contrast pairs are the teaching device, and a pair is only
convincing once both halves are concrete.

**For an install:** take this pack only if the target is Node/NestJS/Angular on Docker + PostgreSQL. Otherwise take
`core/` alone and write the criteria against the project's own commands.

---

## The Solution: Specific Verification Steps — the project's own criteria

**Frontend:**

- "Opening /dashboard displays ConversionWidget with live data"
- "Browser console shows 0 errors when /dashboard loads"

**Backend:**

- "curl POST to /auth/login returns 200 with a valid JWT token in the response body's `token` field"
- "GET /users/me returns email, firstName, lastName fields with correct values"
- "POST /api/auth/login with valid credentials returns 200 + sets httpOnly cookie named 'session'"
- "Protected endpoint /api/users returns 401 when called without valid token"

**Infrastructure:**

- "Fresh clone → docker-compose up -d → npm install → npm run setup → npm run dev results in server running
  on http://localhost:3000 in under 5 minutes, works on machine with NO local PostgreSQL"
- "docker ps shows postgres container running with correct version (PostgreSQL 18)"
- "Running npm test immediately after setup executes test suite (not 'framework not configured' error)"
- "Database migrations apply successfully: npm run db:migrate shows '5 migrations applied' with 0 errors"
- "tsconfig.json compiles project: npm run type-check returns 0 errors on fresh setup"
- "Opening http://localhost:3000 after npm run dev displays landing page (not connection refused)"
- "docker-compose down → docker ps shows no project containers (clean teardown)"

## Success Criteria Template Pattern — filled in

```markdown
## SUCCESS CRITERIA (SPECIFIC VERIFICATION)

### Manual Testing Validation

INFRASTRUCTURE (for setup/config tasks):
1. Fresh clone test: git clone → docker-compose up -d (if using Docker) → npm install → npm run setup
2. Verify Docker services running: docker ps shows all required containers (if using Docker)
3. Verify setup completes: 0 errors, creates database, runs migrations, seeds data
4. Verify dev server starts: npm run dev → server accessible on expected port
5. Verify TypeScript compiles: npm run type-check → 0 errors
6. Verify tests run immediately: npm test → framework configured, test DB ready
7. Verify works on clean machine: No local PostgreSQL/Redis/etc required (if using Docker)

FRONTEND (use Playwright MCP for browser verification):
1. Open browser to {SPECIFIC_URL}
2. Verify {SPECIFIC_ELEMENT} displays {SPECIFIC_BEHAVIOR}
3. Test {SPECIFIC_INTERACTION} results in {SPECIFIC_OUTCOME}
4. Check browser console: 0 errors

BACKEND (use curl/API testing):
1. curl -X POST {API_ENDPOINT} -d '{REQUEST_BODY}'
2. Verify response status: {EXPECTED_STATUS}
3. Verify response body contains: {EXPECTED_FIELDS}
4. Test authentication: login returns valid token/session
5. Test authorization: protected endpoints reject unauthorized requests

### Complete User Flow

- Infrastructure: "fresh clone → docker-compose up → setup → dev = working app in under 5 minutes on ANY machine"
```

---

## Infrastructure Success Criteria Examples

### Example 1: Database Setup (Containerised - Recommended)

```bash
# Test fresh clone scenario (simulates ANY engineer's machine)
git clone <repo> temp-test
cd temp-test
npm install

# 1. Docker Compose starts database
docker-compose up -d  # Starts PostgreSQL in container

# 2. Verify database container running
docker ps | grep postgres  # Shows postgres container running

# 3. Setup script runs against containerized database
npm run setup  # Creates database, runs migrations, seeds data

# 4. Verify database operations (inside Docker)
docker exec -it <postgres-container> psql -U postgres -l | grep new_crm  # Database exists
docker exec -it <postgres-container> psql -U postgres -d new_crm -c "SELECT COUNT(*) FROM users;"  # Shows seeded users

# 5. App connects to containerized database
npm run dev  # Server starts, connects to Docker database on localhost:5432

# 6. Verify no local PostgreSQL conflicts
# Works even if engineer has PostgreSQL installed locally (uses Docker port mapping)
```

**Success criteria:**

- "Fresh clone → docker-compose up -d → npm install → npm run setup completes in under 2 minutes with 0 errors,
  creates containerized database with 5 migrations applied and 3 seeded users, npm run dev connects to Docker database
  without 'connection refused' errors"

### Example 1B: Database Setup (Host-Installed Database - Alternative)

```bash
# Test fresh clone scenario
git clone <repo> temp-test
cd temp-test
npm install
npm run setup

# Verify database operations:
# 1. Database created
psql -l | grep new_crm  # Shows new_crm database exists

# 2. Migrations applied
npm run db:migrate:status  # Shows "5 migrations up, 0 down"

# 3. Seed data loaded
psql -d new_crm -c "SELECT COUNT(*) FROM users;"  # Shows "3" (seeded users)

# 4. Models load without error
npm run type-check  # TypeScript compiles successfully with Sequelize models

# 5. Can run app
npm run dev  # Server starts on port 3000 without database connection errors
```

**Success criteria:**

- "Running npm run setup on fresh clone creates new_crm database, applies 5 migrations, seeds 3 test users, all in
  under 2 minutes with 0 errors"

### Example 2: Testing Framework Setup

```bash
# Test on fresh clone
npm install

# 1. Test command works immediately (no additional setup)
npm test  # Runs (doesn't error "jest not found")

# 2. Test database configured
# Tests use new_crm_test database (not production database)
npm test  # Shows "Using test database: new_crm_test"

# 3. Sample test passes
npm test  # Shows at least 1 passing test (not "0 tests found")

# 4. Watch mode works
npm run test:watch  # Starts in watch mode for development
```

**Success criteria:**

- "Running npm test immediately after npm install executes test suite against new_crm_test database with at least 1
  passing example test, 0 errors"

### Example 3: Development Server Setup

```bash
# Test on fresh clone
npm install
npm run setup

# 1. Backend starts
npm run dev:backend  # Server starts on http://localhost:3000

# 2. Backend responds
curl http://localhost:3000/health  # Returns { "status": "ok" }

# 3. REST endpoint accessible
curl http://localhost:3000/leads  # Returns 200 + JSON array (not 404)

# 4. Frontend starts
npm run dev:frontend  # Server starts on http://localhost:3001

# 5. Frontend loads
curl http://localhost:3001  # Returns HTML (not connection refused)

# 6. Full stack runs
npm run dev  # Starts both backend + frontend concurrently
```

**Success criteria:**

- "Running npm run dev starts backend on :3000 and frontend on :3001, curl http://localhost:3000/health returns 200 status,
  curl http://localhost:3001 returns Angular app HTML"

### Example 4: Type / Compile Configuration

```bash
# Test compilation works
npm run type-check  # Returns 0 errors

# Test strict mode enabled
cat tsconfig.json | grep strict  # Shows "strict": true

# Test path aliases work
# Create test file that imports using @ alias
echo 'import { User } from "@/models/user"' > test-import.ts
npm run type-check  # Resolves @ alias correctly (not "cannot find module")

# Test editor integration
# Open VSCode → TypeScript errors show inline
# Hover over types → shows full type information
```

**Success criteria:**

- "tsconfig.json has strict mode enabled, path aliases (@/models, @/services) resolve correctly, npm run type-check returns
  0 errors on fresh clone"

### Example 5: Environment Configuration

```bash
# 1. Example file exists
ls .env.example  # File exists with all required variables

# 2. Setup script creates .env
npm run setup  # Creates .env from .env.example

# 3. App reads environment variables
# Backend starts and reads DATABASE_URL
npm run dev  # No "DATABASE_URL is not defined" error

# 4. All required variables documented
cat .env.example  # Shows:
# DATABASE_URL=postgresql://...
# JWT_SECRET=...
# PORT=3000
```

**Success criteria:**

- ".env.example contains all required variables (DATABASE_URL, JWT_SECRET, PORT), npm run setup copies to .env, npm
  dev starts without 'environment variable undefined' errors"

### Example 6: Complete Containerised Infrastructure

```bash
# Test fresh clone scenario (simulates completely clean machine)
git clone <repo> temp-test
cd temp-test

# 1. Docker Compose file exists
ls docker-compose.yml  # File exists with database, Redis, etc.

# 2. Start all infrastructure
docker-compose up -d  # Starts all services (database, Redis, etc.)

# 3. Verify all containers running
docker ps  # Shows postgres container, redis container (if applicable)
# Expected: 2 containers running (postgres + app services)

# 4. Verify database accessible
docker exec -it <postgres-container> psql -U postgres -c "SELECT version();"
# Returns PostgreSQL version (confirms database accessible)

# 5. Install dependencies and setup
npm install
npm run setup  # Creates database, runs migrations, seeds (all in Docker)

# 6. App starts and connects to containerized services
npm run dev  # Backend connects to Docker postgres on localhost:5432

# 7. Verify no local installation required
# Works even if engineer has NO PostgreSQL installed locally
# Works even if engineer has DIFFERENT PostgreSQL version locally

# 8. Clean teardown
docker-compose down  # Removes all containers, clean state
```

**Success criteria:**

- "Fresh clone → docker-compose up -d starts PostgreSQL container, docker ps shows postgres running, npm install → npm
  run setup completes with 0 errors creating database in Docker, npm run dev connects to containerized database on
  localhost:5432, works on machine with NO local PostgreSQL installation"

**Critical Docker benefits to verify:**

- [ ] .env.example has DATABASE_URL pointing to Docker port (postgresql://postgres:password@localhost:5433/new_crm)

**Handling Port Conflicts (If Engineer Has Local PostgreSQL on 5432):**

```yaml
# docker-compose.yml - Map to different port
services:
  postgres:
    image: postgres:18
    ports:
      - "5433:5432"  # External port 5433 to avoid conflict with local PostgreSQL on 5432
    environment:
      POSTGRES_PASSWORD: password
```

```bash
# .env.example - Point to Docker port
DATABASE_URL=postgresql://postgres:password@localhost:5433/new_crm
```

**Verification:**

```bash
# Engineer has local PostgreSQL on 5432
lsof -i :5432  # Shows local PostgreSQL running

# Docker uses 5433 instead
docker-compose up -d
lsof -i :5433  # Shows Docker PostgreSQL running

# No conflict - both can run simultaneously
npm run dev  # App connects to Docker database on 5433, not local 5432
```

**Success criteria must include:**

- "docker-compose.yml maps PostgreSQL to port 5433 (not 5432) to avoid conflicts with local installations"
- "npm run dev connects to Docker database on localhost:5433 even when local PostgreSQL running on localhost:5432"

**Documentation must include:**

- `docker-compose.yml` with PostgreSQL service using port 5433:5432
- `.env.example` with DATABASE_URL=postgresql://...@localhost:5433/...
- README: "Docker PostgreSQL uses port 5433 to avoid conflicts"
- README: "Prerequisites: Docker Desktop installed"
- README: Quick start instructions mentioning docker-compose

---

## Frontend Success Criteria Examples

### Example 1: Dashboard Widget

- "Opening http://localhost:3000/dashboard displays ConversionWidget in top-left grid position"
- "Widget shows 'Conversion Rate: 23.4%' with data from GET /analytics"
- "Browser console: 0 errors on /dashboard page load"

---

## Backend Success Criteria Examples

### Example 1: Login Endpoint (`POST /auth/login`)

```bash
# Test valid credentials
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Verify response:
# - Status: 200
# - Response body contains: { "token": "eyJ...", "user": { "email": "test@example.com", "firstName": "Test" } }
# - Token is valid JWT (can decode)

# Test invalid credentials
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong"}'

# Verify response:
# - Status: 401 Unauthorized (REST uses real status codes — not always 200)
# - Response body contains: { "statusCode": 401, "message": "Invalid credentials" }
```

### Example 2: Protected Endpoint (`GET /users/me`)

```bash
# Test without authentication
curl -i http://localhost:3000/users/me

# Verify response:
# - Status: 401 Unauthorized
# - Response body contains: { "statusCode": 401, "message": "Unauthorized" }

# Test with valid token
curl -i http://localhost:3000/users/me \
  -H "Authorization: Bearer eyJhbGc..."

# Verify response:
# - Status: 200
# - Response contains: { "email": "...", "firstName": "...", "lastName": "..." }
# - All fields present (no null values)
```

### Example 3: REST API Endpoint

```bash
# Test creating lead
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{"email": "lead@example.com", "firstName": "John", "budget": 50000}'

# Verify response:
# - Status: 201
# - Response body: { "id": "uuid", "email": "lead@example.com", "firstName": "John", "budget": 50000, "createdAt": "2025-01-15T..." }
# - All fields use camelCase (not snake_case)

# Verify in database
psql -d new_crm -c "SELECT email, first_name FROM leads WHERE email = 'lead@example.com';"
# - Record exists in database
# - Field names match schema
```

---

## Integration Success Criteria

### Frontend Integration

- "conversion-widget.component.ts file exists in src/components/widgets/"
- "dashboard.component.ts imports ConversionWidget: `import { ConversionWidget } from '@/components/widgets/ConversionWidget'`"
- "dashboard.component.ts renders ConversionWidget in template: `<app-conversion-widget />`"
- "Opening /dashboard shows ConversionWidget displaying conversion rate data"

### Backend Integration

- "auth/dto/login.dto.ts defines: `{ email: string (@IsEmail); password: string (@IsString) }` and `LoginResponse { token: string; user: UserDto }`"
- "auth.controller.ts imports the DTOs: successfully compiles"
- "auth.controller.ts implements `POST /auth/login`: handles valid/invalid credentials (200 vs 401)"
- "curl POST to /auth/login returns 200 with the expected JWT token"

---

## Why "Feature Works" Is Not Enough — the concrete failures

- **Field mismatch:** the API returned `first_name`, the Angular UI expected `firstName`. TypeScript compiled, Jest
  passed, the browser threw "Cannot read property 'firstName' of undefined".
- **Port conflict:** `docker-compose up -d` failed on a second engineer's machine with "ERROR: port 5432 is already
  allocated", because they ran PostgreSQL locally on 5432.
- **Missing database user:** `npm run setup` on a fresh clone failed with "ERROR: role 'new_crm_user' does not exist".
- **Missing secret:** `curl POST /api/auth/login` returned "Internal Server Error" because `JWT_SECRET` was absent
  from `.env`; the Jest tests had mocked the auth service and never touched it.
