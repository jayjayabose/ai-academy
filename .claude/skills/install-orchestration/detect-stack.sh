#!/usr/bin/env bash
# Probe a project and emit the facts needed to adapt the orchestration knowledge base.
# Usage: detect-stack.sh [PROJECT_DIR]   (defaults to cwd)
set -uo pipefail

P="${1:-$PWD}"
if [ ! -d "$P" ]; then echo "error: not a directory: $P" >&2; exit 1; fi
P="$(cd "$P" && pwd)"

has() { [ -e "$P/$1" ]; }
say() { printf '%s\n' "$1"; }
# Find which manifest declares a dependency. Scans package.json files (quoted name)
# and Python/Ruby/Go manifests (bare name), ignoring vendored dirs.
dep() {
  local f
  f=$(find "$P" -name package.json -not -path '*/node_modules/*' -maxdepth 4 2>/dev/null \
        | xargs grep -l "\"$1\"" 2>/dev/null | head -1)
  [ -n "$f" ] && { printf '%s' "$f"; return; }
  for m in requirements.txt requirements-dev.txt pyproject.toml Pipfile setup.cfg go.mod Cargo.toml \
           Gemfile Gemfile.lock $(cd "$P" 2>/dev/null && ls *.gemspec 2>/dev/null); do
    if [ -f "$P/$m" ] && grep -qiE "(^|[^a-zA-Z0-9_])$1([^a-zA-Z0-9_]|$)" "$P/$m" 2>/dev/null; then
      printf '%s' "$P/$m"; return
    fi
  done
}

# Like dep(), but only DIRECT declarations — never lockfiles. A transitive
# sorbet-runtime in Gemfile.lock must not be mistaken for a type-check gate.
direct_dep() {
  local m f
  # workspace package.json files are direct declarations too, just not at the root
  f=$(find "$P" -name package.json -not -path '*/node_modules/*' -maxdepth 4 2>/dev/null \
        | xargs grep -l "\"$1\"" 2>/dev/null | head -1)
  [ -n "$f" ] && { printf '%s' "$f"; return; }
  for m in requirements.txt requirements-dev.txt pyproject.toml Pipfile \
           setup.cfg go.mod Cargo.toml Gemfile; do
    if [ -f "$P/$m" ] && grep -qiE "(^|[^a-zA-Z0-9_])$1([^a-zA-Z0-9_]|$)" "$P/$m" 2>/dev/null; then
      printf '%s' "$P/$m"; return
    fi
  done
}

say "# Detected project facts: $(basename "$P")"
say ""
say "Path: \`$P\`"
say ""

say "## Package manager / runtime"
pm="unknown"
if   has pnpm-lock.yaml;    then pm="pnpm"
elif has yarn.lock;         then pm="yarn"
elif has bun.lockb;         then pm="bun"
elif has package-lock.json; then pm="npm"
fi
has package.json && say "- Node project: yes (lockfile implies \`$pm\`)" || say "- Node project: no"
has pyproject.toml && say "- Python: pyproject.toml present"
has requirements.txt && say "- Python: requirements.txt present"
has Pipfile && say "- Python: Pipfile present"
has go.mod && say "- Go: go.mod present"
has Cargo.toml && say "- Rust: Cargo.toml present"
if has Gemfile; then
  say "- Ruby: Gemfile present"
  [ -n "$(ls "$P"/*.gemspec 2>/dev/null)" ] && say "  - **This is a gem/engine, not a standalone app** ($(cd "$P" && ls *.gemspec | head -1))"
  has spec/dummy && say "  - Rails engine with a dummy host app at \`spec/dummy/\` — specs boot that, not a real app"
  has Appraisals && say "  - \`Appraisals\` present: tests run against a MATRIX of dependency versions (\`bundle exec appraisal ...\`)"
  has gemfiles && say "  - \`gemfiles/\` holds the generated appraisal gemfiles"
  has .ruby-version && say "  - Ruby version pinned: $(cat "$P/.ruby-version" 2>/dev/null | tr -d '\n')"
fi
has pom.xml && say "- Java: pom.xml present"
has build.gradle && say "- Java/Kotlin: build.gradle present"
if has package.json; then
  node -e '
    const p=require(process.argv[1]+"/package.json");
    if (p.workspaces) console.log("- Workspaces: "+JSON.stringify(p.workspaces));
    if (p.engines) console.log("- Engines: "+JSON.stringify(p.engines));
  ' "$P" 2>/dev/null
