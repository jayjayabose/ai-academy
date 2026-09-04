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
# An agent-prompt template is filled per USE, not per install, wherever it lives -- packs
# ship them next to their examples rather than under templates/agent-prompts/.
TEMPLATE_RE='templates/agent-prompts/|-agent\.md$|ADAPTATION-TODO.md'
md() { find "$C/orchestration" "$C/commands" -name '*.md' 2>/dev/null | sort; }

# The method tree moved under orchestration/core/ when the knowledge base was split into
# a portable core and per-stack example packs. Resolve it rather than hardcoding either
# layout: the checks below that name playbook/ or templates/agent-prompts/ silently
# inspect NOTHING against the wrong root, and a check that quietly passes is worse than
# one that is absent -- it reports "ok" about a directory it never looked in.
KB="$C/orchestration"
[ -d "$C/orchestration/core" ] && KB="$C/orchestration/core"
PACKS=""
[ -d "$C/orchestration/examples" ] && PACKS="$({ ls "$C/orchestration/examples" 2>/dev/null || true; } | grep -v '\.md$' | tr '\n' ' ')"

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
  # `{{ x }}` with padding inside the braces is not one of ours. Every placeholder this
  # toolchain writes is unpadded (`{{PROJECT_NAME}}`); padded braces and `${{ ... }}` are
  # Angular interpolation and GitHub Actions expressions sitting inside worked examples,
  # i.e. correct source. Measured over the whole knowledge base: 2 padded occurrences,
  # both foreign syntax, 0 unpadded false positives. Before this exclusion the examples
  # pack failed the check permanently, and a check with no correct fix trains people to
  # ignore the verifier.
  n=$({ grep -oE '\$?\{\{[^}]*\}\}|\$DB_NAME|\$TEST_DB_NAME' "$f" 2>/dev/null || true; } \
      | { grep -vE '^\$\{\{|^\{\{ | \}\}$' || true; } | wc -l | tr -d ' ')
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

# ------------------------- 3b. absolute paths into the source repo
head2 "3b. Root-absolute paths resolve in this project"
# Principle 7 in reverse: the source repo plants links to ITS OWN tree. `/course/guidebook/
# chapters/05-sub-agents.md` is a real file in ai-academy and nothing anywhere else, so an
# agent told to read it finds nothing and, worse, learns the project has a curriculum.
# §3 only follows .claude/orchestration/*.md refs and never saw these.
dead2=0
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  case "$ref" in *'<'*|*'*'*|*'{{'*) continue ;; esac
  [ -e "$P$ref" ] && continue
  err "points outside this project: $ref"
  dead2=1
