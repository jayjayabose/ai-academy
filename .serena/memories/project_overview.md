# ai-academy — project overview

A 5-day training course repo ("AI Orchestration Mastery") in which the trainee builds a **real-estate
CRM** from scratch while practising agent-orchestration patterns. Two halves:

1. **Course material (read-only, rebased from upstream)** — `course/guidebook/`
   - `companion/day-1..day-5` — the sequential trail; `day-1/day-1-build-requirements.md` is the spec
   - `chapters/01..08` — deep dives (orchestration mindset, two-tier testing, validation gates, MCP,
     sub-agents, slash commands, context management, deterministic gates)
   - `bonus-modules/`, `appendices/`
2. **Orchestration tooling** — `.claude/` (`orchestration/{playbook,methodology,meta}`, `commands/`).
   Introduced Day 2. Note `playbook/nestjs-patterns.md` is a stub full of `[Content: ...]` placeholders.

## Product being built (Day 1 required scope)
Lead + Interaction data model · CSV import of 50–100 leads with 2–5 interactions each · Angular lead
list + detail pages · CRUD (create/edit/delete lead, log interaction) · Jest unit tests on services.
Stretch: AI lead summaries, AI activity score (0–100, persisted). Days 2–5 add LLM features
(OpenRouter), JWT auth, WebSockets, PWA.

## Mandated stack (not a choice)
npm · NestJS 11 (`@nestjs/platform-express`, REST) · Sequelize 6 + `sequelize-typescript` ·
PostgreSQL · Angular · Jest. Node 22 (`.nvmrc`; Node 18 is a hard blocker — Angular needs
`^22.22.3 || ^24.15.0 || >=26`).

## Current state (branch `day_01`, HEAD `9da44d6 day_01 infrastructure v1`)
**Task 0 (infrastructure) only.** Verified working; nothing of the CRM itself exists yet.
Built so far: npm workspaces root, Docker Compose Postgres, env validation, Umzug migrations,
`/api/health` + `/api/health/db`, and *throwaway* smoke scaffolding. `apps/web` and
`packages/shared` do **not** exist yet.

See `mem:architecture_and_conventions`, `mem:current_state_and_next_steps`.