fi
say ""

say "## Frameworks"
for d in "@angular/core:Angular" "react:React" "next:Next.js" "vue:Vue" "svelte:Svelte" \
         "@nestjs/core:NestJS" "express:Express" "fastify:Fastify" "@hapi/hapi:Hapi" \
         "django:Django" "flask:Flask" "fastapi:FastAPI" \
         "rails:Rails" "sinatra:Sinatra" "hanami:Hanami" "grape:Grape" \
         "devise:Devise (auth)" "sidekiq:Sidekiq (jobs)" "view_component:ViewComponent" \
         "graphql:GraphQL"; do
  name="${d%%:*}"; label="${d##*:}"
  f="$(dep "$name")"
  [ -n "$f" ] && say "- $label — declared in \`${f#"$P/"}\`"
done
grep -rqi '^django' "$P/requirements.txt" 2>/dev/null && say "- Django — requirements.txt"
say ""

say "## Data layer"
for d in "sequelize:Sequelize" "prisma:Prisma" "typeorm:TypeORM" "drizzle-orm:Drizzle" \
         "mongoose:Mongoose" "knex:Knex" "sqlalchemy:SQLAlchemy" "alembic:Alembic" \
         "django:Django ORM + migrations" "gorm:GORM" \
         "strong_migrations:strong_migrations (migration safety gate)" \
         "data_migrate:data_migrate (separate data migrations)" \
         "jsonb_accessor:jsonb_accessor"; do
  name="${d%%:*}"; label="${d##*:}"
  [ -n "$(dep "$name")" ] && say "- ORM: $label"
done
[ -n "$(dep 'pg')" ] && say "- Driver: pg (PostgreSQL)"
[ -n "$(dep 'mysql2')" ] && say "- Driver: mysql2"
[ -n "$(dep 'sqlite3')" ] && say "- Driver: sqlite3"
[ -n "$(dep 'psycopg2')" ] || [ -n "$(dep 'psycopg2-binary')" ] || [ -n "$(dep 'psycopg')" ] && say "- Driver: psycopg (PostgreSQL)"
[ -n "$(dep 'pymysql')" ] && say "- Driver: PyMySQL"
if has db/migrate || has db/schema.rb || has db/structure.sql; then
  say "- ActiveRecord: $(ls "$P/db/migrate" 2>/dev/null | wc -l | tr -d ' ') migration(s) in \`db/migrate/\`"
  has db/schema.rb && say "  - schema.rb (checked in — merge-conflict hotspot)"
  has db/structure.sql && say "  - structure.sql (SQL schema format)"
  has db/data && say "  - \`db/data/\` present: data migrations are separate from schema migrations"
fi
if has docker-compose.yml || has compose.yaml || has docker-compose.yaml; then
  say "- Docker Compose present; services:"
  grep -hoE '^[[:space:]]{2,12}(image|container_name|POSTGRES_DB|MYSQL_DATABASE):.*' \
    "$P"/docker-compose.y*ml "$P"/compose.y*ml 2>/dev/null \
    | sed 's/^[[:space:]]*/    - /' | head -12
fi
say ""

say "## Test runners"
for d in "jest:Jest" "vitest:Vitest" "mocha:Mocha" "@playwright/test:Playwright" \
         "cypress:Cypress" "pytest:pytest" "pytest-django:pytest-django" \
         "unittest:unittest" "rspec:RSpec" "rspec-rails:RSpec (Rails)" "minitest:Minitest" \
         "parallel_tests:parallel_tests (specs shard across cores)" "capybara:Capybara" \
         "simplecov:SimpleCov (coverage)" "appraisal:Appraisal (version matrix)" \
         "@testing-library/react:React Testing Library"; do
  name="${d%%:*}"; label="${d##*:}"
  f="$(dep "$name")"
  [ -n "$f" ] && say "- $label — \`${f#"$P/"}\`"
done
has .rspec && { say "- \`.rspec\` default flags: $(tr '\n' ' ' < "$P/.rspec")"; }
say ""

