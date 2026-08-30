#!/usr/bin/env bash
# Health-check an orchestration install. Read-only by default.
#
# Every defect class checked here was found by a HUMAN using the tool, not by tooling.
# That is the point of this script.
#
# Usage: verify-install.sh [PROJECT_DIR] [--run-gates] [--quiet]
# Exit:  0 = no errors (warnings allowed), 1 = errors found, 2 = usage/setup problem
#
# NB: `set -e` is deliberately NOT used. Half the checks are greps that legitimately
# return non-zero when they find nothing, and `[ cond ] && action` aborts the script
# under -e when cond is false. Exit status is managed explicitly instead.
set -uo pipefail

P="${1:-$PWD}"; [ "${P:0:2}" = "--" ] && P="$PWD"
RUN_GATES=0; QUIET=0
for a in "$@"; do
  case "$a" in
    --run-gates) RUN_GATES=1 ;;
    --quiet)     QUIET=1 ;;
    -h|--help)   sed -n '2,12p' "$0"; exit 0 ;;
  esac
done
[ -d "$P" ] || { echo "error: not a directory: $P" >&2; exit 2; }
P="$(cd "$P" && pwd)"
C="$P/.claude"
[ -d "$C/orchestration" ] || { echo "error: no .claude/orchestration in $P" >&2; exit 2; }

ERRORS=0; WARNS=0
err()  { printf '  ERROR  %s\n' "$1"; ERRORS=$((ERRORS+1)); }
warn() { printf '  warn   %s\n' "$1"; WARNS=$((WARNS+1)); }
ok()   { [ "$QUIET" -eq 1 ] || printf '  ok     %s\n' "$1"; }
head2(){ printf '\n%s\n' "$1"; }

# Files that are SUPPOSED to contain {{markers}} until filled per use.
TEMPLATE_RE='templates/agent-prompts/|ADAPTATION-TODO.md'
md() { find "$C/orchestration" "$C/commands" -name '*.md' 2>/dev/null | sort; }

echo "Verifying orchestration install: $P"

# ---------------------------------------------------------------- 1. the profile
head2 "1. Authoritative profile"
PROFILE="$C/orchestration/meta/project-profile.md"
if [ ! -f "$PROFILE" ]; then
  err "meta/project-profile.md is MISSING. Everything else defers to it; phase 2 never ran."
else
  ok "meta/project-profile.md present"
  n=$({ grep -cE '\{\{[^}]*\}\}' "$PROFILE" || true; })
  if [ "$n" != "0" ]; then
    err "project-profile.md still has $n unfilled {{marker}}(s) — it is declared authoritative, so these read as facts"
  else
    ok "project-profile.md fully filled"
  fi
  # Is it actually loaded? A profile nothing reads is inert.
  if grep -q 'meta/project-profile.md' "$C/commands/orchestration.md" 2>/dev/null; then
    ok "commands/orchestration.md references the profile"
  else
    err "commands/orchestration.md does NOT reference meta/project-profile.md — its read list is fixed, so the profile is never loaded and all phase-2 work is inert"
  fi
fi