done < <({ grep -rhoE '(^|[[:space:]]|\()/[a-zA-Z0-9._-]+/[A-Za-z0-9._/-]+\.[a-z]+' \
            "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } \
          | sed 's/^[^/]*//' | sort -u)
[ "$dead2" -eq 0 ] && ok "every root-absolute path resolves here"

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
  ok "agent-prompts shipped: $(ls "$KB/templates/agent-prompts/" 2>/dev/null | tr '\n' ' ')"
fi

# --------------------------------------------- 5. convention contradictions
head2 "5. Conventions agree with the profile"
if [ -f "$PROFILE" ] && grep -qi 'snake_case' "$PROFILE"; then
  # A bare `grep -l camelCase` cannot tell a MANDATE from a PROHIBITION. The CORRECT
  # fix reads "NO camelCase: never leadId", which a presence test then flags forever --
  # and a check that stays red after the right fix teaches people to ignore it, the
  # exact failure §8 warns about. So match per LINE, and require mandate-shaped
  # wording with no negation near it.
  MANDATE='([Uu]se|MUST|[Mm]andatory|ALL FIELDS|convention).*camelCase|camelCase (consistently|throughout|only|everywhere)'
  NEGATED='([Nn][Oo]|NOT|[Nn]ever|[Aa]void|[Ii]nstead of|[Rr]ather than|[Dd]o not|[Dd]on.t)[^.]{0,40}camelCase|camelCase[^.]{0,30}(forbidden|prohibited|is wrong|mismatch)'
  # `leadId (NOT lead_id)` mandates camelCase without containing the word at all --
  # wording checks are blind to it, so match the identifier shape too.
  IDENT='[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]* \(NOT [a-z][a-z0-9]*_[a-z]'
  TMP5="$(mktemp -t conv5-XXXXXX)"
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    rel="${f#"$C/"}"
    case "$rel" in
      *project-profile*|*rails-patterns*|*agent-specs-library*|*ADAPTATION-TODO*) continue ;;
    esac
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      text="${hit#*:}"
      printf '%s' "$text" | grep -qE "$NEGATED" && continue
      printf '%s:%s\n' "$rel" "$hit" >> "$TMP5"
    done < <({ grep -nE "$MANDATE" "$f" 2>/dev/null || true; })
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      printf '%s:%s  <- camelCase identifier mandated over snake_case\n' "$rel" "${hit%%:*}" >> "$TMP5"
    done < <({ grep -nE "$IDENT" "$f" 2>/dev/null || true; })
  done < <(md)
  # A convention MANDATED on one line and FORBIDDEN two lines later cancels out, and
  # neither line names the other convention, so the checks above cannot see it. This is
  # what a blanket casing substitution produces when it rewrites a positive claim and
  # leaves its negation standing -- the original defect this section exists for.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    rel="${f#"$C/"}"
    case "$rel" in *ADAPTATION-TODO*) continue ;; esac
    awk -v F="$rel" '
      # shift the window BEFORE recording the current line, or n[2] is overwritten
      # with the current line number and every hit reports itself as its own cause.
      { for (i = 3; i > 1; i--) { w[i] = w[i-1]; n[i] = n[i-1] }
        w[1] = $0; n[1] = NR
        if ($0 ~ /[Nn][Oo] SNAKE_CASE|[Aa]void[^.]*snake_case/) {
          for (i = 2; i <= 3; i++)
            if (w[i] ~ /[Uu]se snake_case|snake_case consistently/) {
              print F ":" n[i] " mandates snake_case, then :" NR " forbids it"; break
            }
        }
        if ($0 ~ /[Nn][Oo] CAMELCASE|[Aa]void[^.]*camelCase/) {
          for (i = 2; i <= 3; i++)
            if (w[i] ~ /[Uu]se camelCase|camelCase consistently/) {
              print F ":" n[i] " mandates camelCase, then :" NR " forbids it"; break
            }
        }
      }' "$f" >> "$TMP5" 2>/dev/null
  done < <(md)
  if [ -s "$TMP5" ]; then
    err "profile mandates snake_case, but these LINES mandate camelCase:"
    cut -c1-150 "$TMP5" | sed 's|^|           |'
    err "(an agent reading the playbook instead of the profile will name fields wrong)"
  else
    ok "no camelCase mandates contradicting the profile (prohibitions are fine)"
  fi
  rm -f "$TMP5"
else
  ok "profile does not assert snake_case; skipping"
fi

