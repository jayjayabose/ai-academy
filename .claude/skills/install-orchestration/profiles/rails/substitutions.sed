# Mechanical Node/TS -> Ruby/Rails swaps for files the profile does not fully replace.
# High-confidence literal substitutions ONLY. Anything needing judgement is deliberately
# left alone so the residue check surfaces it for a human/agent pass.

# --- normalise workspace forms FIRST ------------------------------------
# The base repo is an npm-workspaces monorepo, so its real commands look like
# `npm run --workspace apps/api lint`. Collapse that to the bare form so the
# rules below keep matching. This must come first.
s#npm run --workspace apps/[a-zA-Z][a-zA-Z0-9_-]* #npm run #g
s#npm run --workspace=apps/[a-zA-Z][a-zA-Z0-9_-]* #npm run #g
s#npm exec --workspace apps/[a-zA-Z][a-zA-Z0-9_-]* -- eslint [^\n]*#bin/rubocop#g
s#npm --workspace apps/[a-zA-Z][a-zA-Z0-9_-]* run #npm run #g

# --- absent gates: rewrite the CLAIM, never translate the token ------------
# Ruby has no type checker and this profile's project-profile.md defines FOUR gates
# (2-5). Two failure modes to avoid, both seen in a real install:
#   * translating the tool  -> `bundle exec tsc --noEmit`, `bin/rails zeitwerk:check`:
#     commands that do not exist here. An agent runs one, cannot fix the failure, and
#     either stalls or reports a pass it never got.
#   * translating the tool but not the sentence around it -> "5 validation gates
#     (TypeScript, ...)" still asserts a gate this stack cannot run.
# So: whole claims first, then the generic mop-up. ORDER IS LOAD-BEARING -- these must
# precede the command rules below, `s|npx |bundle exec |g` and `s|ESLint|RuboCop|g`,
# or the text they match will already have changed underneath them.

# -- whole claims that name a gate this stack does not have --
s|- \*\*Enforce all 5 validation gates (MANDATORY)\*\* - TypeScript, ESLint, Tests, Process cleanup, Manual testing|- **Enforce all 4 validation gates (MANDATORY)** - RuboCop, Specs, Process cleanup, Manual verification. There is no type or load gate in this project.|g
s|- ✅ 5 validation gates (TypeScript, ESLint, tests, process cleanup, manual testing)|- ✅ 4 validation gates (RuboCop, specs, process cleanup, manual verification -- no type/load gate here)|g
s|- \[ \] 5 validation gates (TypeScript, ESLint, tests, process cleanup, manual testing)|- [ ] 4 validation gates (RuboCop, specs, process cleanup, manual verification -- no type/load gate here)|g
s|- ✅ \*\*5 validation gates (MANDATORY):\*\* TypeScript (0 errors), ESLint (0 warnings), Tests (all passing), Process|- ✅ **4 validation gates (MANDATORY):** RuboCop (0 offenses), Specs (all passing), Process|g
s|  cleanup (no hanging servers), Manual testing (browser OR curl)|  cleanup (no hanging servers), Manual verification (rails console, or the dummy host app)|g
s|- Validation gate failures (TypeScript errors, test failures)|- Validation gate failures (RuboCop offenses, spec failures)|g
s|- \[ \] TypeScript: 0 errors (MANDATORY)|- [ ] Load/type gate: N/A in this project -- say so; do not fabricate a command|g
s|- \*\*TypeScript Pre-Completion Validation Gate\*\* (proven pattern)|- **Pre-Completion Validation Gates** -- RuboCop, specs, cleanup, manual (proven pattern)|g
s|- TypeScript validation gate added to prevent false completion claims|- Static-analysis gate added upstream; no equivalent exists here (see meta/project-profile.md)|g
s|- Phase 4: TypeScript validation gate added|- Phase 4: static-analysis gate added upstream -- no equivalent here|g
s|- ✅ All validation gates passed (TypeScript, ESLint, tests, device/browser testing)|- ✅ All validation gates passed (RuboCop, specs, cleanup, manual verification)|g
s|- \*\*TypeScript validation mandatory:\*\* Run `npm run typecheck` before claiming complete|- **Lint validation mandatory:** Run `bin/rubocop` (0 offenses) before claiming complete. There is no type or load gate in this project.|g
s|- Agents ran `npm test` but not `npm run typecheck`|- Agents ran `bin/rspec` but not `bin/rubocop` (the real lint gate here)|g
s|\*\*Gate 1: TypeScript (0 errors)\*\*|**Gate 1: Load check -- N/A IN THIS PROJECT** (no Sorbet/RBS; `app:zeitwerk:check` is red on a clean `main`). Four gates here, 2-5.|g
s|npx tsc --noEmit.*|# no type or load gate in this project -- see meta/project-profile.md|g
s|TypeScript + ESLint + Tests mandatory|RuboCop + Specs + Cleanup + Manual mandatory (no type/load gate here)|g

# -- session-log placeholders: say the gate is absent, do not ask for its output --
s|\[paste npm run typecheck output\]|N/A -- this project has no type or load gate. State that; do not paste output.|g
s|\[Paste npm run typecheck output\]|N/A -- this project has no type or load gate. State that; do not paste output.|g