# ------------------------------------------------------- 2. unfilled markers
head2 "2. Unfilled markers outside templates"
found=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  rel="${f#"$C/"}"
  case "$rel" in *project-profile.md|*project-mission.md) continue ;; esac
  if printf '%s' "$rel" | grep -qE "$TEMPLATE_RE"; then continue; fi
  n=$({ grep -oE '\{\{[^}]*\}\}|\$DB_NAME|\$TEST_DB_NAME' "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [ "$n" != "0" ]; then
    err "$rel: $n marker(s) — reads as already filled in"
    found=1
  fi
done < <(md)
[ "$found" -eq 0 ] && ok "no stray markers"

# ------------------------------------------------- 3. dead @.claude references
head2 "3. Cross-references resolve"
dead=0
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  case "$ref" in *'<'*|*'*'*|*'{{'*) continue ;; esac
  target="$P/$ref"
  if [ ! -e "$target" ]; then
    # session-handoffs and generated files are created at runtime
    case "$ref" in *session-handoffs/*|*methodology-discoveries.md) continue ;; esac
    err "dead reference: $ref"
    dead=1
  fi
done < <({ grep -rhoE '\.claude/orchestration/[A-Za-z0-9._/-]+\.md' "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } | sort -u)
[ "$dead" -eq 0 ] && ok "every .claude/orchestration/*.md reference resolves"

# ------------------------------------- 4. named-but-missing prompt templates
head2 "4. Named agent-prompt templates exist"
# A named *-agent.md / *-patterns.md must exist SOMEWHERE under orchestration/ --
# patterns files live in playbook/, not templates/agent-prompts/. ADAPTATION-TODO.md is
# excluded: it legitimately narrates renames ("replaces nestjs-patterns.md").
missing=0
NAMED="$(mktemp -t namedtpl-XXXXXX)"
for f in $(md); do
  if printf '%s' "$f" | grep -q 'ADAPTATION-TODO.md'; then continue; fi
  { grep -ohE '[a-z0-9]+(-[a-z0-9]+)*-(agent|patterns)\.md' "$f" 2>/dev/null || true; } \
    | sort -u | sed "s|^|${f#"$C/"}\t|" >> "$NAMED"
done
while IFS="$(printf '\t')" read -r src t; do
  if [ -z "${t:-}" ]; then continue; fi
  if ! find "$C/orchestration" -name "$t" -print -quit 2>/dev/null | grep -q .; then
    err "$src names '$t', which does not exist anywhere under orchestration/"
    missing=1
  fi
done < "$NAMED"
rm -f "$NAMED"
if [ "$missing" -eq 0 ]; then
  ok "every named template/patterns file resolves"
  ok "agent-prompts shipped: $(ls "$C/orchestration/templates/agent-prompts/" 2>/dev/null | tr '\n' ' ')"
fi

# --------------------------------------------- 5. convention contradictions
head2 "5. Conventions agree with the profile"
if [ -f "$PROFILE" ] && grep -qi 'snake_case' "$PROFILE"; then
  hits=$({ grep -rlE 'camelCase' "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } \
         | grep -vE 'project-profile|rails-patterns|agent-specs-library|ADAPTATION-TODO')
  if [ -n "$hits" ]; then
    err "profile mandates snake_case, but these still mandate camelCase:"
    printf '%s\n' "$hits" | sed "s|$C/|           |"
    err "(an agent reading the playbook instead of the profile will name fields wrong)"
  else
    ok "no camelCase mandates contradicting the profile"
  fi
else
  ok "profile does not assert snake_case; skipping"
fi

# --------------------------------- 5b. gate COUNT agrees with the profile
head2 "5b. Gate count agrees with the profile"
if [ -f "$PROFILE" ]; then
  # How many gates does the profile actually define? Count numbered gate-table rows.
  # Count only RUNNABLE gates: a row explicitly marked N/A documents why a gate is
  # absent (e.g. Ruby has no type checker) and deliberately stays in the table.
  pg=$({ grep -E '^\| *[0-9]+\. ' "$PROFILE" || true; } | { grep -vciE 'N/A|not applicable' || true; })
  if [ "$pg" = "0" ]; then
    warn "could not find a numbered gate table in the profile"
  else
    ok "profile defines $pg gates"
    # Any other file asserting a DIFFERENT count contradicts it. This is how a
    # dropped gate (e.g. no type checker in Ruby) silently comes back.
    bad=$({ grep -rlE "[0-9]+ (validation )?gates" "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } \
          | grep -v 'ADAPTATION-TODO' \
          | xargs grep -lE "(^|[^0-9])(([0-9])|([0-9]+)) (validation )?gates" 2>/dev/null \
          | xargs grep -loE "[0-9]+ (validation )?gates" 2>/dev/null | sort -u)
    mismatch=0
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      while IFS= read -r cnt; do
        [ -n "$cnt" ] || continue
        if [ "$cnt" != "$pg" ]; then
          err "${f#"$C/"} says \"$cnt gates\" but the profile defines $pg"
          mismatch=1
        fi
      done < <({ grep -ohE "[0-9]+ (validation )?gates" "$f" 2>/dev/null || true; } | grep -oE '^[0-9]+' | sort -u)
    done < <(printf '%s\n' "$bad")
    [ "$mismatch" -eq 0 ] && ok "no file contradicts the gate count"
  fi
fi

# ------------------------------------------------- 6. foreign-stack residue
head2 "6. Foreign-stack residue"
STACK="unknown"
[ -f "$P/Gemfile" ] && STACK="ruby"
[ -f "$P/package.json" ] && STACK="node"
{ [ -f "$P/pyproject.toml" ] || [ -f "$P/requirements.txt" ]; } && STACK="python"
[ -f "$P/go.mod" ] && STACK="go"
case "$STACK" in
  ruby)   FOREIGN='nestjs|angular|sequelize|npm run|tsconfig|package\.json|typescript|jest|vitest' ;;
  python) FOREIGN='nestjs|angular|sequelize|npm run|tsconfig|typescript|bundle exec|Gemfile' ;;
  go)     FOREIGN='nestjs|angular|sequelize|npm run|typescript|bundle exec|Gemfile' ;;
  node)   FOREIGN='bundle exec|Gemfile|rubocop|rspec|bin/rails' ;;
  *)      FOREIGN='' ;;
esac
if [ -n "$FOREIGN" ]; then
  echo "  (detected stack: $STACK)"
  total=0
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    f="${line%%:*}"; n="${line##*:}"
    rel="${f#"$C/"}"
    case "$rel" in *ADAPTATION-TODO.md) continue ;; esac
    printf '  warn   %-58s %s hit(s)\n' "$rel" "$n"
    WARNS=$((WARNS+1)); total=$((total+n))
  done < <({ grep -rciE "$FOREIGN" "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } | grep -v ':0$' | sort -t: -k2 -rn)
  [ "$total" -eq 0 ] && ok "no foreign-stack references"
  [ "$total" -gt 0 ] && echo "         $total total. Commands may already be right; the surrounding EXAMPLES are not."
fi

# ---------------------------- 7. infrastructure referenced but not present
head2 "7. Referenced infrastructure exists in this project"
check_infra() {
  local pat="$1" file_glob="$2" label="$3"
  local n; n=$({ grep -rlE "$pat" "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } \
               | grep -vE 'ADAPTATION-TODO' | wc -l | tr -d ' ')
  if [ "$n" != "0" ]; then
    # shellcheck disable=SC2086
    if ! ls $file_glob >/dev/null 2>&1; then
      warn "$n file(s) reference $label, but this project has none — those examples cannot be followed"
    else
      ok "$label referenced and present"
    fi
  fi
}
cd "$P" || exit 2
check_infra 'docker-compose|docker compose' "$P/docker-compose.y*ml $P/compose.y*ml" "docker compose"
check_infra '\.env\.example'                "$P/.env.example"                        ".env.example"
check_infra 'Dockerfile'                    "$P/Dockerfile"                          "Dockerfile"

# --------------------------------------------------------- 8. gate commands
head2 "8. Gate commands"
if [ ! -f "$PROFILE" ]; then
  warn "no profile; cannot check gates"
else
  # Pull backticked commands out of the gate table rows.
  # Only the COMMAND column (field 3), not the "passing looks like" column -- that one
  # mentions things like `main` which are not commands.
  gates=$({ grep -E '^\| *[0-9]+\. ' "$PROFILE" 2>/dev/null || true; } \
          | awk -F'|' '{print $3}' \
          | grep -oE '`[^`]+`' | tr -d '`' | sort -u)
  if [ -z "$gates" ]; then
    warn "no gate commands found in the profile's gate table — is it filled in?"
  fi
  while IFS= read -r g; do
    [ -n "$g" ] || continue
    case "$g" in
      *N/A*|*n/a*|*'{{'*|*'—'*) continue ;;
    esac
    bin=$(printf '%s' "$g" | awk '{print $1}')
    case "$bin" in
      bin/*|./bin/*|script/*)
        if [ -x "$P/${bin#./}" ]; then ok "gate wrapper exists: $bin"
        else err "gate names '$bin', which is not an executable file in this project"; fi ;;
      lsof|ls|ps|grep|cd|curl) ok "gate uses shell builtin/tool: $bin" ;;
      *) if command -v "$bin" >/dev/null 2>&1; then ok "gate command on PATH: $bin"
         else warn "gate command '$bin' not found on PATH (may need bundle exec / a running service)"; fi ;;
    esac
  done < <(printf '%s\n' "$gates")

  if [ "$RUN_GATES" -eq 1 ]; then
    head2 "8b. Executing gate commands (--run-gates)"
    echo "  A gate already red on a clean checkout must NOT be used as a gate."
    echo "  Stateful commands are NEVER executed here (see below) -- verifying must not"
    echo "  mutate the project's databases or working tree."
    for g in $gates; do :; done  # (noop; keeps shellcheck quiet about the loop below)
    while IFS= read -r g; do
      [ -n "$g" ] || continue
      case "$g" in *N/A*|*n/a*|*'{{'*|*'—'*) continue ;; esac
      case "$g" in bin/*|./bin/*|script/*) ;; *) continue ;; esac
      # Refuse anything that changes state. db:test:prepare purges and reloads a
      # database; running it to "verify" can destroy local work.
      if printf '%s' "$g" | grep -qiE 'db:|migrat|purge|reset|drop|seed|prepare|--fix|-a( |$)|--autocorrect|install'; then
        echo "  skipped (stateful): $g"
        continue
      fi
      printf '  running: %s ... ' "$g"
      out="$(mktemp -t vgate-XXXXXX)"
      if timeout 600 sh -c "cd '$P' && $g" >"$out" 2>&1; then
        echo "PASS"
      else
        rc=$?
        # Distinguish "the gate is red" from "this shell cannot run it". A verifier
        # that reports false failures is worse than no verifier.
        if grep -qiE 'ConnectionNotEstablished|could not connect|connection refused|local user with ID|does not exist.*user|command not found|Permission denied|Address already in use|PG::ConnectionBad' "$out"; then
          warn "cannot verify '$g' in this environment (database/service unreachable, not a gate failure)"
          grep -ioE 'ConnectionNotEstablished|could not connect|connection refused|local user with ID [0-9]+ does not exist|command not found|Permission denied' "$out" | head -1 | sed 's/^/           /'
        else
          err "gate '$g' FAILS on this checkout (exit $rc). A red gate teaches agents to ignore gates."
          tail -3 "$out" | sed 's/^/           /'
        fi
      fi
      rm -f "$out"
    done < <(printf '%s\n' "$gates")
  else
    echo "  (pass --run-gates to execute the non-stateful ones; existence != passing)"
  fi
fi

# ------------------------------------------------------------------ summary
head2 "Summary"
echo "  errors:   $ERRORS"
echo "  warnings: $WARNS"
if [ "$ERRORS" -gt 0 ]; then
  echo
  echo "  ERRORS are things that will actively mislead an agent: unfilled markers that read"
  echo "  as facts, dead references, a profile nothing loads, or conventions that contradict"
  echo "  it. Fix these before treating the install as done."
  exit 1
fi
[ "$WARNS" -gt 0 ] && echo "  No errors. Warnings are stale examples — worth fixing, not blocking."
exit 0