# --------------------------------- 5b. gate COUNT agrees with the profile
head2 "5b. Gate count agrees with the profile"
if [ -f "$PROFILE" ]; then
  # How many gates does the profile actually define? Count numbered gate-table rows,
  # INCLUDING rows marked N/A. This used to exclude them, on the theory that a gate with
  # no command is not a gate. That was right when each stack shipped its own rewritten
  # validation-gates.md; it is wrong against a portable core, which fixes the gate LIST
  # at five for every project and tells you to record the absence of a command rather
  # than drop the gate. Excluding N/A rows made a correctly-filled Rails profile report
  # 4 and put 9 core files in error for saying 5 -- flagging the correct state.
  # What that exclusion was really protecting against -- a dropped gate coming back by
  # name so an agent runs a tool this project lacks -- is §10's job, and §10 keys off the
  # same N/A marker.
  pg=$({ grep -cE '^\| *[0-9]+\. ' "$PROFILE" || true; })
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
    # An examples pack is one stack's worked instances. It names that stack in every
    # other line, on purpose. Flagging it produces ~400 warnings that have no correct
    # fix. What IS worth flagging is a pack for the wrong stack, checked once below.
    case "$rel" in orchestration/examples/*) continue ;; esac
    printf '  warn   %-58s %s hit(s)\n' "$rel" "$n"
    WARNS=$((WARNS+1)); total=$((total+n))
  done < <({ grep -rciE "$FOREIGN" "$C/orchestration" "$C/commands" --include='*.md' 2>/dev/null || true; } | grep -v ':0$' | sort -t: -k2 -rn)
  [ "$total" -eq 0 ] && ok "no foreign-stack references outside examples/"
  [ "$total" -gt 0 ] && echo "         $total total. Commands may already be right; the surrounding EXAMPLES are not."
  # Installed packs vs the stack this project actually is.
  if [ -n "$PACKS" ]; then
    for pk in $PACKS; do
      # Packs are named for the framework (`rails`), $STACK for the language (`ruby`).
      pk_stack="$pk"
      case "$pk" in rails) pk_stack=ruby ;; django|flask) pk_stack=python ;; esac
      if [ "$pk_stack" = "$STACK" ]; then ok "examples pack '$pk' matches the detected stack"
      else warn "examples pack '$pk' is installed but this project is $STACK — 20-odd files of another stack's commands, which agents read as instructions. Remove it unless you put it there deliberately."; fi
    done
  else
    ok "no examples pack installed (core/ is complete without one)"
  fi
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

# ------------------------------- 9. placeholder prose in command position
head2 "9. Placeholder prose in command position"
# A substitution that swaps a command for an explanation leaves prose where a command
# belongs: `cd spec/dummy && [no such gate in this project]`. The sentence is honest;
# an agent copying the block still runs a bracket. Honest prose in a command's clothing
# is worse than a wrong command, because nothing errors loudly.
TMP9="$(mktemp -t ph9-XXXXXX)"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  # Fence LANGUAGE decides. `[paste rubocop output]` inside a ```markdown fence is a
  # session-log placeholder and correct; the same line inside ```bash is a fake command.
  awk -v F="${f#"$C/"}" '
    /^[[:space:]]*```/ {
      if (fence) { fence = 0; lang = "" }
      else { fence = 1; lang = tolower(substr($0, index($0, "```") + 3)); gsub(/[^a-z]/, "", lang) }
      next
    }
    # Prose instructions to the reader are not commands, whatever fence they sit in.
    $0 ~ /\[[[:space:]]*([Pp]aste|[Ff]ill|[Yy]our|[Dd]escribe|[Pp]rovide|[Oo]nly if|[Ss]tandard|[Tt]argeted|[Ww]hat you|[Ll]ist)/ { next }
    {
      shell = (lang == "bash" || lang == "sh" || lang == "shell" || lang == "zsh" || lang == "console")
      if (fence && shell && $0 ~ /^[[:space:]]*\[[^]]+\][[:space:]]*(#.*)?$/) { print F ":" NR ": " $0; next }
      if ($0 ~ /&&[[:space:]]*`?\[[^]]+\]/)                                   { print F ":" NR ": " $0; next }
      if (fence && shell && $0 ~ /^[[:space:]]*\$[[:space:]]+\[[^]]+\]/)     { print F ":" NR ": " $0 }
    }' "$f" >> "$TMP9" 2>/dev/null
done < <(md)
if [ -s "$TMP9" ]; then
  err "$({ wc -l < "$TMP9"; } | tr -d ' ') line(s) put bracketed prose where a command belongs:"
  cut -c1-150 "$TMP9" | sed 's|^|           |'
  echo "         Say the gate is absent in PROSE, outside the code fence — never on the command line."
else
  ok "no placeholder prose in command position"
fi
rm -f "$TMP9"

# --------------------------------------- 10. gate NAMES match the stack
head2 "10. Gate names match the stack"
# §5b checks how MANY gates there are. It does not check what they are CALLED, so a
# gate the profile correctly dropped (Ruby has no type checker) survives by name
# elsewhere and an agent tries to run it.
if [ -f "$PROFILE" ] && grep -qiE 'no (type|load)[^.]{0,20}gate|GATE 1 DOES NOT EXIST|N/A' "$PROFILE"; then
  ABSENT_TOOLS=''
  [ -f "$P/tsconfig.json" ] || ABSENT_TOOLS='TypeScript|tsc'
  [ -d "$P/sorbet" ]        || ABSENT_TOOLS="${ABSENT_TOOLS:+$ABSENT_TOOLS|}sorbet|srb tc"
  [ -d "$P/sig" ]           || ABSENT_TOOLS="${ABSENT_TOOLS:+$ABSENT_TOOLS|}steep"
  grep -qi 'mypy' "$P/setup.cfg" "$P/pyproject.toml" 2>/dev/null || ABSENT_TOOLS="${ABSENT_TOOLS:+$ABSENT_TOOLS|}mypy"
  TMP10="$(mktemp -t gn10-XXXXXX)"
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    rel="${f#"$C/"}"
    # validation-gates.md may legitimately explain what the gate WAS upstream.
    case "$rel" in *ADAPTATION-TODO*|*validation-gates*.md) continue ;; esac
    # Same trap as §5: prose stating the gate is ABSENT names the tool in order to
    # rule it out. Flagging that punishes the correct fix.
    # Word-anchored: an unanchored 'no' also matches --noEmit and swallows real hits.
    NEG10='(^|[^A-Za-z])([Nn]o|NOT|[Nn]ot|[Nn]ever|[Aa]bsent|N/A|[Dd]ropped|[Uu]pstream|cannot)([^A-Za-z]|$)|not applicable|does not exist|has no|no equivalent'
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      printf '%s' "${hit#*:}" | grep -qE "$NEG10" && continue
      printf '%s:%s\n' "$rel" "$hit" >> "$TMP10"
    done < <({ grep -nEi "(gate[s]?[ :][^.]{0,50}($ABSENT_TOOLS))|(($ABSENT_TOOLS)[^.]{0,40}(gate|mandatory|required))|^[[:space:]]*(bundle exec )?($ABSENT_TOOLS)" \
        "$f" 2>/dev/null || true; })
  done < <(md)
  if [ -s "$TMP10" ]; then
    err "$({ wc -l < "$TMP10"; } | tr -d ' ') line(s) name a gate this project cannot run:"
    cut -c1-150 "$TMP10" | sed 's|^|           |'
    echo "         The profile dropped it; these did not. An agent will report a gate it never ran."
  else
    ok "no file names an absent gate"
  fi
  rm -f "$TMP10"
else
  ok "profile runs every gate it defines; nothing to cross-check"
fi

# ------------------------------------ 11. claimed counts match reality
head2 "11. Claimed counts match reality"
ACTUAL_TPL=$({ ls "$KB/templates/agent-prompts/" 2>/dev/null || true; } | { grep -c '\.md$' || true; })
TMP11="$(mktemp -t cnt11-XXXXXX)"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  rel="${f#"$C/"}"
  case "$rel" in *ADAPTATION-TODO*) continue ;; esac
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    n=$(printf '%s' "${hit#*:}" | grep -oE '^[0-9]+')
    [ -n "${n:-}" ] || continue
    [ "$n" = "$ACTUAL_TPL" ] && continue
    printf '%s:%s claims "%s templates" but %s exist on disk\n' "$rel" "${hit%%:*}" "$n" "$ACTUAL_TPL" >> "$TMP11"
  done < <({ grep -noE '[0-9]+ (prompt )?templates' "$f" 2>/dev/null || true; })
done < <(md)
if [ -s "$TMP11" ]; then
  err "template count contradicted ($ACTUAL_TPL on disk):"
  sed 's|^|           |' "$TMP11"
  echo "         An agent told there are more templates goes looking for files that were never copied."
else
  ok "no file contradicts the $ACTUAL_TPL shipped agent-prompt template(s)"
fi
rm -f "$TMP11"

# --------------- 11b. coverage threshold agrees with the profile / CI
head2 "11b. Coverage threshold agrees with the profile"
# Same shape as 5b: a number stated in the KB that contradicts the authoritative one.
# An agent told "80% is the bar" stops there and CI fails it at 95%.
PROF_COV=$({ grep -ohE '(minimum_suite_coverage|coverage)[^0-9]{0,20}([0-9]{2,3})%?' "$PROFILE" 2>/dev/null || true; } \
           | { grep -ohE '[0-9]{2,3}' || true; } | sort -rn | head -1)
if [ -n "${PROF_COV:-}" ]; then
  ok "profile states a $PROF_COV% coverage floor"
  TMP11B="$(mktemp -t cov11-XXXXXX)"
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    rel="${f#"$C/"}"
    case "$rel" in *project-profile*|*ADAPTATION-TODO*) continue ;; esac
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      text="${hit#*:}"
      # A line contrasting the two ("95%, not 80%") is a correction, not a claim.
      printf '%s' "$text" | grep -qE "$PROF_COV" && continue
      n=$(printf '%s' "$text" | grep -oE '[0-9]{2,3}%' | head -1 | tr -d '%')
      [ -n "${n:-}" ] || continue
      [ "$n" = "$PROF_COV" ] && continue
      printf '%s:%s  says %s%%\n' "$rel" "${hit%%:*}" "$n" >> "$TMP11B"
    done < <({ grep -nEi 'coverage[^0-9]{0,24}[0-9]{2,3}%|[0-9]{2,3}%[^.]{0,16}coverage' "$f" 2>/dev/null || true; })
  done < <(md)
  if [ -s "$TMP11B" ]; then
    err "$({ wc -l < "$TMP11B"; } | tr -d ' ') line(s) state a coverage floor other than $PROF_COV%:"
    cut -c1-150 "$TMP11B" | sed 's|^|           |'
    echo "         An agent that stops at the lower number ships work CI will reject."
  else
    ok "no file contradicts the $PROF_COV% floor"
  fi
  rm -f "$TMP11B"
else
  ok "profile states no coverage floor; skipping"
fi

# -------------------------- 12. paths the profile asserts actually exist
head2 "12. Paths asserted by the profile exist"
# The profile is declared authoritative. A wrong path in it (e.g. factories in
# spec/dummy/factories when they live in spec/dummy/spec/factories) sends every agent
# to a directory that is not there, and it reads as verified fact.
if [ -f "$PROFILE" ]; then
  TMP12="$(mktemp -t path12-XXXXXX)"
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    ln="${line%%:*}"; text="${line#*:}"
    # Skip lines that are ABOUT something not existing -- the profile deliberately
    # documents wrong paths in order to warn about them.
    printf '%s' "$text" | grep -qiE 'does not exist|not exist|NOT `|absent|missing|wrong|stale|aspirational|never|no longer|~~|instead of|rather than|used to|was |had ' && continue
    while IFS= read -r cand; do
      [ -n "$cand" ] || continue
      case "$cand" in *'*'*|*'<'*|*'{{'*|*'...'*|*' '*) continue ;; esac
      case "$cand" in */) cand="${cand%/}" ;; esac
      # Only check things actually shaped like a path IN THIS PROJECT: a known top-level
      # dir, or something with a file extension. `Metrics/MethodLength` is a cop name;
      # `business_rules` is a bare word. Neither is a claim about the filesystem.
      case "$cand" in
        app/*|spec/*|db/*|lib/*|bin/*|config/*|docs/*|test/*|src/*|.github/*|.claude/*) : ;;
        *.rb|*.md|*.yml|*.yaml|*.json|*.gemspec|*.lock|*.sh|*.ts|*.py) : ;;
        *) continue ;;
      esac
      [ -e "$P/$cand" ] && continue
      printf '%s: `%s`\n' "$ln" "$cand" >> "$TMP12"
    done < <(printf '%s' "$text" | { grep -oE '`[A-Za-z0-9_.][A-Za-z0-9_./-]*/[A-Za-z0-9_./-]*`' || true; } | tr -d '`')
  done < <({ grep -n '`' "$PROFILE" || true; })
  if [ -s "$TMP12" ]; then
    warn "$({ wc -l < "$TMP12"; } | tr -d ' ') path(s) asserted in the profile do not exist here:"
    sort -u "$TMP12" | sed 's|^|           meta/project-profile.md:|'
    echo "         Some may be illustrative. Any that is presented as this project's layout is a fabricated fact."
  else
    ok "every concrete path the profile names resolves"
  fi
  rm -f "$TMP12"
