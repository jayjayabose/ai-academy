#!/usr/bin/env bash
# Report what an install has learned that the source does not know yet. READ-ONLY.
#
# The install flows one way: source -> project. This is the return path. You improve the
# method while doing real work in a project, and that improvement has to reach the source
# or it stays where it was written.
#
# Usage: promote.sh PROJECT_DIR [PROJECT_DIR...] [--quiet]
# Exit:  0 = ran successfully (whether or not candidates were found), 2 = usage problem
#
# It NEVER writes anything. Deciding what belongs in a shared knowledge base is a
# judgement call, and an over-eager promoter is worse than none: push one project's
# specifics into core/ and every project inherits a wrong fact. core/'s entire value is
# being identical AND correct everywhere, so this prints and you decide.
#
# NB: `set -e` is deliberately NOT used, for the same reason as verify-install.sh --
# greps here legitimately return non-zero when they find nothing.
set -uo pipefail

SRC_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$(cd "$SRC_DIR/../.." && pwd)"          # the source .claude, i.e. this checkout
QUIET=0; TARGETS=()
for a in "$@"; do
  case "$a" in
    --quiet)   QUIET=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *)         TARGETS+=("$a") ;;
  esac
done
[ "${#TARGETS[@]}" -gt 0 ] || { echo "usage: promote.sh PROJECT_DIR [PROJECT_DIR...]" >&2; exit 2; }
[ -d "$SRC/orchestration" ] || { echo "error: no orchestration/ beside this script ($SRC)" >&2; exit 2; }

ok()   { [ "$QUIET" -eq 1 ] || printf '  ok        %s\n' "$1"; }
cand() { printf '  PROMOTE   %-8s %s\n' "$1" "$2"; }
note() { printf '  %-9s %s\n' "$1" "$2"; }
head2(){ printf '\n%s\n' "$1"; }

# A target path does not always match its source path. install.sh lands the command
# documentation as orchestration/COMMANDS.md because README.md is too generic a filename
# to sit in .claude/commands/ and be named in a global ignore. A comparison that misses
# this reports "absent from the source" about a file that is byte-identical to it.
src_path_for() {
  case "$1" in
    orchestration/COMMANDS.md) printf '%s' "commands/README.md" ;;
    *)                         printf '%s' "$1" ;;
  esac
}

