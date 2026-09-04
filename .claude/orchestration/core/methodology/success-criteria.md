# Specific Success Criteria (Not "Feature Works")

**Purpose:** Transform vague success criteria into specific, testable verification steps

**Anti-Pattern:** Agents claim "feature works" or "component created" without specific verification

**Pattern:** Every feature needs specific success criteria for frontend AND backend

**The criteria are portable; the commands that satisfy them are not.** Each section below states what a criterion must
assert and what counts as observable evidence. A worked set — real URLs, real commands, real expected output — is in
`examples/<stack>/success-criteria-examples.md`.

---

## The Problem with Generic Success Criteria

###  GENERIC (Don't Use)

**Frontend:**

- "Feature works"
- "Widget component created"
- "Dashboard updated"
- "UI looks good"

**Backend:**

- "API endpoint created"
- "Login works"
- "Database updated"
- "REST endpoint implemented"

**Infrastructure:**

- "Database set up"
- "Testing framework configured"
- "Development environment ready"
- "Server running"

**Why these fail:**

- Not testable (how do you verify "works"?)
- Not specific (what exactly should happen?)
- Agent can claim success without actual verification
- Integration failures hidden

---

## The Solution: Specific Verification Steps

###  SPECIFIC (Always Use)

A specific criterion names an **action** and the **observable outcome** of that action. If you cannot tell from
reading the criterion whether it passed, it is still generic.

**Frontend Examples:**

- "Opening the dashboard route displays the conversion widget with live data"
- "Widget appears in grid layout at expected position (top-left of 3-column grid)"
- "Clicking widget refresh button triggers data reload and shows loading state"
- "Browser console shows 0 errors when the dashboard route loads"

**Backend Examples:**

- "A login request with valid credentials returns 200 with a valid auth token in the response body's `token` field"
- "The current-user endpoint returns email, firstName, lastName fields with correct values"
- "A login request with valid credentials returns 200 and sets the session cookie the contract names"
- "The protected users endpoint returns 401 when called without a valid token"

**Infrastructure Examples:**

- "Fresh clone → start services → install dependencies → run setup → start dev server results in the app serving on
  its documented port in under 5 minutes, on a machine with NO locally installed database"
- "The container listing shows the database container running at the version the project pins"
- "Running the test command immediately after setup executes the suite (not a 'framework not configured' error)"
- "Database migrations apply successfully: the migration command reports '5 migrations applied' with 0 errors"
- "The project compiles: the type/compile check returns 0 errors on fresh setup"
- "Opening the app URL after starting the dev server displays the landing page (not connection refused)"
- "Tearing the environment down leaves no project services running (clean teardown)"

**Why these work:**