say "## Scripts (the real gate commands live here)"
if has package.json; then
  say '```'
  node -e '
    const p=require(process.argv[1]+"/package.json");
    const s=p.scripts||{};
    const keys=Object.keys(s);
    if(!keys.length) console.log("(no scripts)");
    for(const k of keys) console.log(k.padEnd(22)+s[k]);
  ' "$P" 2>/dev/null
  say '```'
  # workspace-level scripts too
  while IFS= read -r wp; do
    say ""
    say "### \`${wp#"$P/"}\`"
    say '```'
    node -e '
      const p=require(process.argv[1]);
      const s=p.scripts||{};
      for(const k of Object.keys(s)) console.log(k.padEnd(22)+s[k]);
    ' "$wp" 2>/dev/null
    say '```'
  done < <(find "$P" -mindepth 2 -maxdepth 3 -name package.json -not -path '*/node_modules/*' 2>/dev/null | sort | head -6)
else
  if [ -d "$P/bin" ]; then
    say "### \`bin/\` executables — on Rails these ARE the gate commands"
    say '```'
    find "$P/bin" -maxdepth 2 -type f -perm -u+x 2>/dev/null | sed "s|^$P/||" | sort | head -30
    say '```'
  fi
  if has Rakefile || [ -d "$P/lib/tasks" ]; then
    say "### rake tasks (declared)"
    say '```'
    grep -rhoE '^[[:space:]]*(task|namespace)[[:space:]]+:[a-zA-Z0-9_]+' \
      "$P/Rakefile" "$P/lib/tasks" 2>/dev/null \
      | sed 's/^[[:space:]]*//' | sort -u | head -25
    say '```'
    say "Run \`rake -T\` in the project for the authoritative list with descriptions."
  fi
  has Makefile && { say "Makefile targets:"; say '```'; grep -E '^[a-zA-Z0-9_.-]+:' "$P/Makefile" | cut -d: -f1 | head -20; say '```'; }
  has justfile && { say "just recipes:"; say '```'; grep -E '^[a-zA-Z0-9_-]+:' "$P/justfile" | cut -d: -f1 | head -20; say '```'; }
  has pyproject.toml && { say "pyproject tool sections:"; say '```'; grep -E '^\[tool\.' "$P/pyproject.toml" | head -12; say '```'; }
fi
say ""

say "## Enforced gates (hooks + CI) — TRUST THIS OVER CONVENTION"
say ""
say "Whatever runs here is what the project actually requires. Derive the 5 validation"
say "gates from this section first; fall back to scripts only for what is missing."
say ""
found_gate=0
for h in lefthook.yml lefthook.yaml .pre-commit-config.yaml .husky .simplecov; do
  if has "$h"; then
    found_gate=1
    say "### \`$h\`"
    say '```'
    if [ -d "$P/$h" ]; then ls "$P/$h" | head -10; else head -40 "$P/$h"; fi
    say '```'
  fi
done
if [ -d "$P/.github/workflows" ]; then
  found_gate=1
  say "### CI workflows"
  for w in "$P"/.github/workflows/*.y*ml; do
    [ -f "$w" ] || continue
    say "- \`.github/workflows/$(basename "$w")\` runs:"
    awk '
      # inline form:  run: bundle exec rspec
      /^[[:space:]]*run:[[:space:]]*[^|>[:space:]]/ {
        sub(/^[[:space:]]*run:[[:space:]]*/,""); print "    - " $0; next
      }
      # block form:   run: |
      /^[[:space:]]*run:[[:space:]]*[|>]/ { inblock=1; indent=-1; next }
      inblock {
        if ($0 ~ /^[[:space:]]*$/) next
        match($0, /^[[:space:]]*/); cur=RLENGTH
        if (indent < 0) indent=cur
        if (cur < indent) { inblock=0; next }
        line=$0; sub(/^[[:space:]]*/,"",line)
        print "    - " line
      }
    ' "$w" 2>/dev/null | head -14
  done
fi
[ "$found_gate" -eq 0 ] && say "(no hook or CI config found — gates will have to come from scripts)"
say ""

say "## Lint / typecheck config"
if has pyproject.toml; then
  grep -oE '^\[tool\.(ruff|mypy|black|isort|pytest[^]]*|pyright)' "$P/pyproject.toml" 2>/dev/null \
    | sed 's/^\[tool\./- pyproject: /' | sort -u
