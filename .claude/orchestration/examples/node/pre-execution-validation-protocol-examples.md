# Pre-Execution Validation — worked instances (Node / NestJS / Angular / Sequelize)

Companion to `core/methodology/pre-execution-validation-protocol.md`. Section names match. The protocol lives there;
the commands and the one worked trade-off live here, because both are only ever true of one project.

**For an install:** take this pack only if the target is Node/NestJS/Angular. Otherwise take `core/` alone and write
the probes your own project needs.

---

## Phase 2: Infrastructure Validation — the trade-off, priced

- mobile-mcp research: "Autonomous testing like Playwright!"
- mobile-mcp validation: requires a 7GB iOS simulator download, 30-60 min setup
- Comparison: Lighthouse PWA audit (built-in, 2 min, proven approach)
- Decision: use Lighthouse + manual install test for the current feature, test mobile-mcp later
- **Result:** avoided setup delays and unknown troubleshooting

The validation that produced the answer in seconds:

```bash
# Don't assume - validate:
xcrun simctl list devices  # iOS simulators available?
# If empty: mobile-mcp won't work, need alternative
```

## Phase 3: Proactive Blocker Removal — the probes

```bash
# If agent needs to import from X, verify X exists:
ls path/to/file.ts
cat path/to/file.ts | head -20  # Verify exports expected
```

```bash
# Backend needed?
curl http://localhost:3000/leads || npm run dev

# Database needed?
docker ps | grep postgres || npm run db:start
```

```bash
# TypeScript compiling?
npm run type-check

# Tests passing?
npm test

# Dependencies installed?
ls node_modules/ || npm install
```

## Common Blocker Categories — the checks, per category

**1. Import path issues**

```bash
# Agent will import from X? Verify X exists:
ls src/app/api/leads.service.ts
```

**2. Connection configuration**

```bash
# Dev uses localhost/proxy; production uses the deployed HTTPS API origin
# Check the HttpClient provider / API base URL, WebSocket connections
```

**3. Service dependencies**

```bash
# Backend needed? Start it:
npm run dev

# Database needed? Start it:
docker ps | grep postgres || npm run db:start
```

**5. Environment mismatches**

```bash
# Development database has schema?
npm run db:migrate:fresh

# Environment variables set?
cat .env.local | grep REQUIRED_VAR
```