fi

# ------------- 13. playbook/ are summaries, not copies of methodology/
head2 "13. playbook/ files summarise rather than duplicate methodology/"
# commands/orchestration.md tells the agent playbook/ is "brief summaries + links to
# methodology" and methodology/ is the full spec. When they are near-copies the agent
# cannot tell which is authoritative, pays the context cost twice, and -- worst --
# every fix has to be applied in both or it silently survives in the other.
TMP13="$(mktemp -t dup13-XXXXXX)"
uniq_lines() { sort -u "$1" | grep -c '[A-Za-z]'; }
for a in "$KB/playbook"/*.md; do
  [ -f "$a" ] || continue
  la=$({ wc -l < "$a"; } | tr -d ' ')
  [ "$la" -ge 150 ] || continue
  for b in "$KB/methodology"/*.md; do
    [ -f "$b" ] || continue
    lb=$({ wc -l < "$b"; } | tr -d ' ')
    [ "$lb" -ge 150 ] || continue
    ua=$(uniq_lines "$a"); ub=$(uniq_lines "$b")
    small=$ua; [ "$ub" -lt "$ua" ] && small=$ub
    [ "${small:-0}" -gt 0 ] || continue
    common=$(comm -12 <(sort -u "$a" | grep '[A-Za-z]') <(sort -u "$b" | grep '[A-Za-z]') | wc -l | tr -d ' ')
    pct=$(( common * 100 / small ))
    [ "$pct" -ge 60 ] && printf '%s%% playbook/%s <-> methodology/%s\n' "$pct" "$(basename "$a")" "$(basename "$b")" >> "$TMP13"
  done
done
# templates/ vs methodology/ duplicates of the same basename are always accidental.
for a in "$KB/templates"/*.md; do
  [ -f "$a" ] || continue
  b="$KB/methodology/$(basename "$a")"
  [ -f "$b" ] || continue
  ua=$(uniq_lines "$a"); ub=$(uniq_lines "$b")
  small=$ua; [ "$ub" -lt "$ua" ] && small=$ub
  [ "${small:-0}" -gt 0 ] || continue
  common=$(comm -12 <(sort -u "$a" | grep '[A-Za-z]') <(sort -u "$b" | grep '[A-Za-z]') | wc -l | tr -d ' ')
  pct=$(( common * 100 / small ))
  [ "$pct" -ge 60 ] && printf '%s%% templates/%s <-> methodology/%s  (same basename)\n' "$pct" "$(basename "$a")" "$(basename "$a")" >> "$TMP13"
done
if [ -s "$TMP13" ]; then
  warn "$({ wc -l < "$TMP13"; } | tr -d ' ') near-duplicate pair(s) — playbook/ is documented as summaries:"
  sort -rn "$TMP13" | sed 's|^|           |'
  echo "         Fixes must be applied twice or they survive in the other copy."
else
  ok "playbook/ does not duplicate methodology/"
fi
rm -f "$TMP13"

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