fi
for c in tsconfig.json eslint.config.js eslint.config.mjs .eslintrc .eslintrc.json .eslintrc.js \
         biome.json .prettierrc ruff.toml .flake8 mypy.ini setup.cfg .golangci.yml \
         .rubocop.yml .rubocop_todo.yml .standard.yml rubocop sorbet .rbs_collection.yaml sig; do
  while IFS= read -r hit; do
    [ -n "$hit" ] && say "- \`${hit#"$P/"}\`"
  done < <(find "$P" -maxdepth 3 -name "$c" \
             -not -path '*/node_modules/*' -not -path '*/.git/*' \
             -not -path '*/dist/*' -not -path '*/vendor/*' 2>/dev/null | sort)
done
# Does a type-check gate even exist in this language?
type_gate="none"
[ -n "$(find "$P" -maxdepth 3 -name tsconfig.json -not -path '*/node_modules/*' 2>/dev/null | head -1)" ] \
  && type_gate="tsc"
[ -n "$(direct_dep 'typescript')" ] && type_gate="tsc"
[ -n "$(direct_dep 'mypy')" ] && type_gate="mypy"
[ -n "$(direct_dep 'pyright')" ] && type_gate="pyright"
# Sorbet counts only with a checked-in sorbet/ config; the runtime gem is a
# common transitive dependency and does NOT mean the project type-checks.
if [ -d "$P/sorbet" ] && [ -n "$(direct_dep 'sorbet')" ]; then type_gate="sorbet (srb tc)"; fi
if [ -d "$P/sig" ] && [ -n "$(direct_dep 'steep')" ]; then type_gate="RBS (steep)"; fi
say ""
if [ "$type_gate" = "none" ]; then
  say "- **No static type checker.** Gate 1 (\"TypeScript compilation\") has NO equivalent here."
  say "  Do not invent one. Either drop Gate 1 and run four gates, or replace it with a"
  say "  real load-time check for this stack (e.g. \`bin/rails zeitwerk:check\`, \`ruby -c\`)."
else
  say "- Type-check gate: $type_gate"
fi
say ""

say "## Layout (depth 2, source dirs)"
say '```'
find "$P" -maxdepth 2 -type d \
  -not -path '*/node_modules*' -not -path '*/.git*' -not -path '*/dist*' \
  -not -path '*/build*' -not -path '*/.next*' -not -path '*/__pycache__*' \
  -not -path '*/venv*' -not -path '*/.venv*' 2>/dev/null | sed "s|^$P|.|" | sort | head -40
say '```'
say ""

say "## Ports referenced in config"
grep -rhoE '(localhost|127\.0\.0\.1):[0-9]{2,5}' \
  --include='*.json' --include='*.ts' --include='*.js' --include='*.yml' --include='*.yaml' \
  --include='*.env*' --include='*.py' \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist "$P" 2>/dev/null \
  | sort | uniq -c | sort -rn | head -10
grep -hoE "^[[:space:]]*-[[:space:]]*['\"]?[^'\"]*[0-9}]:[0-9]{2,5}['\"]?[[:space:]]*$" \
  "$P"/docker-compose.y*ml "$P"/compose.y*ml 2>/dev/null \
  | sed "s/^[[:space:]]*-[[:space:]]*//; s/['\"]//g; s|^|compose port mapping: |" | head -6
say ""

say "## Git"
if [ -d "$P/.git" ]; then
  say "- Default branch: $(git -C "$P" symbolic-ref --short HEAD 2>/dev/null || echo unknown)"
  say "- Recent commit subjects (commit-message style):"
  git -C "$P" log --oneline -8 2>/dev/null | sed 's/^/    /'
else
  say "- not a git repository"
fi
say ""

say "## Existing agent instructions"
for c in CLAUDE.md AGENTS.md .cursorrules CONTRIBUTING.md README.md docs/adr docs/ai CONTEXT.md; do
  has "$c" && say "- \`$c\` exists — read it; it may already state conventions the knowledge base should match"
done
if [ -d "$P/.claude" ]; then
  say ""
  say "**\`.claude/\` already exists in this project.** The installer will not overwrite"
  say "anything already there. Existing contents:"
  find "$P/.claude" -maxdepth 2 -type f 2>/dev/null | sed "s|^$P/|    - |" | head -20
fi

exit 0