# Which tier a path belongs to decides whether it CAN be promoted at all.
tier_for() {
  case "$1" in
    orchestration/meta/project-*.md) printf 'never' ;;   # per-project by definition
    workspace/*)                     printf 'never' ;;   # that project's own history
    */session-handoffs/*)            printf 'never' ;;   # ditto -- install.sh excludes these
    */core/*)                        printf 'core' ;;
    */examples/*)                    printf 'pack' ;;
    commands/*.md)                   printf 'command' ;;
    *)                               printf 'copied' ;;
  esac
}

# The same gate the split itself enforces. A core/ file naming a stack is the one failure
# that silently corrupts every future install.
STACK_RE='nestjs|angular|sequelize|npm run|npx |typescript|tsconfig|jest|vitest|eslint|prisma|package\.json|localhost:3000|postgres|docker'

TOTAL_CAND=0; TMPS=()
trap 'for t in "${TMPS[@]:-}"; do [ -n "$t" ] && rm -f "$t"; done' EXIT
for T in "${TARGETS[@]}"; do
  [ -d "$T" ] || { echo "error: not a directory: $T" >&2; exit 2; }
  T="$(cd "$T" && pwd)"; C="$T/.claude"; MAN="$C/orchestration/.install-manifest"
  head2 "$(basename "$T")"

  if [ ! -f "$MAN" ]; then
    # Do not pass quietly: without a manifest there is no record of what was installed,
    # so "nothing diverged" would be a claim about a comparison never made.
    note "SKIPPED" "no .install-manifest -- cannot tell your edits from a pristine install."
    note ""        "Re-run install.sh once to seed it, then try again."
    continue
  fi

  # --- what the project changed, or added, since the installer last wrote it -----------
  # The manifest cannot list itself, and cannot list a file it never wrote, so new files
  # have to be found by walking the tree rather than by reading the manifest.
  CHANGED="$(mktemp)"; TMPS+=("$CHANGED")
  ( cd "$C" && python3 - "$MAN" <<'PY' > "$CHANGED"
import hashlib, os, sys
man = sys.argv[1]
known = {}
for line in open(man, encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or " " not in line: continue
    sha, rel = line.split(None, 1)
    known[rel] = sha
for rel, sha in sorted(known.items()):
    if not os.path.exists(rel):
        print("D", rel); continue
    if hashlib.sha256(open(rel, "rb").read()).hexdigest() != sha:
        print("M", rel)
# Anything under the installed trees that the manifest never recorded.
for base in ("orchestration", "commands"):
    for dirpath, _, files in os.walk(base):
        for f in sorted(files):
            rel = os.path.join(dirpath, f)
            if rel in known: continue
            if not f.endswith(".md"): continue
            if f.endswith(".new") or f == "ADAPTATION-TODO.md": continue
            print("A", rel)
PY
  )

  if [ ! -s "$CHANGED" ]; then
    ok "nothing diverged from the install -- no learnings to promote"
    continue
  fi

  n_cand=0; n_same=0; n_never=0; n_gone=0
  while read -r flag rel; do
    [ -n "${rel:-}" ] || continue
    tier="$(tier_for "$rel")"
    if [ "$tier" = "never" ]; then n_never=$((n_never+1)); continue; fi
    if [ "$flag" = "D" ]; then
      note "deleted" "$rel -- removed locally; decide deliberately, do not promote a deletion by accident"
      n_gone=$((n_gone+1)); continue
    fi
    sp="$(src_path_for "$rel")"
    if [ -f "$SRC/$sp" ] && cmp -s "$C/$rel" "$SRC/$sp"; then
      # Already promoted. It looks divergent only because the project's manifest still
      # records what was installed BEFORE the promotion landed. Re-installing clears it.
      n_same=$((n_same+1)); continue
    fi
    # A core/ candidate has to survive the portability gate or it is not portable.
    if [ "$tier" = "core" ]; then
      hits="$({ grep -ciE "$STACK_RE" "$C/$rel" 2>/dev/null || true; } | head -1)"
      proj="$({ grep -ciE "$(basename "$T")" "$C/$rel" 2>/dev/null || true; } | head -1)"
      if [ "${hits:-0}" != "0" ] || [ "${proj:-0}" != "0" ]; then
        note "BLOCKED" "$rel -- names a stack or this project; belongs in examples/<stack>/, not core/"
        continue
      fi
    fi
    [ "$flag" = "A" ] && cand "$tier new" "$rel" || cand "$tier" "$rel"
    n_cand=$((n_cand+1)); TOTAL_CAND=$((TOTAL_CAND+1))
  done < "$CHANGED"

  [ "$n_same"  -gt 0 ] && ok "$n_same file(s) already in the source -- this install is behind; re-run install.sh"
  [ "$n_never" -gt 0 ] && ok "$n_never per-project file(s) ignored (profile, mission, workspace)"
  [ "$n_cand"  -eq 0 ] && [ "$n_gone" -eq 0 ] && ok "nothing to promote"
done

head2 "Summary"
if [ "$TOTAL_CAND" -eq 0 ]; then
  printf '  No promotion candidates.\n'
else
  printf '  %s candidate(s). For each one, before committing to the source:\n\n' "$TOTAL_CAND"
  printf '    1. Read the diff. Is this the METHOD improving, or this project being itself?\n'
  printf '       Only the first belongs in a tree whose value is being identical everywhere.\n'
  printf '    2. core/ must name no stack and no project. examples/<stack>/ is where a\n'
  printf '       stack-specific instance goes.\n'
  printf '    3. A new file must be reachable from somewhere, or it is dead weight.\n'
  printf '    4. Stage EXPLICIT paths. .claude/orchestration/ is usually gitignored, so new\n'
  printf '       files need -f, and `git add -f .claude/orchestration` has swept in\n'
  printf '       contamination before. Check `git diff --cached --name-status` every time.\n'
  printf '    5. Push, then re-run install.sh in the other projects to fan it out.\n'
fi
printf '\n  Not every learning is a file diff. "A gate must be read-only" was rediscovered in\n'
printf '  three projects before anyone wrote it down; the signal was noticing "I have\n'
printf '  written this before", which no tool will surface for you.\n'
exit 0
