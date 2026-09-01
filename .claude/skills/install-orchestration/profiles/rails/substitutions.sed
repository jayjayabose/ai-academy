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

# --- commands -------------------------------------------------------------
s|npm run type-check|bin/rails zeitwerk:check|g
s|npm run typecheck|bin/rails zeitwerk:check|g
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
# --- absent gates: kill the claim, do not translate it ---------------------
# Ruby has no type checker, so `npx tsc --noEmit` must not be carried through the
# npx rule below into `bundle exec tsc --noEmit` -- a command that does not exist.
# An agent runs it, cannot fix the failure, and either stalls or reports a pass it
# never got. Removing the tool name is not enough either: the surrounding claim
# ("TypeScript + ESLint + Tests mandatory") still asserts a gate this stack cannot
# run. Rewrite the whole claim, not the token inside it.
# MUST precede `s|npx |bundle exec |g` and `s|ESLint|RuboCop|g`.
s|npx tsc --noEmit.*|# no type or load gate in this project -- see meta/project-profile.md|g
s|TypeScript + ESLint + Tests mandatory|RuboCop + Specs + Cleanup + Manual mandatory (no type/load gate here)|g

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