# -- gate assertions in prose: rewrite the whole sentence --
s|1. TypeScript: 0 errors (`npm run typecheck`)|1. Load/type gate: N/A in this project -- see meta/project-profile.md|g
s|1. \*\*TypeScript:\*\* 0 errors (`npm run typecheck`)|1. **Load/type gate:** N/A in this project -- see meta/project-profile.md|g
s|\*\*Solution:\*\* Run npm run typecheck before claiming complete|**Solution:** Run `bin/rubocop` before claiming complete|g
s|- \[ \] Check TypeScript: `npm run typecheck`|- [ ] Check lint: `bin/rubocop`|g

# -- the BARE command only (whole line, optionally indented, optionally with a trailing
#    comment or a `$ ` prompt). A `#` comment is safe where a command was expected.
#    Deliberately NOT a global swap: mid-sentence it produces
#    "Run # no type or load gate ... before claiming complete", which is the same
#    translate-the-token-not-the-claim bug this block exists to prevent. Prose
#    occurrences are left for the residue check to surface, per this file's header --
#    most of them sit in success-criteria.md, which the profile already flags for a
#    full phase-2 rewrite.
s|^npm run typecheck$|# no type or load gate in this project -- see meta/project-profile.md|
s|^npm run type-check$|# no type or load gate in this project -- see meta/project-profile.md|
s|^\( *\)npm run typecheck$|\1# no type or load gate in this project -- see meta/project-profile.md|
s|^\( *\)npm run typecheck  *#.*|\1# no type or load gate in this project -- see meta/project-profile.md|
s|^\$ npm run typecheck$|$ # no type or load gate in this project -- see meta/project-profile.md|
s|^npm run typecheck .*$|# no type or load gate in this project -- see meta/project-profile.md|
# a gate assertion in a regression checklist -- rewrite the claim, not the token
s|- \[ \] \\`npm run typecheck\\` shows MORE errors than before|- [ ] \\`bin/rubocop\\` shows MORE offenses than before|g

# -- template count: this profile ships two agent-prompt templates --
s|- 8 prompt templates ready to use|- 2 prompt templates on disk (infrastructure-patterns.md, rspec-testing-agent.md); every other role is built from methodology/prompt-templates.md + agent-specs-library.md|g

# -- gate COUNT mop-up: four here, because Gate 1 does not exist --
s|Five mandatory validation gates|Four mandatory validation gates|g
s|5 validation gates|4 validation gates|g
s|all 5 in every prompt|all 4 in every prompt|g
s|5 gates|4 gates|g

# --- commands -------------------------------------------------------------
# (typecheck -> no-gate marker handled in the absent-gates block above;
#  it must NOT become `bin/rails zeitwerk:check` -- un-namespaced that task does
#  not exist in an engine, and the profile documents the gate as absent anyway.)
s|npm run lint|bin/rubocop|g
s|npm run test:integration|bin/rspec spec/requests|g
s|npm run test:watch|bin/rspec --watch|g
s|npm run test:cov|bin/rspec \&\& open coverage/index.html|g
s|npm run test:all|bin/rspec|g
s|npm run test|bin/rspec|g
s|npm test|bin/rspec|g
s|npm run dev:api|bin/rails s|g
s|npm run dev:web|bin/rails s|g
s|npm run dev|bin/rails s|g
s|npm run start|bin/rails s|g
s|npm run setup|bin/setup|g
s|npm install|bundle install|g
s|npm ci|bundle install --deployment|g
s|npm run db:migrate:status|bin/rails db:migrate:status|g
s|npm run db:migrate:undo|bin/rails db:rollback STEP=1|g
s|npm run db:migrate|bin/rails db:migrate|g
s|npm run db:seed:fresh|bin/rails db:seed:replant|g
s|npm run db:seed|bin/rails db:seed|g
s|npm run db:reset|bin/rails db:reset|g
s|npm run db:start|bin/rails db:prepare|g
s|npm run db:stop|docker compose down|g
s|npm run seed|bin/rails db:seed|g
s|npm run audit|bundle exec bundler-audit check --update|g
# Rails usually has no build step. Leave a visible marker rather than inventing one:
# the residue check greps for {{ so this surfaces instead of reading as a real command.
s|npm run build|{{BUILD_COMMAND -- Rails often has none; assets:precompile if using Sprockets/Propshaft}}|g
s|npx |bundle exec |g

# --- process cleanup -----------------------------------------------------
s|pkill -f "nest start"|pkill -f puma|g
s|pkill -f "ng serve"|pkill -f sidekiq|g
s|lsof -i :3001|lsof -i :6379|g