- Testable (specific action → specific outcome)
- Measurable (can verify happened or didn't)
- Complete (covers creation + integration + verification)
- Prevents claiming success without proof

---

## Success Criteria Template Pattern

Use this pattern in ALL agent prompts. Substitute the project's own commands for the bracketed slots — a filled-in
copy is in `examples/<stack>/success-criteria-examples.md`.

```markdown
## SUCCESS CRITERIA (SPECIFIC VERIFICATION)

### Manual Testing Validation

INFRASTRUCTURE (for setup/config tasks):
1. Fresh clone test: clone → start containerised services (if used) → install dependencies → run setup
2. Verify services running: the service listing shows all required containers (if using containers)
3. Verify setup completes: 0 errors, creates database, runs migrations, seeds data
4. Verify dev server starts: run the dev command → server accessible on expected port
5. Verify the project compiles: run the type/compile check → 0 errors
6. Verify tests run immediately: run the test command → framework configured, test DB ready
7. Verify works on clean machine: no locally installed database/cache required (if using containers)

FRONTEND (use a browser-automation MCP for browser verification):
1. Open browser to {SPECIFIC_URL}
2. Verify {SPECIFIC_ELEMENT} displays {SPECIFIC_BEHAVIOR}
3. Test {SPECIFIC_INTERACTION} results in {SPECIFIC_OUTCOME}
4. Check browser console: 0 errors

BACKEND (issue real requests against the running service):
1. Send {HTTP_METHOD} {API_ENDPOINT} with {REQUEST_BODY}
2. Verify response status: {EXPECTED_STATUS}
3. Verify response body contains: {EXPECTED_FIELDS}
4. Test authentication: login returns valid token/session
5. Test authorization: protected endpoints reject unauthorized requests

### Integration Verification

- [ ] {Component} integrated into {Target}
- [ ] {Target} displays {Component} correctly
- [ ] User can see {Component} at {Location}
- [ ] Backend API returns expected data structure
- [ ] Frontend successfully consumes backend response
- [ ] Infrastructure ready: Fresh clone → working app (if infrastructure task)

### Complete User Flow

NOT "feature works" - but:
- Frontend: "user sees X when they do Y"
- Backend: "API returns X when called with Y"
- Infrastructure: "fresh clone → start services → setup → dev = working app in under 5 minutes on ANY machine"
```

---

## Infrastructure Success Criteria Examples

Infrastructure criteria are the ones most often written generically, because "it worked on my machine" feels like
evidence. It is not. Every infrastructure criterion below is stated as *fresh clone → observable end state*.

The commands for each are in `examples/<stack>/success-criteria-examples.md`, under matching headings.

### Example 1: Database Setup (Containerised - Recommended)

**Generic (Bad):**

- "Database configured"

**Specific (Good) - Containerised Approach:**

The verification runs a fresh clone as if on any engineer's machine, and checks, in order:

1. The container runtime starts the database from the project's service definition
2. The service listing shows the database container running
3. The setup script runs against the containerised database — creates the database, runs migrations, seeds data
4. Database operations succeed against the container: the database exists, and seeded rows can be counted
5. The app starts and connects to the containerised database
6. No conflict with a locally installed database of the same kind

**Success criteria:**

- "Fresh clone → start services → install dependencies → run setup completes in under 2 minutes with 0 errors,
  creates a containerised database with 5 migrations applied and 3 seeded users, and the dev command connects to the
  containerised database without 'connection refused' errors"

**Why containers matter:**

-  Works on ANY engineer's machine (Mac, Linux, Windows)
-  No conflicts with locally installed databases
-  Consistent database version across all developers
-  Clean teardown (bringing the services down removes everything)
-  No "works on my machine" issues

### Example 1B: Database Setup (Host-Installed Database - Alternative)

**If not using containers,** the same fresh-clone verification applies, run against the host's database:

1. Database created
2. Migrations applied — the migration status command reports all migrations up, 0 down
3. Seed data loaded — counting rows in a seeded table returns the expected number
4. Models load without error — the type/compile check succeeds
5. The app runs — the dev server starts without database connection errors

**Success criteria:**

- "Running setup on a fresh clone creates the project database, applies 5 migrations, seeds 3 test users, all in
  under 2 minutes with 0 errors"

**Why containers are preferred:**

- A host-installed database requires the engineer to install it
- Version mismatches possible (engineer has one major version, project needs another)
- Port conflicts possible (engineer already using the default port)
- Permission issues possible (different user setups)

### Example 2: Testing Framework Setup

**Generic (Bad):**

- "Testing framework configured"

**Specific (Good):**

On a fresh clone, after installing dependencies only:

1. The test command works immediately, with no additional setup (it does not error "test runner not found")
2. The test database is configured — the run reports it is using the *test* database, not the development one
3. A sample test passes — at least 1 passing test, not "0 tests found"
4. Watch mode works

**Success criteria:**

- "Running the test command immediately after installing dependencies executes the suite against the dedicated test
  database with at least 1 passing example test, 0 errors"

### Example 3: Development Server Setup

**Generic (Bad):**

- "Server running"

**Specific (Good):**

On a fresh clone, after install and setup:

1. Backend starts on its documented port
2. Backend responds — the health endpoint returns an OK body
3. A real resource endpoint is reachable — returns 200 and a JSON array, not 404
4. Frontend starts on its documented port
5. Frontend loads — returns HTML, not connection refused
6. The full stack runs — one command starts backend and frontend together

**Success criteria:**

- "The dev command starts backend and frontend on their documented ports, the backend health endpoint returns 200,
  and requesting the frontend port returns the application's HTML"

### Example 4: Type / Compile Configuration

**Generic (Bad):**

- "Static typing configured"

**Specific (Good):**

1. Compilation works — the type/compile check returns 0 errors
2. Strict mode is enabled — the configuration file shows it
3. Path aliases resolve — a file importing through an alias compiles (not "cannot find module")
4. Editor integration works — errors show inline, hovering a symbol shows full type information

**Success criteria:**

- "The compiler configuration has strict mode enabled, the project's path aliases resolve correctly, and the
  type/compile check returns 0 errors on a fresh clone"

### Example 5: Environment Configuration

**Generic (Bad):**

- "Environment variables configured"

**Specific (Good):**

1. An example environment file exists, listing every required variable
2. The setup script creates the real environment file from the example
3. The app reads the variables — the backend starts with no "variable is not defined" error
4. All required variables are documented in the example file

**Success criteria:**

- "The example environment file contains all required variables (database URL, auth secret, port), setup copies it
  into place, and the dev command starts without 'environment variable undefined' errors"

### Example 6: Complete Containerised Infrastructure

**Generic (Bad):**

- "Containers configured"

**Specific (Good):**

Fresh clone on a completely clean machine:

1. The service definition file exists, covering database, cache, and anything else the app needs
2. Starting the services brings all of them up
3. The service listing shows every expected container running, and the count matches
4. The database is reachable inside its container and reports its version
5. Dependencies install and setup runs — creating the database inside the container
6. The app starts and connects to the containerised services
7. No local installation is required — it works with none of those services installed on the host, and with a
   *different* version installed on the host
8. Clean teardown — bringing the services down removes all containers

**Success criteria:**

- "Fresh clone → starting the services brings up the database container, the service listing shows it running,
  install → setup completes with 0 errors creating the database inside the container, the dev command connects to the
  containerised database on its mapped port, and all of this works on a machine with NO locally installed database"

**Critical container benefits to verify:**

- [ ] Works without a locally installed database
- [ ] Consistent database version across all engineers (pinned in the service definition)
- [ ] No port conflicts with a host-installed database (map to a non-default external port)
- [ ] Clean teardown (bringing services down removes everything)
- [ ] The example environment file points at the mapped port, not the default one

**Handling Port Conflicts (If the Engineer Already Runs That Service Locally):**

Map the container's port to a *different* external port in the service definition, and point the example environment
file at that mapped port. Then verify:

1. The host service is running on the default port
2. Starting the containers puts the project's service on the mapped port
3. Both run simultaneously with no conflict
4. The app connects to the container's mapped port, not the host's default one

**Success criteria must include:**

- "The service definition maps the database to a non-default external port to avoid conflicts with host installations"
- "The dev command connects to the containerised database on the mapped port even when a host database is running on
  the default port"
- "Engineer can keep their host database running without interference"

**Documentation must include:**

- The service definition, with the database service using the non-default external port mapping
- The example environment file, with the connection URL pointing at the mapped port
- README: which port the containerised database uses, and why it is not the default
- README: prerequisites, naming the container runtime
- README: quick start instructions that mention bringing the services up

---

## Frontend Success Criteria Examples

### Example 1: Dashboard Widget

**Generic (Bad):**

- "ConversionWidget component created"

**Specific (Good):**

- "Opening the dashboard route displays ConversionWidget in top-left grid position"
- "Widget shows 'Conversion Rate: 23.4%' with data from the analytics endpoint"
- "Clicking 'Refresh' button triggers loading state → updates data"
- "Browser console: 0 errors on dashboard page load"

### Example 2: User Registration Form

**Generic (Bad):**

- "Registration form works"

**Specific (Good):**

- "Opening /register displays form with email, password, confirmPassword fields"
- "Submitting valid data redirects to /dashboard with success message"
- "Submitting invalid email shows 'Invalid email format' error below email field"
- "Submitting mismatched passwords shows 'Passwords must match' error"
- "Browser console: 0 errors during registration flow"

### Example 3: Protected Route

**Generic (Bad):**

- "Authentication working"

**Specific (Good):**

- "Opening /dashboard when logged out redirects to /login"
- "Logging in with valid credentials redirects to /dashboard"
- "Dashboard displays user's email in header: 'user@example.com'"
- "Logging out redirects to /login and clears session"

---

## Backend Success Criteria Examples

A backend criterion is specific when it names the request, the status, and the fields. Both the success case and the
failure case must be stated — an endpoint that never returns an error is an endpoint whose errors were never tested.

The actual requests are in `examples/<stack>/success-criteria-examples.md`.

### Example 1: Login Endpoint

**Generic (Bad):**

- "Login endpoint implemented"

**Specific (Good):**

- Valid credentials → status 200, response body contains a `token` and a `user` object carrying the caller's email
  and name; the token decodes as a valid auth token
- Invalid credentials → status 401 (real HTTP status codes, not 200-with-an-error-body), response body contains the
  status code and an "Invalid credentials" message

### Example 2: Protected Endpoint

**Generic (Bad):**

- "User profile endpoint works"

**Specific (Good):**

- Without authentication → status 401, response body contains the status code and an "Unauthorized" message
- With a valid token → status 200, response contains email, firstName, lastName, all fields present with no null
  values

### Example 3: REST API Endpoint

**Generic (Bad):**

- "Create lead endpoint works"

**Specific (Good):**

- Creating a resource with a valid body and a valid token → status 201, response body echoes the submitted fields
  plus the generated id and creation timestamp
- All response fields use the API layer's naming convention, not the database's
- The record is verifiable in the database directly, and its column names match the schema

---

## Integration Success Criteria

**Not just "component created" - but "component integrated and working"**

### Frontend Integration

**Generic (Bad):**

- "ConversionWidget component created"

**Specific (Good):**

- "The widget's source file exists at the path the project's conventions put components"
- "The dashboard imports ConversionWidget, and the import resolves"
- "The dashboard renders ConversionWidget in its template"
- "Opening the dashboard route shows ConversionWidget displaying conversion rate data"

### Backend Integration

**Generic (Bad):**

- "Login endpoint added to the API"

**Specific (Good):**

- "The request and response types for login are defined, with validation declared on each field"
- "The controller imports those types and compiles"
- "The controller implements the login route and handles valid and invalid credentials distinctly (200 vs 401)"
- "A real login request returns 200 with the expected auth token"

---

## Success Criteria Checklist for Agent Prompts

When creating agent prompts, verify success criteria include:

**Infrastructure Tasks:**

- [ ] Fresh clone test specified (clone → start services → install → setup)
- [ ] Service verification (if containerised): the service listing shows all required containers running
- [ ] Setup completion criteria (0 errors, database created, migrations applied)
- [ ] Dev server start verification (dev command → accessible on expected port)
- [ ] Type/compile check (0 errors)
- [ ] Test framework readiness (test command runs immediately, not "framework not configured")
- [ ] Environment variables documented (example file with the connection URL for the chosen setup)
- [ ] Works on clean machine: no local database installation required (if containerised)
- [ ] Clean teardown documented: bringing the services down removes them all

**Frontend Features:**

- [ ] Specific URL to open (not just "open browser")
- [ ] Specific element to verify (not just "check UI")
- [ ] Specific interaction to test (not just "test feature")
- [ ] Browser console verification (0 errors)
- [ ] Browser-automation testing steps

**Backend Features:**

- [ ] Specific request to issue (exact endpoint, request body)
- [ ] Expected HTTP status code
- [ ] Expected response body fields (exact field names)
- [ ] Authentication testing (with/without token)
- [ ] Error case testing (invalid input → proper error response)

**Integration Features:**

- [ ] Component integration verified (import exists)
- [ ] Target system displays component (visible in browser)
- [ ] Data flows correctly (backend → frontend)
- [ ] All field names match (no mismatches)

---

## Why "Feature Works" Is Not Enough

Each failure below has the same shape: every automated gate passed, and the feature was still broken. The specific
criterion is what forced the check that caught it.

**Validation gates:** @.claude/orchestration/core/methodology/validation-gates.md

**Example scenario:**

Agent claims: "Feature works" 

**Reality:**

- Type/compile check passes 
- Tests pass 
- **Browser:** "Cannot read property 'firstName' of undefined" 
- **Root cause:** the API response returns `first_name` but UI expects `firstName`

**With specific success criteria:**
"Opening the dashboard displays user firstName in header"
→ Agent tests in browser
→ Catches field name mismatch
→ Fixes before claiming complete

### Example 2: Infrastructure Setup Failure (Port Conflict)

Agent claims: "Database configured" 

**Reality:**

- The service definition file exists 
- Services start successfully on the agent's machine 
- **Engineer B's machine:** starting the services fails — "port is already allocated" 
- **Root cause:** Engineer B runs that database locally on the default port, so the container cannot bind to it

**With specific success criteria:**
"The service definition maps the database to a non-default external port to avoid conflicts, the services start
successfully even when a host database is running on the default port, and the dev command connects to the
containerised database on the mapped port"
→ Agent verifies port mapping configuration
→ Tests with simulated port conflict scenario
→ Uses a non-conflicting external port in the service definition

### Example 2B: Infrastructure Setup Failure (Missing User)

Agent claims: "Database configured" 

**Reality:**

- Database created 
- Migrations exist 
- **Fresh clone:** setup fails — "role does not exist" 
- **Root cause:** Setup script doesn't create the database user, only works on the original machine

**With specific success criteria:**
"Fresh clone → start services → install → setup completes in under 2 minutes with 0 errors, creates database,
applies migrations, seeds test data"
→ Agent tests fresh clone scenario (or simulates it)
→ Catches missing user creation step
→ Fixes setup script before claiming complete

### Example 3: Backend API Failure

Agent claims: "Login API works" 

**Reality:**

- Type/compile check passes 
- Tests pass (with the auth service mocked) 
- **Real request:** login returns "Internal Server Error" 
- **Root cause:** the auth signing secret is missing from the environment file, so it throws at runtime

**With specific success criteria:**
"A login request with valid credentials returns 200 + an auth token in the response body's `token` field"
→ Agent issues the actual request
→ Catches missing environment variable
→ Adds the secret to the example environment file, updates setup script

---

**Status:** Canonical guide for transforming generic → specific success criteria (infrastructure, frontend, backend)