# --- tools ---------------------------------------------------------------
# NOTE: no \b word boundaries below. BSD sed (macOS) does not support them and
# silently makes the whole rule a no-op. These names are distinctive enough that
# an unanchored global replace is safe.
s|TypeScript compilation|Load check (zeitwerk)|g
s|TypeScript compiles|Ruby loads cleanly|g
s|ESLint|RuboCop|g
s|eslint|rubocop|g
s|Jest|RSpec|g
s|Vitest|RSpec|g
# Playwright MCP is a browser-driving tool and is stack-agnostic: keep it for
# system-level verification. Only the *test framework* sense becomes Capybara.
s|Playwright testing|Capybara system specs|g
s|playwright-testing-agent|capybara-system-spec-agent|g
s|NestJS|Rails|g
s|nestjs-service-agent|rails-service-agent|g
s|nestjs-patterns|rails-patterns|g
s|testing-infrastructure-agent|rspec-testing-agent|g
s|nestjs|rails|g
s|Sequelize|ActiveRecord|g
s|sequelize-model-agent|activerecord-model-agent|g
s|sequelize|activerecord|g
s|umzug|ActiveRecord migrations|g
s|Angular component|ViewComponent|g
s|angular-component-agent|view-component-agent|g
s|angular-agent|rails-view-agent|g
s|Angular|Rails view layer|g
s|angular|rails-views|g

# --- file extensions in example paths ------------------------------------
s|\.spec\.ts|_spec.rb|g
s|path/to/test\.ts|path/to/some_spec.rb|g
s|\.controller\.ts|_controller.rb|g
s|\.service\.ts|_service.rb|g
s|\.module\.ts|.rb|g

# --- conventions ---------------------------------------------------------
# Rails is snake_case in Ruby AND the database. The base knowledge base mandates
# camelCase in 30+ places; left alone it contradicts meta/project-profile.md and an
# agent reading the playbook instead of the profile names columns wrong.
# Order matters: replace the example identifiers before the bare word.
s|(userId, createdAt, updatedAt)|(user_id, created_at, updated_at)|g
s|(leadId, budgetMin, budgetMax, firstName, lastName)|(lead_id, budget_min, budget_max, first_name, last_name)|g
s|(leadId, budgetMin, budgetMax)|(lead_id, budget_min, budget_max)|g
s|(leadId, budgetMin, lastContactDate)|(lead_id, budget_min, last_contact_date)|g
s|(leadId, budgetMin, firstName)|(lead_id, budget_min, first_name)|g
s|no snake_case/camelCase mismatches exist|snake_case is used consistently (Rails convention)|g
s|camelCase/snake_case mismatches|snake_case consistency|g
s|no snake_case anywhere|snake_case everywhere -- Rails convention|g
s|If the DTOs use camelCase, controllers use camelCase|Serializers own any boundary casing change; controllers stay snake_case|g
s|camelCase ONLY (matching the shared API types exactly)|snake_case (Rails convention end to end)|g
s|camelCase consistency|snake_case consistency|g
s|camelCase throughout|snake_case throughout|g
s|camelCase|snake_case|g

# NB: everything below runs AFTER the bare-word rule above ON PURPOSE. Placed before
# it, the `camelCase` inside these replacement strings is itself rewritten and you get
# "**NO snake_case:** Never leadId" -- a rule that flips the convention and then
# mangles its own output. Order is load-bearing twice over in this section.
# A rule that flips a convention must own the WHOLE block. Rewriting only the
# positive claim leaves its negation standing, and the pair then cancels out:
#   - **ALL FIELDS:** Use snake_case consistently (lead_id, ...)   <- rewritten
#   - **NO SNAKE_CASE:** Avoid field names like lead_id, ...       <- forbids it
#   - **Boolean Fields:** Use isActive, hasPermission, canEdit     <- and camelCase again
# Three adjacent lines mandating snake_case, forbidding snake_case, then giving
# camelCase examples. verify-install.sh §5 catches this now; these rules prevent it.
s|- \*\*NO SNAKE_CASE:\*\* Avoid field names like lead_id, budget_min, first_name|- **NO camelCase:** Never `leadId`, `budgetMin`, `firstName`. Rails is snake_case end to end, including JSON responses, unless a serializer explicitly converts at one named boundary|g
s|- \*\*Boolean Fields:\*\* Use isActive, hasPermission, canEdit patterns|- **Boolean Fields:** Use `active?` predicates / `is_active`, `has_permission`, `can_edit`|g
s|- \*\*Date Fields:\*\* Use createdAt, updatedAt, completedAt patterns|- **Date Fields:** Use `created_at`, `updated_at`, `completed_at`|g
# `leadId (NOT lead_id)` mandates camelCase without containing the word at all,
# so the bare-word rule below cannot see it. Flip the pair.
s|- leadId (NOT lead_id)|- lead_id (NOT leadId)|g
s|- budgetMin (NOT budget_min)|- budget_min (NOT budgetMin)|g
s|- createdAt (NOT created_at)|- created_at (NOT createdAt)|g

# --- unknown project facts: point at the profile, never invent a placeholder ---
# A surviving `{{DATABASE_NAME}}` is WORSE than a wrong name because it looks filled in.
# Substitution cannot know the target's database, so defer to the file that does.
# ORDER MATTERS: the test database is its own name, not "<dev>_test". Mapping
# `new_crm` first would turn `new_crm_test` into `$DB_NAME_test` -- in shell that
# is a DIFFERENT, undefined variable, and in prose it invents a database.
s|new_crm_test|$TEST_DB_NAME|g
s|new_crm|$DB_NAME|g
